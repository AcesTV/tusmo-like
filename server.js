const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Dictionary = require('./src/Dictionary');
const GameRoom = require('./src/GameRoom');
const DailyChallenge = require('./src/DailyChallenge');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const rooms = new Map();
const players = new Map();
const dictionary = new Dictionary();
const dailyChallenge = new DailyChallenge(dictionary);

// Leaderboards (reset daily)
const leaderboards = {
    daily: new Map(), // date -> [{pseudo, time, attempts}]
    suite: new Map(), // date -> [{pseudo, totalTime, wordsFound}]
    currentDate: null
};

function resetLeaderboardsIfNeeded() {
    const today = new Date().toISOString().split('T')[0];
    if (leaderboards.currentDate !== today) {
        leaderboards.currentDate = today;
        leaderboards.daily.set(today, []);
        leaderboards.suite.set(today, []);
        console.log(`📊 Leaderboards reset for ${today}`);
    }
}

function addToLeaderboard(type, pseudo, data) {
    resetLeaderboardsIfNeeded();
    const today = leaderboards.currentDate;
    const board = leaderboards[type].get(today) || [];

    // Check if player already has an entry (keep best)
    const existingIndex = board.findIndex(e => e.pseudo === pseudo);
    if (existingIndex >= 0) {
        const existing = board[existingIndex];
        if (data.time < existing.time) {
            board[existingIndex] = { pseudo, ...data };
        }
    } else {
        board.push({ pseudo, ...data });
    }

    // Sort by time
    board.sort((a, b) => a.time - b.time);

    // Keep top 50
    if (board.length > 50) board.length = 50;

    leaderboards[type].set(today, board);
}

function getLeaderboard(type) {
    resetLeaderboardsIfNeeded();
    const today = leaderboards.currentDate;
    const board = leaderboards[type].get(today) || [];
    return board.slice(0, 10).map((entry, i) => ({
        rank: i + 1,
        pseudo: entry.pseudo,
        time: formatTime(entry.time),
        attempts: entry.attempts
    }));
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    const playerId = uuidv4();

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, playerId, message);
        } catch (e) {
            console.error('Invalid message:', e);
        }
    });

    ws.on('close', () => {
        handleDisconnect(playerId);
    });

    // Send welcome message
    resetLeaderboardsIfNeeded();
    ws.send(JSON.stringify({
        type: 'connected',
        playerId,
        dailyWord: dailyChallenge.getDailyWordInfo(),
        dailySuite: dailyChallenge.getDailySuiteInfo(),
        leaderboards: {
            daily: getLeaderboard('daily'),
            suite: getLeaderboard('suite')
        }
    }));
});

function handleMessage(ws, playerId, message) {
    switch (message.type) {
        case 'set_pseudo':
            handleSetPseudo(ws, playerId, message.pseudo);
            break;

        case 'play_daily':
            handlePlayDaily(ws, playerId, message.mode);
            break;

        case 'guess':
            handleGuess(ws, playerId, message.word, message.mode);
            break;

        case 'create_room':
            handleCreateRoom(ws, playerId, message.wordLength);
            break;

        case 'join_room':
            handleJoinRoom(ws, playerId, message.roomCode);
            break;

        case 'leave_room':
            handleLeaveRoom(playerId);
            break;

        case 'start_game':
            handleStartGame(playerId);
            break;

        case 'room_guess':
            handleRoomGuess(ws, playerId, message.word);
            break;

        case 'play_free':
            handlePlayFree(ws, playerId, message.wordLength);
            break;

        case 'restart_room':
            handleRestartRoom(playerId);
            break;

        case 'get_leaderboards':
            ws.send(JSON.stringify({
                type: 'leaderboards',
                daily: getLeaderboard('daily'),
                suite: getLeaderboard('suite')
            }));
            break;
    }
}

function handleSetPseudo(ws, playerId, pseudo) {
    players.set(playerId, {
        id: playerId,
        pseudo: pseudo.substring(0, 20),
        ws,
        roomId: null,
        dailyAttempts: [],
        dailyStartTime: null,
        dailyCompleted: false,
        suiteProgress: 0,
        suiteAttempts: [],
        suiteStartTime: null,
        suiteTotalTime: 0,
        freeWord: null,
        freeAttempts: []
    });

    ws.send(JSON.stringify({
        type: 'pseudo_set',
        pseudo: players.get(playerId).pseudo
    }));
}

function handlePlayFree(ws, playerId, wordLength) {
    const player = players.get(playerId);
    if (!player) return;

    // Generate a random word for free play
    const word = dictionary.getRandomWord(wordLength);
    player.freeWord = word;
    player.freeAttempts = [];

    ws.send(JSON.stringify({
        type: 'daily_start',
        mode: 'free',
        wordLength: word.length,
        firstLetter: word[0],
        attempts: []
    }));
}

function handlePlayDaily(ws, playerId, mode) {
    const player = players.get(playerId);
    if (!player) return;

    if (mode === 'daily') {
        const wordInfo = dailyChallenge.getDailyWordInfo();
        if (!player.dailyStartTime && !player.dailyCompleted) {
            player.dailyStartTime = Date.now();
        }
        ws.send(JSON.stringify({
            type: 'daily_start',
            mode: 'daily',
            wordLength: wordInfo.length,
            firstLetter: wordInfo.firstLetter,
            attempts: player.dailyAttempts,
            startTime: player.dailyStartTime
        }));
    } else if (mode === 'suite') {
        const suiteInfo = dailyChallenge.getSuiteWordInfo(player.suiteProgress);
        if (!player.suiteStartTime) {
            player.suiteStartTime = Date.now();
        }
        if (suiteInfo) {
            ws.send(JSON.stringify({
                type: 'daily_start',
                mode: 'suite',
                wordLength: suiteInfo.length,
                firstLetter: suiteInfo.firstLetter,
                wordIndex: player.suiteProgress,
                totalWords: dailyChallenge.suiteWords.length,
                attempts: player.suiteAttempts,
                startTime: player.suiteStartTime
            }));
        }
    }
}

function handleGuess(ws, playerId, word, mode) {
    const player = players.get(playerId);
    if (!player) return;

    word = word.toUpperCase();

    // Validate word exists in dictionary
    if (!dictionary.isValidWord(word)) {
        ws.send(JSON.stringify({
            type: 'invalid_word',
            message: 'Ce mot n\'existe pas dans le dictionnaire'
        }));
        return;
    }

    let targetWord, attempts, maxAttempts = 6;

    if (mode === 'daily') {
        targetWord = dailyChallenge.dailyWord;
        attempts = player.dailyAttempts;
    } else if (mode === 'suite') {
        targetWord = dailyChallenge.suiteWords[player.suiteProgress];
        attempts = player.suiteAttempts;
    } else if (mode === 'free') {
        targetWord = player.freeWord;
        attempts = player.freeAttempts;
    }

    if (!targetWord || word.length !== targetWord.length) {
        ws.send(JSON.stringify({
            type: 'invalid_word',
            message: `Le mot doit faire ${targetWord.length} lettres`
        }));
        return;
    }

    // Check attempts limit
    if (attempts.length >= maxAttempts) {
        ws.send(JSON.stringify({
            type: 'game_over',
            won: false,
            word: targetWord
        }));
        return;
    }

    // Evaluate guess
    const result = evaluateGuess(word, targetWord);
    attempts.push({ word, result });

    const won = word === targetWord;
    const gameOver = won || attempts.length >= maxAttempts;

    ws.send(JSON.stringify({
        type: 'guess_result',
        word,
        result,
        won,
        gameOver,
        correctWord: gameOver ? targetWord : null,
        attemptNumber: attempts.length
    }));

    // Handle daily completion - add to leaderboard
    if (mode === 'daily' && won && !player.dailyCompleted) {
        player.dailyCompleted = true;
        const completionTime = Date.now() - player.dailyStartTime;
        addToLeaderboard('daily', player.pseudo, {
            time: completionTime,
            attempts: attempts.length
        });

        // Send updated leaderboard
        ws.send(JSON.stringify({
            type: 'leaderboard_update',
            mode: 'daily',
            leaderboard: getLeaderboard('daily'),
            playerTime: formatTime(completionTime),
            playerRank: getPlayerRank('daily', player.pseudo)
        }));
    }

    // Handle suite progression
    if (mode === 'suite' && won) {
        player.suiteProgress++;
        player.suiteAttempts = [];

        if (player.suiteProgress < dailyChallenge.suiteWords.length) {
            const nextWord = dailyChallenge.getSuiteWordInfo(player.suiteProgress);
            ws.send(JSON.stringify({
                type: 'suite_next',
                wordIndex: player.suiteProgress,
                totalWords: dailyChallenge.suiteWords.length,
                wordLength: nextWord.length,
                firstLetter: nextWord.firstLetter
            }));
        } else {
            // Suite complete - add to leaderboard
            const totalTime = Date.now() - player.suiteStartTime;
            addToLeaderboard('suite', player.pseudo, {
                time: totalTime,
                wordsFound: player.suiteProgress
            });

            ws.send(JSON.stringify({
                type: 'suite_complete',
                totalWords: dailyChallenge.suiteWords.length,
                totalTime: formatTime(totalTime),
                leaderboard: getLeaderboard('suite'),
                playerRank: getPlayerRank('suite', player.pseudo)
            }));
        }
    }
}

function getPlayerRank(type, pseudo) {
    const board = leaderboards[type].get(leaderboards.currentDate) || [];
    const index = board.findIndex(e => e.pseudo === pseudo);
    return index >= 0 ? index + 1 : null;
}

function evaluateGuess(guess, target) {
    const result = [];
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    const used = new Array(target.length).fill(false);

    // First pass: mark correct positions (rouge)
    for (let i = 0; i < guessLetters.length; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result[i] = 'correct';
            used[i] = true;
        }
    }

    // Second pass: mark present but wrong position (jaune)
    for (let i = 0; i < guessLetters.length; i++) {
        if (result[i]) continue;

        let found = false;
        for (let j = 0; j < targetLetters.length; j++) {
            if (!used[j] && guessLetters[i] === targetLetters[j]) {
                result[i] = 'present';
                used[j] = true;
                found = true;
                break;
            }
        }

        if (!found) {
            result[i] = 'absent';
        }
    }

    return result;
}

function handleCreateRoom(ws, playerId, wordLength) {
    const player = players.get(playerId);
    if (!player) return;

    // Generate room code
    const roomCode = generateRoomCode();
    const room = new GameRoom(roomCode, wordLength, dictionary);
    room.addPlayer(player);

    rooms.set(roomCode, room);
    player.roomId = roomCode;

    ws.send(JSON.stringify({
        type: 'room_created',
        roomCode,
        wordLength,
        seriesCount: room.seriesCount
    }));

    broadcastRoomState(room);
}

function handleJoinRoom(ws, playerId, roomCode) {
    const player = players.get(playerId);
    if (!player) return;

    const room = rooms.get(roomCode.toUpperCase());
    if (!room) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Salle introuvable'
        }));
        return;
    }

    if (room.state !== 'waiting') {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'La partie a déjà commencé'
        }));
        return;
    }

    room.addPlayer(player);
    player.roomId = roomCode.toUpperCase();

    ws.send(JSON.stringify({
        type: 'room_joined',
        roomCode: room.code,
        wordLength: room.wordLength,
        seriesCount: room.seriesCount
    }));

    broadcastRoomState(room);
}

function handleLeaveRoom(playerId) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (room) {
        room.removePlayer(playerId);
        broadcastRoomState(room);

        if (room.players.length === 0) {
            rooms.delete(player.roomId);
        }
    }

    player.roomId = null;
}

function handleStartGame(playerId) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || room.host !== playerId) return;

    room.startGame();

    // Send game started with first word info to all players
    room.players.forEach(p => {
        const playerData = players.get(p.id);
        if (playerData && playerData.ws) {
            const currentWord = room.getCurrentWord(p.id);
            playerData.ws.send(JSON.stringify({
                type: 'game_started',
                wordLength: room.wordLength,
                firstLetter: currentWord ? currentWord[0] : '',
                seriesCount: room.seriesCount,
                wordIndex: 0,
                startTime: room.startTime
            }));
        }
    });

    broadcastRoomState(room);
}

function handleRoomGuess(ws, playerId, word) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || room.state !== 'playing') return;

    // Check if player already finished
    const roomPlayer = room.players.find(p => p.id === playerId);
    if (roomPlayer && roomPlayer.finished) return;

    word = word.toUpperCase();
    const targetWord = room.getCurrentWord(playerId);

    if (!targetWord) return;

    if (!dictionary.isValidWord(word)) {
        ws.send(JSON.stringify({
            type: 'invalid_word',
            message: 'Ce mot n\'existe pas'
        }));
        return;
    }

    if (word.length !== targetWord.length) {
        ws.send(JSON.stringify({
            type: 'invalid_word',
            message: `Le mot doit faire ${targetWord.length} lettres`
        }));
        return;
    }

    const result = evaluateGuess(word, targetWord);
    const won = word === targetWord;

    const progressResult = room.addGuess(playerId, word, result, won);

    ws.send(JSON.stringify({
        type: 'guess_result',
        word,
        result,
        won,
        gameOver: won || room.getPlayerAttempts(playerId) >= 6,
        correctWord: (!won && room.getPlayerAttempts(playerId) >= 6) ? targetWord : null
    }));

    // Handle series progression
    if (progressResult.advanceToNext) {
        // Player advances to next word
        ws.send(JSON.stringify({
            type: 'series_next_word',
            wordIndex: progressResult.nextWordIndex,
            wordLength: room.wordLength,
            firstLetter: progressResult.nextWord[0],
            totalWords: room.seriesCount,
            failedPrevious: progressResult.failedWord || false
        }));
    } else if (progressResult.seriesComplete) {
        // Player finished all 4 words
        ws.send(JSON.stringify({
            type: 'series_complete',
            totalTime: room.formatTime(progressResult.totalTime),
            totalTimeMs: progressResult.totalTime
        }));
    }

    broadcastRoomState(room);

    // Check if all players finished
    if (room.allPlayersFinished()) {
        broadcastRoomRanking(room);
    }
}

function handleRestartRoom(playerId) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || room.host !== playerId) return;

    room.resetForRestart();
    broadcastRoomState(room);

    // Notify all players
    room.players.forEach(p => {
        const playerData = players.get(p.id);
        if (playerData && playerData.ws) {
            playerData.ws.send(JSON.stringify({
                type: 'room_restarted'
            }));
        }
    });
}

function broadcastRoomState(room) {
    const state = room.getState();
    room.players.forEach(p => {
        const playerData = players.get(p.id);
        if (playerData && playerData.ws) {
            playerData.ws.send(JSON.stringify({
                type: 'room_state',
                ...state
            }));
        }
    });
}

function broadcastRoomRanking(room) {
    const ranking = room.getRanking();
    room.players.forEach(p => {
        const playerData = players.get(p.id);
        if (playerData && playerData.ws) {
            playerData.ws.send(JSON.stringify({
                type: 'room_ranking',
                ranking,
                words: room.seriesWords
            }));
        }
    });

    room.state = 'finished';
}

function handleDisconnect(playerId) {
    handleLeaveRoom(playerId);
    players.delete(playerId);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Tusmo server running on http://localhost:${PORT}`);
});
