// ========================================
// TUSMO - Client JavaScript
// ========================================

class TusmoGame {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.pseudo = null;
        this.currentMode = null; // 'daily', 'suite', 'free', 'room'
        this.wordLength = 6;
        this.firstLetter = '';
        this.currentRow = 0;
        this.currentTile = 1; // Start after first letter
        this.maxAttempts = 6;
        this.gameOver = false;
        this.keyboardState = {};
        this.roomCode = null;
        this.isHost = false;
        this.suiteProgress = 0;
        this.totalSuiteWords = 5;

        // Series mode (multiplayer)
        this.seriesProgress = 0;
        this.totalSeriesWords = 4;

        // Timer
        this.startTime = null;
        this.timerInterval = null;

        // Leaderboards
        this.leaderboards = { daily: [], suite: [] };

        // Track found letters (correct positions)
        this.foundLetters = [];

        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.connect();
    }

    bindElements() {
        // Screens
        this.screens = {
            login: document.getElementById('loginScreen'),
            menu: document.getElementById('menuScreen'),
            game: document.getElementById('gameScreen'),
            room: document.getElementById('roomScreen')
        };

        // Elements
        this.elements = {
            pseudoInput: document.getElementById('pseudoInput'),
            startBtn: document.getElementById('startBtn'),
            playerPseudo: document.getElementById('playerPseudo'),
            dailyCard: document.getElementById('dailyCard'),
            suiteCard: document.getElementById('suiteCard'),
            freeCard: document.getElementById('freeCard'),
            freeLengthSelect: document.getElementById('freeLengthSelect'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            gameGrid: document.getElementById('gameGrid'),
            keyboard: document.getElementById('keyboard'),
            backBtn: document.getElementById('backBtn'),
            gameModeLabel: document.getElementById('gameModeLabel'),
            gameProgress: document.getElementById('gameProgress'),
            gameTimer: document.getElementById('gameTimer'),
            dailyInfo: document.getElementById('dailyInfo'),
            suiteInfo: document.getElementById('suiteInfo'),
            // Leaderboards
            dailyLeaderboard: document.getElementById('dailyLeaderboard'),
            suiteLeaderboard: document.getElementById('suiteLeaderboard'),
            // Room
            roomCodeDisplay: document.getElementById('roomCodeDisplay'),
            playersList: document.getElementById('playersList'),
            roomSettings: document.getElementById('roomSettings'),
            roomLengthSelect: document.getElementById('roomLengthSelect'),
            startRoomGameBtn: document.getElementById('startRoomGameBtn'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            restartRoomBtn: document.getElementById('restartRoomBtn'),
            // Modals
            resultModal: document.getElementById('resultModal'),
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            resultWord: document.getElementById('resultWord'),
            resultPodium: document.getElementById('resultPodium'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            menuBtn: document.getElementById('menuBtn'),
            joinModal: document.getElementById('joinModal'),
            roomCodeInput: document.getElementById('roomCodeInput'),
            confirmJoinBtn: document.getElementById('confirmJoinBtn'),
            cancelJoinBtn: document.getElementById('cancelJoinBtn'),
            helpModal: document.getElementById('helpModal'),
            helpBtn: document.getElementById('helpBtn'),
            closeHelpBtn: document.getElementById('closeHelpBtn'),
            toast: document.getElementById('toast')
        };
    }

    bindEvents() {
        // Login
        this.elements.startBtn.addEventListener('click', () => this.login());
        this.elements.pseudoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // Menu cards
        this.elements.dailyCard.querySelector('button').addEventListener('click', () => this.startDaily());
        this.elements.suiteCard.querySelector('button').addEventListener('click', () => this.startSuite());
        this.elements.freeCard.querySelector('button').addEventListener('click', () => this.startFree());
        this.elements.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.elements.joinRoomBtn.addEventListener('click', () => this.showJoinModal());

        // Game
        this.elements.backBtn.addEventListener('click', () => this.backToMenu());

        // Room
        this.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.elements.startRoomGameBtn.addEventListener('click', () => this.startRoomGame());
        if (this.elements.restartRoomBtn) {
            this.elements.restartRoomBtn.addEventListener('click', () => this.restartRoom());
        }

        // Keyboard
        this.elements.keyboard.addEventListener('click', (e) => {
            if (e.target.matches('button')) {
                const key = e.target.dataset.key;
                this.handleKey(key);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.screens.game.classList.contains('active') && !this.gameOver) {
                if (e.key === 'Enter') {
                    this.handleKey('ENTER');
                } else if (e.key === 'Backspace') {
                    this.handleKey('BACKSPACE');
                } else if (/^[a-zA-Z]$/.test(e.key)) {
                    this.handleKey(e.key.toUpperCase());
                }
            }
        });

        // Modals
        this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.elements.menuBtn.addEventListener('click', () => {
            this.closeModal(this.elements.resultModal);
            this.backToMenu();
        });
        this.elements.confirmJoinBtn.addEventListener('click', () => this.joinRoom());
        this.elements.cancelJoinBtn.addEventListener('click', () => this.closeModal(this.elements.joinModal));
        this.elements.helpBtn.addEventListener('click', () => this.openModal(this.elements.helpModal));
        this.elements.closeHelpBtn.addEventListener('click', () => this.closeModal(this.elements.helpModal));
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);

        this.ws.onopen = () => {
            console.log('🔌 Connected to server');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('❌ Disconnected from server');
            setTimeout(() => this.connect(), 3000);
        };
    }

    handleMessage(data) {
        switch (data.type) {
            case 'connected':
                this.playerId = data.playerId;
                if (data.dailyWord) {
                    this.elements.dailyInfo.textContent = `${data.dailyWord.length} lettres`;
                }
                if (data.leaderboards) {
                    this.leaderboards = data.leaderboards;
                    this.updateLeaderboardsDisplay();
                }
                break;

            case 'pseudo_set':
                this.pseudo = data.pseudo;
                this.elements.playerPseudo.textContent = this.pseudo;
                this.showScreen('menu');
                break;

            case 'daily_start':
                this.wordLength = data.wordLength;
                this.firstLetter = data.firstLetter;
                this.currentMode = data.mode;
                this.startTime = data.startTime || Date.now();
                if (data.mode === 'suite') {
                    this.suiteProgress = data.wordIndex;
                    this.totalSuiteWords = data.totalWords;
                }
                this.initGame();
                this.startTimer();
                break;

            case 'guess_result':
                this.showResult(data.word, data.result, data.won, data.gameOver, data.correctWord);
                break;

            case 'invalid_word':
                this.showToast(data.message, true);
                this.shakeCurrentRow();
                break;

            case 'suite_next':
                this.suiteProgress = data.wordIndex;
                this.wordLength = data.wordLength;
                this.firstLetter = data.firstLetter;
                setTimeout(() => this.initGame(), 1500);
                break;

            case 'suite_complete':
                this.stopTimer();
                this.elements.resultTitle.textContent = '🔥 Suite Complète!';
                this.elements.resultMessage.textContent = `Temps: ${data.totalTime}`;
                if (data.playerRank) {
                    this.elements.resultMessage.textContent += ` • Rang #${data.playerRank}`;
                }
                this.showLeaderboardInModal(data.leaderboard);
                this.openModal(this.elements.resultModal);
                break;

            case 'leaderboard_update':
                this.leaderboards[data.mode] = data.leaderboard;
                this.updateLeaderboardsDisplay();
                if (data.playerTime) {
                    this.showToast(`Temps: ${data.playerTime} • Rang #${data.playerRank}`);
                }
                break;

            case 'leaderboards':
                this.leaderboards = { daily: data.daily, suite: data.suite };
                this.updateLeaderboardsDisplay();
                break;

            case 'room_created':
                this.roomCode = data.roomCode;
                this.wordLength = data.wordLength;
                this.totalSeriesWords = data.seriesCount || 4;
                this.isHost = true;
                this.showScreen('room');
                this.elements.roomCodeDisplay.textContent = data.roomCode;
                break;

            case 'room_joined':
                this.roomCode = data.roomCode;
                this.wordLength = data.wordLength;
                this.totalSeriesWords = data.seriesCount || 4;
                this.closeModal(this.elements.joinModal);
                this.showScreen('room');
                this.elements.roomCodeDisplay.textContent = data.roomCode;
                break;

            case 'room_state':
                this.updateRoomState(data);
                break;

            case 'game_started':
                this.wordLength = data.wordLength;
                this.firstLetter = data.firstLetter;
                this.currentMode = 'room';
                this.seriesProgress = 0;
                this.totalSeriesWords = data.seriesCount || 4;
                this.startTime = data.startTime || Date.now();
                this.initGame();
                this.startTimer();
                break;

            case 'series_next_word':
                this.seriesProgress = data.wordIndex;
                this.wordLength = data.wordLength;
                this.firstLetter = data.firstLetter;
                if (data.failedPrevious) {
                    this.showToast('Mot raté, passage au suivant...', true);
                }
                setTimeout(() => {
                    this.currentRow = 0;
                    this.currentTile = 1;
                    this.gameOver = false;
                    this.createGrid();
                    this.updateGameProgress();
                }, 1500);
                break;

            case 'series_complete':
                this.stopTimer();
                this.gameOver = true;
                this.showToast(`Série terminée! Temps: ${data.totalTime}`);
                break;

            case 'room_ranking':
                this.stopTimer();
                this.showRoomRanking(data);
                break;

            case 'room_restarted':
                this.showScreen('room');
                this.showToast('Nouvelle partie prête!');
                break;

            case 'error':
                this.showToast(data.message, true);
                break;
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // Timer functions
    startTimer() {
        this.stopTimer();
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        if (!this.elements.gameTimer) return;
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        this.elements.gameTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Leaderboard functions
    updateLeaderboardsDisplay() {
        if (this.elements.dailyLeaderboard) {
            this.elements.dailyLeaderboard.innerHTML = this.renderLeaderboard(this.leaderboards.daily);
        }
        if (this.elements.suiteLeaderboard) {
            this.elements.suiteLeaderboard.innerHTML = this.renderLeaderboard(this.leaderboards.suite);
        }
    }

    renderLeaderboard(entries) {
        if (!entries || entries.length === 0) {
            return '<div class="leaderboard-empty">Aucun score</div>';
        }
        return entries.map((e, i) => `
            <div class="leaderboard-entry ${e.pseudo === this.pseudo ? 'is-me' : ''}">
                <span class="rank">${this.getRankEmoji(e.rank)}</span>
                <span class="pseudo">${e.pseudo}</span>
                <span class="time">${e.time}</span>
            </div>
        `).join('');
    }

    getRankEmoji(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    }

    showLeaderboardInModal(leaderboard) {
        if (!this.elements.resultPodium) return;
        this.elements.resultPodium.innerHTML = `
            <h3>🏆 Classement</h3>
            ${this.renderLeaderboard(leaderboard)}
        `;
        this.elements.resultPodium.style.display = 'block';
    }

    login() {
        const pseudo = this.elements.pseudoInput.value.trim();
        if (pseudo.length < 2) {
            this.showToast('Le pseudo doit faire au moins 2 caractères', true);
            return;
        }
        this.send({ type: 'set_pseudo', pseudo });
    }

    startDaily() {
        this.send({ type: 'play_daily', mode: 'daily' });
    }

    startSuite() {
        this.suiteProgress = 0;
        this.send({ type: 'play_daily', mode: 'suite' });
    }

    startFree() {
        this.wordLength = parseInt(this.elements.freeLengthSelect.value);
        this.currentMode = 'free';
        this.send({ type: 'play_free', wordLength: this.wordLength });
    }

    createRoom() {
        const wordLength = parseInt(this.elements.roomLengthSelect.value);
        this.send({ type: 'create_room', wordLength });
    }

    showJoinModal() {
        this.elements.roomCodeInput.value = '';
        this.openModal(this.elements.joinModal);
        this.elements.roomCodeInput.focus();
    }

    joinRoom() {
        const code = this.elements.roomCodeInput.value.trim().toUpperCase();
        if (code.length !== 6) {
            this.showToast('Le code doit faire 6 caractères', true);
            return;
        }
        this.send({ type: 'join_room', roomCode: code });
    }

    leaveRoom() {
        this.send({ type: 'leave_room' });
        this.roomCode = null;
        this.isHost = false;
        this.stopTimer();
        this.showScreen('menu');
    }

    startRoomGame() {
        this.send({ type: 'start_game' });
    }

    restartRoom() {
        this.send({ type: 'restart_room' });
    }

    updateRoomState(data) {
        this.isHost = data.host === this.playerId;

        // Show/hide host controls
        if (this.elements.roomSettings) {
            this.elements.roomSettings.style.display = this.isHost && data.state === 'waiting' ? 'flex' : 'none';
        }
        if (this.elements.restartRoomBtn) {
            this.elements.restartRoomBtn.style.display = this.isHost && data.state === 'finished' ? 'block' : 'none';
        }

        // Update players list with progress
        this.elements.playersList.innerHTML = data.players.map(p => `
            <div class="player-item ${p.finished ? 'finished' : ''}">
                <span>
                    ${p.pseudo}
                    ${p.id === data.host ? '<span class="host-badge">Hôte</span>' : ''}
                </span>
                <span class="player-status">
                    ${data.state === 'playing' ?
                (p.finished ? `✅ ${p.formattedTime}` : `Mot ${p.wordIndex + 1}/${data.seriesCount}`) :
                (p.finished ? `${p.formattedTime}` : '⏳')
            }
                </span>
            </div>
        `).join('');
    }

    initGame() {
        this.currentRow = 0;
        this.currentTile = 1;
        this.gameOver = false;
        this.keyboardState = {};
        this.foundLetters = new Array(this.wordLength).fill(null);
        this.foundLetters[0] = this.firstLetter; // First letter is always known

        // Update UI
        this.updateGameModeLabel();
        this.updateGameProgress();

        // Create grid
        this.createGrid();

        // Reset keyboard colors
        this.elements.keyboard.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('correct', 'present', 'absent');
        });

        this.showScreen('game');
    }

    updateGameModeLabel() {
        const modeLabels = {
            daily: 'Mot du Jour',
            suite: `Suite du Jour`,
            free: 'Partie Libre',
            room: `Série Multijoueur`
        };
        this.elements.gameModeLabel.textContent = modeLabels[this.currentMode] || 'Jeu';
    }

    updateGameProgress() {
        if (this.currentMode === 'suite') {
            this.elements.gameProgress.textContent = `Mot ${this.suiteProgress + 1}/${this.totalSuiteWords}`;
        } else if (this.currentMode === 'room') {
            this.elements.gameProgress.textContent = `Mot ${this.seriesProgress + 1}/${this.totalSeriesWords}`;
        } else {
            this.elements.gameProgress.textContent = '';
        }
    }

    createGrid() {
        this.elements.gameGrid.innerHTML = '';

        for (let row = 0; row < this.maxAttempts; row++) {
            const rowEl = document.createElement('div');
            rowEl.className = 'grid-row';

            for (let col = 0; col < this.wordLength; col++) {
                const tile = document.createElement('div');
                tile.className = 'tile';

                // First letter of first row
                if (row === 0 && col === 0) {
                    tile.textContent = this.firstLetter;
                    tile.classList.add('first-letter');
                }

                rowEl.appendChild(tile);
            }

            this.elements.gameGrid.appendChild(rowEl);
        }
    }

    handleKey(key) {
        if (this.gameOver) return;

        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACKSPACE') {
            this.deleteLetter();
        } else if (/^[A-Z]$/.test(key)) {
            this.addLetter(key);
        }
    }

    addLetter(letter) {
        if (this.currentTile >= this.wordLength) return;

        const row = this.elements.gameGrid.children[this.currentRow];
        const tile = row.children[this.currentTile];
        tile.textContent = letter;
        tile.classList.add('filled');
        tile.classList.remove('placeholder'); // Remove placeholder style if was a hint
        this.currentTile++;
    }

    deleteLetter() {
        if (this.currentTile <= 1) return; // Can't delete first letter

        this.currentTile--;
        const row = this.elements.gameGrid.children[this.currentRow];
        const tile = row.children[this.currentTile];

        // If this was a placeholder, restore it
        if (this.foundLetters[this.currentTile]) {
            tile.textContent = this.foundLetters[this.currentTile];
            tile.classList.remove('filled');
            tile.classList.add('placeholder');
        } else {
            tile.textContent = '';
            tile.classList.remove('filled');
        }
    }

    submitGuess() {
        if (this.currentTile !== this.wordLength) {
            this.showToast('Mot incomplet', true);
            this.shakeCurrentRow();
            return;
        }

        const row = this.elements.gameGrid.children[this.currentRow];
        let word = '';
        for (let i = 0; i < this.wordLength; i++) {
            word += row.children[i].textContent;
        }

        if (this.currentMode === 'room') {
            this.send({ type: 'room_guess', word });
        } else {
            this.send({ type: 'guess', word, mode: this.currentMode });
        }
    }

    showResult(word, result, won, gameOver, correctWord) {
        const row = this.elements.gameGrid.children[this.currentRow];

        // Animate tiles
        result.forEach((status, i) => {
            setTimeout(() => {
                const tile = row.children[i];
                tile.classList.add(status);

                // Update keyboard
                const key = word[i];
                this.updateKeyboardKey(key, status);
            }, i * 200);
        });

        // Move to next row or end game
        setTimeout(() => {
            if (won) {
                if (this.currentMode !== 'suite' && this.currentMode !== 'room') {
                    this.stopTimer();
                    this.gameOver = true;
                    this.elements.resultTitle.textContent = '🎉 Bravo!';
                    this.elements.resultMessage.textContent = `Trouvé en ${this.currentRow + 1} essai${this.currentRow > 0 ? 's' : ''}!`;
                    this.showWordResult(word, result);
                    if (this.elements.resultPodium) this.elements.resultPodium.style.display = 'none';
                    this.openModal(this.elements.resultModal);
                }
            } else if (gameOver) {
                if (this.currentMode !== 'room') {
                    this.stopTimer();
                    this.gameOver = true;
                    this.elements.resultTitle.textContent = '😔 Perdu';
                    this.elements.resultMessage.textContent = `Le mot était:`;
                    this.showWordResult(correctWord, correctWord.split('').map(() => 'correct'));
                    if (this.elements.resultPodium) this.elements.resultPodium.style.display = 'none';
                    this.openModal(this.elements.resultModal);
                }
            } else {
                // Update found letters based on result
                result.forEach((status, i) => {
                    if (status === 'correct') {
                        this.foundLetters[i] = word[i];
                    }
                });

                this.currentRow++;
                this.currentTile = 1;

                // Set found letters as placeholders for new row
                const nextRow = this.elements.gameGrid.children[this.currentRow];
                if (nextRow) {
                    for (let i = 0; i < this.wordLength; i++) {
                        if (this.foundLetters[i]) {
                            nextRow.children[i].textContent = this.foundLetters[i];
                            if (i === 0) {
                                nextRow.children[i].classList.add('first-letter');
                            } else {
                                nextRow.children[i].classList.add('placeholder');
                            }
                        }
                    }
                }
            }
        }, result.length * 200 + 300);
    }

    showWordResult(word, result) {
        this.elements.resultWord.innerHTML = word.split('').map((letter, i) =>
            `<div class="tile ${result[i]}">${letter}</div>`
        ).join('');
    }

    updateKeyboardKey(key, status) {
        const btn = this.elements.keyboard.querySelector(`button[data-key="${key}"]`);
        if (!btn) return;

        // Only upgrade status (absent < present < correct)
        const priority = { absent: 1, present: 2, correct: 3 };
        const current = this.keyboardState[key];

        if (!current || priority[status] > priority[current]) {
            this.keyboardState[key] = status;
            btn.classList.remove('correct', 'present', 'absent');
            btn.classList.add(status);
        }
    }

    shakeCurrentRow() {
        const row = this.elements.gameGrid.children[this.currentRow];
        row.classList.add('shake');
        setTimeout(() => row.classList.remove('shake'), 500);
    }

    showRoomRanking(data) {
        const ranking = data.ranking;
        this.elements.resultTitle.textContent = '🏆 Classement Final';

        // Create podium
        let podiumHtml = '<div class="podium">';
        ranking.forEach((player, i) => {
            const medal = this.getRankEmoji(i + 1);
            const isMe = player.pseudo === this.pseudo;
            podiumHtml += `
                <div class="podium-entry ${isMe ? 'is-me' : ''} ${i < 3 ? 'top-3' : ''}">
                    <span class="medal">${medal}</span>
                    <span class="name">${player.pseudo}</span>
                    <span class="time">${player.formattedTime}</span>
                </div>
            `;
        });
        podiumHtml += '</div>';

        this.elements.resultMessage.innerHTML = podiumHtml;
        this.elements.resultWord.innerHTML = `<small>Mots: ${data.words.join(', ')}</small>`;
        if (this.elements.resultPodium) this.elements.resultPodium.style.display = 'none';

        // Show restart button for host
        if (this.isHost) {
            this.elements.playAgainBtn.textContent = 'Recommencer';
            this.elements.playAgainBtn.style.display = 'block';
        } else {
            this.elements.playAgainBtn.style.display = 'none';
        }

        this.openModal(this.elements.resultModal);
    }

    playAgain() {
        this.closeModal(this.elements.resultModal);

        if (this.currentMode === 'daily') {
            this.showToast('Revenez demain pour un nouveau mot!');
            this.backToMenu();
        } else if (this.currentMode === 'suite') {
            this.backToMenu();
        } else if (this.currentMode === 'free') {
            this.startFree();
        } else if (this.currentMode === 'room') {
            if (this.isHost) {
                this.restartRoom();
            }
            this.showScreen('room');
        }
    }

    backToMenu() {
        this.stopTimer();
        if (this.roomCode) {
            this.leaveRoom();
        }
        this.showScreen('menu');
        // Refresh leaderboards
        this.send({ type: 'get_leaderboards' });
    }

    showScreen(name) {
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.screens[name].classList.add('active');
    }

    openModal(modal) {
        modal.classList.add('active');
    }

    closeModal(modal) {
        modal.classList.remove('active');
    }

    showToast(message, isError = false) {
        this.elements.toast.textContent = message;
        this.elements.toast.classList.toggle('error', isError);
        this.elements.toast.classList.add('show');

        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 2500);
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    window.game = new TusmoGame();
});
