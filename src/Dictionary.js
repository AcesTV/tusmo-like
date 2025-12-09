const FRENCH_WORDS = require('./words');
const COMMON_WORDS = require('./commonWords');

class Dictionary {
    constructor() {
        // All valid words for validation (182k+)
        this.allWords = new Set();

        // Common words only for word selection (mots à deviner)
        this.commonWords = new Map();

        this.loadWords();
    }

    loadWords() {
        // Load all words for validation
        FRENCH_WORDS.forEach(word => {
            this.allWords.add(word);
        });
        console.log(`📚 Dictionnaire (validation): ${this.allWords.size} mots`);

        // Load common words for word selection
        COMMON_WORDS.forEach(word => {
            const len = word.length;
            if (!this.commonWords.has(len)) {
                this.commonWords.set(len, []);
            }
            this.commonWords.get(len).push(word);
        });
        console.log(`📚 Mots courants (à deviner): ${COMMON_WORDS.length} mots`);
    }

    isValidWord(word) {
        return this.allWords.has(word.toUpperCase());
    }

    // Returns a random COMMON word (for word selection)
    getRandomWord(length = null) {
        if (length) {
            const words = this.commonWords.get(length);
            if (words?.length) return words[Math.floor(Math.random() * words.length)];
        }
        const lengths = Array.from(this.commonWords.keys());
        const len = lengths[Math.floor(Math.random() * lengths.length)];
        const words = this.commonWords.get(len);
        return words[Math.floor(Math.random() * words.length)];
    }

    getWordsByLength(length) {
        return this.commonWords.get(length) || [];
    }

    getDailyWord(date, length = null) {
        const dateStr = date.toISOString().split('T')[0];
        const seed = this.hashCode(dateStr);
        if (length) {
            const words = this.commonWords.get(length);
            if (words?.length) return words[Math.abs(seed) % words.length];
        }
        const lengths = Array.from(this.commonWords.keys());
        const len = lengths[Math.abs(seed) % lengths.length];
        const words = this.commonWords.get(len);
        return words[Math.abs(seed * 31) % words.length];
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash;
    }
}

module.exports = Dictionary;
