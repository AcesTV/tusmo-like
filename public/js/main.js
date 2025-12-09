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
            dailyInfo: document.getElementById('dailyInfo'),
            suiteInfo: document.getElementById('suiteInfo'),
            // Room
            roomCodeDisplay: document.getElementById('roomCodeDisplay'),
            playersList: document.getElementById('playersList'),
            roomSettings: document.getElementById('roomSettings'),
            roomLengthSelect: document.getElementById('roomLengthSelect'),
            startRoomGameBtn: document.getElementById('startRoomGameBtn'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            // Modals
            resultModal: document.getElementById('resultModal'),
            resultTitle: document.getElementById('resultTitle'),
            resultMessage: document.getElementById('resultMessage'),
            resultWord: document.getElementById('resultWord'),
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
                if (data.mode === 'suite') {
                    this.suiteProgress = data.wordIndex;
                    this.totalSuiteWords = data.totalWords;
                }
                this.initGame();
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
                this.elements.resultTitle.textContent = '🔥 Suite Complète!';
                this.elements.resultMessage.textContent = `Vous avez trouvé les ${data.totalWords} mots!`;
                this.openModal(this.elements.resultModal);
                break;

            case 'room_created':
                this.roomCode = data.roomCode;
                this.wordLength = data.wordLength;
                this.isHost = true;
                this.showScreen('room');
                this.elements.roomCodeDisplay.textContent = data.roomCode;
                break;

            case 'room_joined':
                this.roomCode = data.roomCode;
                this.wordLength = data.wordLength;
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
                this.initGame();
                break;

            case 'room_game_over':
                this.showRoomResults(data);
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
        // For free mode, we request a random word
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
        this.showScreen('menu');
    }

    startRoomGame() {
        this.send({ type: 'start_game' });
    }

    updateRoomState(data) {
        this.isHost = data.host === this.playerId;
        this.elements.roomSettings.style.display = this.isHost ? 'flex' : 'none';

        this.elements.playersList.innerHTML = data.players.map(p => `
            <div class="player-item">
                <span>${p.pseudo}${p.id === data.host ? '<span class="host-badge">Hôte</span>' : ''}</span>
                <span>${p.score > 0 ? p.score + ' pts' : (p.finished ? '❌' : '⏳')}</span>
            </div>
        `).join('');
    }

    initGame() {
        this.currentRow = 0;
        this.currentTile = 1;
        this.gameOver = false;
        this.keyboardState = {};

        // Update UI
        const modeLabels = {
            daily: 'Mot du Jour',
            suite: `Suite du Jour (${this.suiteProgress + 1}/${this.totalSuiteWords})`,
            free: 'Partie Libre',
            room: `Salle ${this.roomCode}`
        };
        this.elements.gameModeLabel.textContent = modeLabels[this.currentMode] || 'Jeu';
        this.elements.gameProgress.textContent = '';

        // Create grid
        this.createGrid();

        // Reset keyboard colors
        this.elements.keyboard.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('correct', 'present', 'absent');
        });

        this.showScreen('game');
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
        this.currentTile++;
    }

    deleteLetter() {
        if (this.currentTile <= 1) return; // Can't delete first letter

        this.currentTile--;
        const row = this.elements.gameGrid.children[this.currentRow];
        const tile = row.children[this.currentTile];
        tile.textContent = '';
        tile.classList.remove('filled');
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
                this.gameOver = true;
                this.elements.resultTitle.textContent = '🎉 Bravo!';
                this.elements.resultMessage.textContent = `Trouvé en ${this.currentRow + 1} essai${this.currentRow > 0 ? 's' : ''}!`;
                this.showWordResult(word, result);

                if (this.currentMode !== 'suite') {
                    this.openModal(this.elements.resultModal);
                }
            } else if (gameOver) {
                this.gameOver = true;
                this.elements.resultTitle.textContent = '😔 Perdu';
                this.elements.resultMessage.textContent = `Le mot était:`;
                this.showWordResult(correctWord, correctWord.split('').map(() => 'correct'));
                this.openModal(this.elements.resultModal);
            } else {
                this.currentRow++;
                this.currentTile = 1;

                // Set first letter for new row
                const nextRow = this.elements.gameGrid.children[this.currentRow];
                if (nextRow) {
                    nextRow.children[0].textContent = this.firstLetter;
                    nextRow.children[0].classList.add('first-letter');
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

    showRoomResults(data) {
        const winner = data.results[0];
        this.elements.resultTitle.textContent = winner.won ? `🏆 ${winner.pseudo} gagne!` : '❌ Personne n\'a trouvé';
        this.elements.resultMessage.textContent = `Le mot était:`;
        this.showWordResult(data.word, data.word.split('').map(() => 'correct'));
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
            this.showScreen('room');
        }
    }

    backToMenu() {
        if (this.roomCode) {
            this.leaveRoom();
        }
        this.showScreen('menu');
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
