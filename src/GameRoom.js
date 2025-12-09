class GameRoom {
    constructor(code, wordLength, dictionary) {
        this.code = code;
        this.wordLength = wordLength || 6;
        this.dictionary = dictionary;
        this.players = [];
        this.host = null;
        this.state = 'waiting'; // waiting, playing, finished
        this.targetWord = null;
        this.guesses = new Map(); // playerId -> [{word, result}]
        this.winners = [];
        this.startTime = null;
    }

    addPlayer(player) {
        if (!this.players.find(p => p.id === player.id)) {
            this.players.push({
                id: player.id,
                pseudo: player.pseudo,
                score: 0,
                finished: false,
                won: false
            });

            if (!this.host) {
                this.host = player.id;
            }
        }
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        this.guesses.delete(playerId);

        if (this.host === playerId && this.players.length > 0) {
            this.host = this.players[0].id;
        }
    }

    startGame() {
        this.state = 'playing';
        this.targetWord = this.dictionary.getRandomWord(this.wordLength);
        this.guesses.clear();
        this.winners = [];
        this.startTime = Date.now();

        this.players.forEach(p => {
            p.finished = false;
            p.won = false;
            this.guesses.set(p.id, []);
        });

        console.log(`🎮 Room ${this.code}: Started with word "${this.targetWord}"`);
    }

    addGuess(playerId, word, result, won) {
        const playerGuesses = this.guesses.get(playerId) || [];
        playerGuesses.push({ word, result });
        this.guesses.set(playerId, playerGuesses);

        const player = this.players.find(p => p.id === playerId);
        if (player) {
            if (won) {
                player.won = true;
                player.finished = true;
                player.score = this.calculateScore(playerGuesses.length);
                this.winners.push({
                    id: playerId,
                    pseudo: player.pseudo,
                    attempts: playerGuesses.length,
                    time: Date.now() - this.startTime
                });
            } else if (playerGuesses.length >= 6) {
                player.finished = true;
            }
        }
    }

    calculateScore(attempts) {
        // More points for fewer attempts
        const baseScore = 1000;
        const attemptPenalty = (attempts - 1) * 150;
        return Math.max(100, baseScore - attemptPenalty);
    }

    getPlayerAttempts(playerId) {
        const guesses = this.guesses.get(playerId);
        return guesses ? guesses.length : 0;
    }

    isGameOver() {
        return this.players.every(p => p.finished);
    }

    getState() {
        return {
            code: this.code,
            wordLength: this.wordLength,
            state: this.state,
            host: this.host,
            players: this.players.map(p => ({
                id: p.id,
                pseudo: p.pseudo,
                score: p.score,
                finished: p.finished,
                won: p.won,
                attempts: this.getPlayerAttempts(p.id)
            })),
            firstLetter: this.targetWord ? this.targetWord[0] : null
        };
    }

    getResults() {
        return this.players
            .map(p => ({
                id: p.id,
                pseudo: p.pseudo,
                score: p.score,
                won: p.won,
                attempts: this.getPlayerAttempts(p.id)
            }))
            .sort((a, b) => b.score - a.score);
    }
}

module.exports = GameRoom;
