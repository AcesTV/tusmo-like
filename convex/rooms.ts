import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import COMMON_WORDS from './data/commonWords'
import FRENCH_WORDS from './data/words'
import { evaluateGuess } from './games'

// Generate room code
function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

// Get words by length
function getWordsByLength(length: number): string[] {
    return COMMON_WORDS.filter((word) => word.length === length)
}

// Generate 4 random words for series
function generateSeriesWords(length: number): string[] {
    const words = getWordsByLength(length)
    const selected: string[] = []
    const usedIndices = new Set<number>()

    for (let i = 0; i < 4; i++) {
        let index
        do {
            index = Math.floor(Math.random() * words.length)
        } while (usedIndices.has(index))
        usedIndices.add(index)
        selected.push(words[index])
    }

    return selected
}

// Create a new room
export const createRoom = mutation({
    args: {
        hostId: v.string(),
        hostName: v.string(),
        wordLength: v.number(),
    },
    handler: async (ctx, { hostId, hostName, wordLength }) => {
        const code = generateRoomCode()
        const words = generateSeriesWords(wordLength)

        const roomId = await ctx.db.insert('rooms', {
            code,
            hostId,
            wordLength,
            words,
            state: 'waiting',
            players: [
                {
                    odI: hostId,
                    name: hostName,
                    wordIndex: 0,
                    attempts: 0,
                    finished: false,
                },
            ],
            createdAt: Date.now(),
        })

        return { roomId, code }
    },
})

// Join a room
export const joinRoom = mutation({
    args: {
        code: v.string(),
        odI: v.string(),
        name: v.string(),
    },
    handler: async (ctx, { code, odI, name }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room) {
            return { error: 'Salle introuvable' }
        }

        if (room.state !== 'waiting') {
            return { error: 'La partie a déjà commencé' }
        }

        // Check if player already in room
        if (room.players.some((p) => p.odI === odI)) {
            return { roomId: room._id, code: room.code }
        }

        // Add player
        await ctx.db.patch(room._id, {
            players: [
                ...room.players,
                {
                    odI,
                    name,
                    wordIndex: 0,
                    attempts: 0,
                    finished: false,
                },
            ],
        })

        return { roomId: room._id, code: room.code }
    },
})

// Get room state
export const getRoomState = query({
    args: { code: v.string() },
    handler: async (ctx, { code }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room) return null

        return {
            code: room.code,
            hostId: room.hostId,
            wordLength: room.wordLength,
            state: room.state,
            players: room.players,
            startTime: room.startTime,
            seriesCount: room.words.length,
        }
    },
})

// Start game
export const startGame = mutation({
    args: { code: v.string(), hostId: v.string() },
    handler: async (ctx, { code, hostId }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room || room.hostId !== hostId) {
            return { error: 'Non autorisé' }
        }

        await ctx.db.patch(room._id, {
            state: 'playing',
            startTime: Date.now(),
        })

        return {
            success: true,
            firstLetter: room.words[0][0],
            wordLength: room.wordLength,
        }
    },
})

// Get current word for player
export const getCurrentWord = query({
    args: { code: v.string(), odI: v.string() },
    handler: async (ctx, { code, odI }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room) return null

        const player = room.players.find((p) => p.odI === odI)
        if (!player || player.finished) return null

        const word = room.words[player.wordIndex]
        return {
            word,
            wordIndex: player.wordIndex,
            totalWords: room.words.length,
            firstLetter: word[0],
        }
    },
})

// Submit room guess
export const submitRoomGuess = mutation({
    args: {
        code: v.string(),
        odI: v.string(),
        word: v.string(),
    },
    handler: async (ctx, { code, odI, word }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room || room.state !== 'playing') {
            return { error: 'Partie non en cours' }
        }

        const playerIndex = room.players.findIndex((p) => p.odI === odI)
        if (playerIndex === -1) return { error: 'Joueur non trouvé' }

        const player = room.players[playerIndex]
        if (player.finished) return { error: 'Déjà terminé' }

        const targetWord = room.words[player.wordIndex]
        const upperWord = word.toUpperCase()

        if (upperWord.length !== targetWord.length) {
            return { error: `Le mot doit faire ${targetWord.length} lettres` }
        }

        // Validate word exists in dictionary
        const allWords = new Set(FRENCH_WORDS)
        if (!allWords.has(upperWord)) {
            return { error: "Ce mot n'existe pas dans le dictionnaire" }
        }

        const result = evaluateGuess(upperWord, targetWord)
        const won = upperWord === targetWord

        // Update player
        const updatedPlayers = [...room.players]
        updatedPlayers[playerIndex] = {
            ...player,
            attempts: player.attempts + 1,
        }

        // Check if won or max attempts
        if (won || player.attempts + 1 >= 6) {
            const newWordIndex = player.wordIndex + 1

            if (newWordIndex >= room.words.length) {
                // Player finished all words
                updatedPlayers[playerIndex] = {
                    ...updatedPlayers[playerIndex],
                    wordIndex: newWordIndex,
                    finished: true,
                    finishTime: Date.now() - (room.startTime || Date.now()),
                    attempts: 0,
                }
            } else {
                // Move to next word
                updatedPlayers[playerIndex] = {
                    ...updatedPlayers[playerIndex],
                    wordIndex: newWordIndex,
                    attempts: 0,
                }
            }
        }

        await ctx.db.patch(room._id, { players: updatedPlayers })

        // Check if game finished
        const allFinished = updatedPlayers.every((p) => p.finished)
        if (allFinished) {
            await ctx.db.patch(room._id, { state: 'finished' })
        }

        return {
            result,
            won,
            gameOver: !won && player.attempts + 1 >= 6,
            advanceToNext:
                (won || player.attempts + 1 >= 6) &&
                player.wordIndex + 1 < room.words.length,
            seriesComplete:
                (won || player.attempts + 1 >= 6) &&
                player.wordIndex + 1 >= room.words.length,
            nextFirstLetter:
                player.wordIndex + 1 < room.words.length
                    ? room.words[player.wordIndex + 1][0]
                    : null,
        }
    },
})

// Get ranking
export const getRanking = query({
    args: { code: v.string() },
    handler: async (ctx, { code }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room) return null

        const ranking = room.players
            .map((p) => ({
                odI: p.odI,
                name: p.name,
                finished: p.finished,
                finishTime: p.finishTime,
                formattedTime: p.finishTime
                    ? formatTime(p.finishTime)
                    : p.finished
                        ? 'DNF'
                        : 'En cours',
            }))
            .sort((a, b) => {
                if (a.finished && !b.finished) return -1
                if (!a.finished && b.finished) return 1
                if (!a.finishTime && !b.finishTime) return 0
                return (a.finishTime || 0) - (b.finishTime || 0)
            })

        return {
            ranking,
            words: room.words,
            state: room.state,
        }
    },
})

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Leave room
export const leaveRoom = mutation({
    args: { code: v.string(), odI: v.string() },
    handler: async (ctx, { code, odI }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room) return

        const updatedPlayers = room.players.filter((p) => p.odI !== odI)

        if (updatedPlayers.length === 0) {
            await ctx.db.delete(room._id)
        } else {
            // If host left, assign new host
            const newHostId =
                room.hostId === odI ? updatedPlayers[0].odI : room.hostId

            await ctx.db.patch(room._id, {
                players: updatedPlayers,
                hostId: newHostId,
            })
        }
    },
})

// Restart room
export const restartRoom = mutation({
    args: { code: v.string(), hostId: v.string() },
    handler: async (ctx, { code, hostId }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
            .first()

        if (!room || room.hostId !== hostId) {
            return { error: 'Non autorisé' }
        }

        const newWords = generateSeriesWords(room.wordLength)
        const resetPlayers = room.players.map((p) => ({
            ...p,
            wordIndex: 0,
            attempts: 0,
            finished: false,
            finishTime: undefined,
        }))

        await ctx.db.patch(room._id, {
            words: newWords,
            state: 'waiting',
            players: resetPlayers,
            startTime: undefined,
        })

        return { success: true }
    },
})
