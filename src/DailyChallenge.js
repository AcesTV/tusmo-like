const COMMON_WORDS = require('./commonWords');

class DailyChallenge {
    constructor(dictionary) {
        this.dictionary = dictionary;
        this.currentDate = null;
        this.dailyWord = null;
        this.suiteWords = [];

        // Organize common words by length for faster access
        this.commonWordsByLength = new Map();
        COMMON_WORDS.forEach(word => {
            const len = word.length;
            if (!this.commonWordsByLength.has(len)) {
                this.commonWordsByLength.set(len, []);
            }
            this.commonWordsByLength.get(len).push(word);
        });

        console.log(`📚 Mots courants chargés: ${COMMON_WORDS.length}`);
        this.refreshDaily();
    }

    refreshDaily() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        if (this.currentDate !== dateStr) {
            this.currentDate = dateStr;

            // Generate daily word (random length 5-8) from COMMON words
            const lengths = [5, 6, 7, 8];
            const seed = this.hashCode(dateStr);
            const dailyLength = lengths[Math.abs(seed) % lengths.length];
            this.dailyWord = this.getCommonWord(dateStr, dailyLength);

            // Generate suite (5 words of increasing length) from COMMON words
            this.suiteWords = [];
            for (let len = 4; len <= 8; len++) {
                const suiteSeed = this.hashCode(dateStr + '-suite-' + len);
                const words = this.commonWordsByLength.get(len) || [];
                if (words.length > 0) {
                    this.suiteWords.push(words[Math.abs(suiteSeed) % words.length]);
                }
            }

            console.log(`📅 Mot du jour: ${this.dailyWord}`);
            console.log(`📅 Suite du jour: ${this.suiteWords.join(', ')}`);
        }
    }

    getCommonWord(dateStr, length) {
        const seed = this.hashCode(dateStr + '-daily-' + length);
        const words = this.commonWordsByLength.get(length) || [];
        if (words.length > 0) {
            return words[Math.abs(seed) % words.length];
        }
        // Fallback to any length if specific length not found
        const allLengths = Array.from(this.commonWordsByLength.keys());
        const fallbackLen = allLengths[Math.abs(seed) % allLengths.length];
        const fallbackWords = this.commonWordsByLength.get(fallbackLen);
        return fallbackWords[Math.abs(seed * 31) % fallbackWords.length];
    }

    getDailyWordInfo() {
        this.refreshDaily();
        return {
            length: this.dailyWord.length,
            firstLetter: this.dailyWord[0],
            date: this.currentDate
        };
    }

    getDailySuiteInfo() {
        this.refreshDaily();
        return {
            totalWords: this.suiteWords.length,
            date: this.currentDate
        };
    }

    getSuiteWordInfo(index) {
        this.refreshDaily();
        if (index >= 0 && index < this.suiteWords.length) {
            const word = this.suiteWords[index];
            return {
                length: word.length,
                firstLetter: word[0],
                index,
                total: this.suiteWords.length
            };
        }
        return null;
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

module.exports = DailyChallenge;
