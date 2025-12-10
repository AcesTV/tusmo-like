class GameRoom {
    constructor(code, wordLength, dictionary) {
        this.code = code;
        this.wordLength = wordLength || 6;
        this.dictionary = dictionary;
        this.players = [];
        this.host = null;
        this.state = 'waiting'; // waiting, playing, finished

        // Series mode - 4 words
        this.seriesWords = [];
        this.seriesCount = 4;
        this.guesses = new Map(); // playerId -> [{word, result}] for current word
        this.playerProgress = new Map(); // playerId -> { wordIndex, attempts: [], startTime, finishTime }
        this.startTime = null;
    }

    addPlayer(player) {
        if (!this.players.find(p => p.id === player.id)) {
            this.players.push({
                id: player.id,
                pseudo: player.pseudo,
                finished: false,
                finishTime: null
            });

            if (!this.host) {
                this.host = player.id;
            }
        }
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);
        this.guesses.delete(playerId);
        this.playerProgress.delete(playerId);

        if (this.host === playerId && this.players.length > 0) {
            this.host = this.players[0].id;
        }
    }

    startGame() {
        this.state = 'playing';
        this.startTime = Date.now();

        // Generate 4 words of specified length
        this.seriesWords = [];
        for (let i = 0; i < this.seriesCount; i++) {
            this.seriesWords.push(this.dictionary.getRandomWord(this.wordLength));
        }

        // Initialize player progress
        this.guesses.clear();
        this.playerProgress.clear();

        this.players.forEach(p => {
            p.finished = false;
            p.finishTime = null;
            this.guesses.set(p.id, []);
            this.playerProgress.set(p.id, {
                wordIndex: 0,
                startTime: Date.now(),
                finishTime: null
            });
        });

        console.log(`🎮 Room ${this.code}: Started series with words: ${this.seriesWords.join(', ')}`);
    }

    getCurrentWord(playerId) {
        const progress = this.playerProgress.get(playerId);
        if (!progress || progress.wordIndex >= this.seriesCount) return null;
        return this.seriesWords[progress.wordIndex];
    }

    getPlayerWordIndex(playerId) {
        const progress = this.playerProgress.get(playerId);
        return progress ? progress.wordIndex : 0;
    }

    addGuess(playerId, word, result, won) {
        const playerGuesses = this.guesses.get(playerId) || [];
        playerGuesses.push({ word, result });
        this.guesses.set(playerId, playerGuesses);

        const player = this.players.find(p => p.id === playerId);
        const progress = this.playerProgress.get(playerId);

        if (!player || !progress) return { advanceToNext: false, seriesComplete: false };

        if (won) {
            // Player found the current word, advance to next
            progress.wordIndex++;
            this.guesses.set(playerId, []); // Reset guesses for next word

            if (progress.wordIndex >= this.seriesCount) {
                // Player finished all 4 words!
                progress.finishTime = Date.now();
                player.finished = true;
                player.finishTime = progress.finishTime - progress.startTime;

                return {
                    advanceToNext: false,
                    seriesComplete: true,
                    totalTime: player.finishTime
                };
            } else {
                // Move to next word
                return {
                    advanceToNext: true,
                    seriesComplete: false,
                    nextWordIndex: progress.wordIndex,
                    nextWord: this.seriesWords[progress.wordIndex]
                };
            }
        } else if (playerGuesses.length >= 6) {
            // Failed this word, but continue to next word
            progress.wordIndex++;
            this.guesses.set(playerId, []);

            if (progress.wordIndex >= this.seriesCount) {
                progress.finishTime = Date.now();
                player.finished = true;
                player.finishTime = progress.finishTime - progress.startTime;

                return {
                    advanceToNext: false,
                    seriesComplete: true,
                    totalTime: player.finishTime,
                    failedWord: true
                };
            } else {
                return {
                    advanceToNext: true,
                    seriesComplete: false,
                    nextWordIndex: progress.wordIndex,
                    nextWord: this.seriesWords[progress.wordIndex],
                    failedWord: true
                };
            }
        }

        return { advanceToNext: false, seriesComplete: false };
    }

    getPlayerAttempts(playerId) {
        const guesses = this.guesses.get(playerId);
        return guesses ? guesses.length : 0;
    }

    allPlayersFinished() {
        return this.players.every(p => p.finished);
    }

    getRanking() {
        // Sort by finish time (fastest first), DNF at the end
        return this.players
            .map(p => ({
                id: p.id,
                pseudo: p.pseudo,
                finished: p.finished,
                finishTime: p.finishTime,
                formattedTime: p.finishTime ? this.formatTime(p.finishTime) : 'DNF'
            }))
            .sort((a, b) => {
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;
                if (!a.finished && !b.finished) return 0;
                return a.finishTime - b.finishTime;
            });
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    getState() {
        return {
            code: this.code,
            wordLength: this.wordLength,
            state: this.state,
            host: this.host,
            seriesCount: this.seriesCount,
            players: this.players.map(p => {
                const progress = this.playerProgress.get(p.id);
                return {
                    id: p.id,
                    pseudo: p.pseudo,
                    wordIndex: progress ? progress.wordIndex : 0,
                    finished: p.finished,
                    finishTime: p.finishTime,
                    formattedTime: p.finishTime ? this.formatTime(p.finishTime) : null,
                    attempts: this.getPlayerAttempts(p.id)
                };
            })
        };
    }

    resetForRestart() {
        this.state = 'waiting';
        this.seriesWords = [];
        this.guesses.clear();
        this.playerProgress.clear();
        this.startTime = null;

        this.players.forEach(p => {
            p.finished = false;
            p.finishTime = null;
        });
    }
}

module.exports = GameRoom;
