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
    ws.send(JSON.stringify({
        type: 'connected',
        playerId,
        dailyWord: dailyChallenge.getDailyWordInfo(),
        dailySuite: dailyChallenge.getDailySuiteInfo()
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
    }
}

function handleSetPseudo(ws, playerId, pseudo) {
    players.set(playerId, {
        id: playerId,
        pseudo: pseudo.substring(0, 20),
        ws,
        roomId: null,
        dailyAttempts: [],
        suiteProgress: 0,
        suiteAttempts: [],
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
        ws.send(JSON.stringify({
            type: 'daily_start',
            mode: 'daily',
            wordLength: wordInfo.length,
            firstLetter: wordInfo.firstLetter,
            attempts: player.dailyAttempts
        }));
    } else if (mode === 'suite') {
        const suiteInfo = dailyChallenge.getSuiteWordInfo(player.suiteProgress);
        if (suiteInfo) {
            ws.send(JSON.stringify({
                type: 'daily_start',
                mode: 'suite',
                wordLength: suiteInfo.length,
                firstLetter: suiteInfo.firstLetter,
                wordIndex: player.suiteProgress,
                totalWords: dailyChallenge.suiteWords.length,
                attempts: player.suiteAttempts
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
            ws.send(JSON.stringify({
                type: 'suite_complete',
                totalWords: dailyChallenge.suiteWords.length
            }));
        }
    }
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
        wordLength
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
        wordLength: room.wordLength
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
    broadcastRoomState(room);

    // Send word info to all players
    room.players.forEach(p => {
        const playerData = players.get(p.id);
        if (playerData && playerData.ws) {
            playerData.ws.send(JSON.stringify({
                type: 'game_started',
                wordLength: room.targetWord.length,
                firstLetter: room.targetWord[0]
            }));
        }
    });
}

function handleRoomGuess(ws, playerId, word) {
    const player = players.get(playerId);
    if (!player || !player.roomId) return;

    const room = rooms.get(player.roomId);
    if (!room || room.state !== 'playing') return;

    word = word.toUpperCase();

    if (!dictionary.isValidWord(word)) {
        ws.send(JSON.stringify({
            type: 'invalid_word',
            message: 'Ce mot n\'existe pas'
        }));
        return;
    }

    if (word.length !== room.targetWord.length) {
        ws.send(JSON.stringify({
            type: 'invalid_word',
            message: `Le mot doit faire ${room.targetWord.length} lettres`
        }));
        return;
    }

    const result = evaluateGuess(word, room.targetWord);
    const won = word === room.targetWord;

    room.addGuess(playerId, word, result, won);

    ws.send(JSON.stringify({
        type: 'guess_result',
        word,
        result,
        won,
        gameOver: won || room.getPlayerAttempts(playerId) >= 6
    }));

    broadcastRoomState(room);

    if (room.isGameOver()) {
        broadcastGameOver(room);
    }
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

function broadcastGameOver(room) {
    const results = room.getResults();
    room.players.forEach(p => {
        const playerData = players.get(p.id);
        if (playerData && playerData.ws) {
            playerData.ws.send(JSON.stringify({
                type: 'room_game_over',
                word: room.targetWord,
                results
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
