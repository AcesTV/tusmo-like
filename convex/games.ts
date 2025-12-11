import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import COMMON_WORDS from './data/commonWords'
import FRENCH_WORDS from './data/words'

// Helper: Get words by length
function getWordsByLength(length: number): string[] {
    return COMMON_WORDS.filter((word) => word.length === length)
}

// Helper: Hash function for deterministic daily word
function hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i)
        hash = hash & hash
    }
    return hash
}

// Helper: Get daily word for a specific date
function getDailyWordForDate(date: string, length?: number): string {
    const seed = hashCode(date)
    const lengths = [5, 6, 7, 8]
    const targetLength = length || lengths[Math.abs(seed) % lengths.length]
    const words = getWordsByLength(targetLength)
    return words[Math.abs(seed * 31) % words.length]
}

// Helper: Get suite words for a date
function getSuiteWordsForDate(date: string): string[] {
    const words: string[] = []
    for (let len = 4; len <= 8; len++) {
        const seed = hashCode(date + '-suite-' + len)
        const lengthWords = getWordsByLength(len)
        if (lengthWords.length > 0) {
            words.push(lengthWords[Math.abs(seed) % lengthWords.length])
        }
    }
    return words
}

// Helper: Evaluate guess
export function evaluateGuess(
    guess: string,
    target: string
): ('correct' | 'present' | 'absent')[] {
    const result: ('correct' | 'present' | 'absent')[] = []
    const targetLetters = target.split('')
    const guessLetters = guess.split('')
    const used = new Array(target.length).fill(false)

    // First pass: mark correct positions
    for (let i = 0; i < guessLetters.length; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result[i] = 'correct'
            used[i] = true
        }
    }

    // Second pass: mark present but wrong position
    for (let i = 0; i < guessLetters.length; i++) {
        if (result[i]) continue

        let found = false
        for (let j = 0; j < targetLetters.length; j++) {
            if (!used[j] && guessLetters[i] === targetLetters[j]) {
                result[i] = 'present'
                used[j] = true
                found = true
                break
            }
        }

        if (!found) {
            result[i] = 'absent'
        }
    }

    return result
}

// Validate word exists in dictionary
export const validateWord = query({
    args: { word: v.string() },
    handler: async (_ctx, { word }) => {
        const upperWord = word.toUpperCase()
        const allWords = new Set(FRENCH_WORDS)
        return allWords.has(upperWord)
    },
})

// Get daily challenge info
export const getDailyInfo = query({
    handler: async () => {
        const today = new Date().toISOString().split('T')[0]
        const word = getDailyWordForDate(today)
        const suiteWords = getSuiteWordsForDate(today)

        return {
            date: today,
            daily: {
                length: word.length,
                firstLetter: word[0],
            },
            suite: {
                totalWords: suiteWords.length,
                words: suiteWords.map((w, i) => ({
                    index: i,
                    length: w.length,
                    firstLetter: w[0],
                })),
            },
        }
    },
})

// Internal: Get actual daily word (for validation)
export const getDailyWord = query({
    args: { mode: v.string(), wordIndex: v.optional(v.number()) },
    handler: async (_ctx, { mode, wordIndex }) => {
        const today = new Date().toISOString().split('T')[0]

        if (mode === 'daily') {
            return getDailyWordForDate(today)
        } else if (mode === 'suite') {
            const suiteWords = getSuiteWordsForDate(today)
            return suiteWords[wordIndex || 0]
        }

        return null
    },
})

// Random word for free play
export const getRandomWord = query({
    args: { length: v.number(), seed: v.optional(v.number()) },
    handler: async (_ctx, { length, seed }) => {
        const words = getWordsByLength(length)
        // Use seed if provided, otherwise use random
        const index = seed
            ? Math.abs(seed) % words.length
            : Math.floor(Math.random() * words.length)
        const randomWord = words[index]
        return {
            length: randomWord.length,
            firstLetter: randomWord[0],
            word: randomWord, // In free mode, we can reveal it for validation
        }
    },
})

// Submit guess
export const submitGuess = mutation({
    args: {
        word: v.string(),
        mode: v.string(),
        targetWord: v.string(),
    },
    handler: async (_ctx, { word, mode, targetWord }) => {
        const upperWord = word.toUpperCase()
        const upperTarget = targetWord.toUpperCase()

        // Validate word exists
        const allWords = new Set(FRENCH_WORDS)
        if (!allWords.has(upperWord)) {
            return { valid: false, error: "Ce mot n'existe pas dans le dictionnaire" }
        }

        // Check length
        if (upperWord.length !== upperTarget.length) {
            return {
                valid: false,
                error: `Le mot doit faire ${upperTarget.length} lettres`,
            }
        }

        // Evaluate guess
        const result = evaluateGuess(upperWord, upperTarget)
        const won = upperWord === upperTarget

        return {
            valid: true,
            word: upperWord,
            result,
            won,
        }
    },
})

// Check if player has already completed a daily challenge today
export const getDailyCompletion = query({
    args: {
        mode: v.string(),
        guestId: v.string(),
    },
    handler: async (ctx, { mode, guestId }) => {
        const today = new Date().toISOString().split('T')[0]

        // Check by guestId
        const attempt = await ctx.db
            .query('gameAttempts')
            .withIndex('by_guest_date_mode', (q) =>
                q.eq('guestId', guestId).eq('date', today).eq('mode', mode)
            )
            .first()

        if (attempt && attempt.completed) {
            return {
                completed: true,
                won: attempt.won,
                time: attempt.time,
                attempts: attempt.attempts.length,
            }
        }

        return null
    },
})

// Save daily completion
export const saveDailyCompletion = mutation({
    args: {
        mode: v.string(),
        guestId: v.string(),
        won: v.boolean(),
        time: v.number(),
        attempts: v.array(
            v.object({
                word: v.string(),
                result: v.array(v.string()),
            })
        ),
    },
    handler: async (ctx, { mode, guestId, won, time, attempts }) => {
        const today = new Date().toISOString().split('T')[0]

        // Check if already exists
        const existing = await ctx.db
            .query('gameAttempts')
            .withIndex('by_guest_date_mode', (q) =>
                q.eq('guestId', guestId).eq('date', today).eq('mode', mode)
            )
            .first()

        if (existing) {
            return { success: false, error: 'Déjà complété aujourd\'hui' }
        }

        // Save completion
        await ctx.db.insert('gameAttempts', {
            date: today,
            mode,
            guestId,
            attempts,
            completed: true,
            won,
            time,
        })

        return { success: true }
    },
})
