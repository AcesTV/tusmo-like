import { query, mutation, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// Get stats for a user (from persistent storage)
export const getStats = query({
    args: { odI: v.optional(v.string()) },
    handler: async (ctx, { odI }) => {
        const userId = await getAuthUserId(ctx)

        let stats
        if (userId) {
            stats = await ctx.db
                .query('userStats')
                .withIndex('by_userId', (q) => q.eq('userId', userId))
                .first()
        } else if (odI) {
            stats = await ctx.db
                .query('userStats')
                .withIndex('by_odI', (q) => q.eq('odI', odI))
                .first()
        }

        if (!stats) {
            // Return default stats
            return {
                dailyWinStreak: 0,
                dailyBestStreak: 0,
                suiteWinStreak: 0,
                suiteBestStreak: 0,
                totalGamesPlayed: 0,
                dailyGamesPlayed: 0,
                suiteGamesPlayed: 0,
                freeGamesPlayed: 0,
                dailyWins: 0,
                suiteWins: 0,
                freeWins: 0,
                totalWordsFound: 0,
            }
        }

        return {
            dailyWinStreak: stats.dailyWinStreak,
            dailyBestStreak: stats.dailyBestStreak,
            suiteWinStreak: stats.suiteWinStreak,
            suiteBestStreak: stats.suiteBestStreak,
            totalGamesPlayed: stats.totalGamesPlayed,
            dailyGamesPlayed: stats.dailyGamesPlayed,
            suiteGamesPlayed: stats.suiteGamesPlayed,
            freeGamesPlayed: stats.freeGamesPlayed,
            dailyWins: stats.dailyWins,
            suiteWins: stats.suiteWins,
            freeWins: stats.freeWins,
            totalWordsFound: stats.totalWordsFound,
        }
    },
})

// Update stats after a game is completed
export const updateStats = mutation({
    args: {
        odI: v.string(),
        name: v.string(),
        mode: v.string(), // 'daily' | 'suite' | 'free'
        won: v.boolean(),
        wordsFound: v.number(), // 1 for daily/free, 5 for suite
        date: v.string(), // YYYY-MM-DD
    },
    handler: async (ctx, { odI, name, mode, won, wordsFound, date }) => {
        const userId = await getAuthUserId(ctx)

        // Find existing stats
        let existingStats = await ctx.db
            .query('userStats')
            .withIndex('by_odI', (q) => q.eq('odI', odI))
            .first()

        const now = Date.now()

        if (!existingStats) {
            // Create new stats record
            const newStats = {
                odI,
                name,
                userId: userId || undefined,
                dailyWinStreak: 0,
                dailyBestStreak: 0,
                suiteWinStreak: 0,
                suiteBestStreak: 0,
                totalGamesPlayed: 0,
                dailyGamesPlayed: 0,
                suiteGamesPlayed: 0,
                freeGamesPlayed: 0,
                dailyWins: 0,
                suiteWins: 0,
                freeWins: 0,
                totalWordsFound: 0,
                lastDailyPlayedDate: undefined as string | undefined,
                lastSuitePlayedDate: undefined as string | undefined,
                createdAt: now,
                updatedAt: now,
            }

            // Update based on mode
            if (mode === 'daily') {
                newStats.dailyGamesPlayed = 1
                newStats.totalGamesPlayed = 1
                newStats.lastDailyPlayedDate = date
                if (won) {
                    newStats.dailyWins = 1
                    newStats.dailyWinStreak = 1
                    newStats.dailyBestStreak = 1
                }
            } else if (mode === 'suite') {
                newStats.suiteGamesPlayed = 1
                newStats.totalGamesPlayed = 1
                newStats.lastSuitePlayedDate = date
                if (won) {
                    newStats.suiteWins = 1
                    newStats.suiteWinStreak = 1
                    newStats.suiteBestStreak = 1
                }
            } else if (mode === 'free') {
                newStats.freeGamesPlayed = 1
                newStats.totalGamesPlayed = 1
                if (won) {
                    newStats.freeWins = 1
                }
            }

            newStats.totalWordsFound = wordsFound

            await ctx.db.insert('userStats', newStats)
            return { success: true }
        }

        // Update existing stats
        const updates: Record<string, number | string | undefined> = {
            updatedAt: now,
            name, // Update name in case it changed
        }

        // Update games played
        updates.totalGamesPlayed = existingStats.totalGamesPlayed + 1
        updates.totalWordsFound = existingStats.totalWordsFound + wordsFound

        if (mode === 'daily') {
            updates.dailyGamesPlayed = existingStats.dailyGamesPlayed + 1

            if (won) {
                updates.dailyWins = existingStats.dailyWins + 1

                // Check if consecutive day for streak
                const isConsecutive = isConsecutiveDay(existingStats.lastDailyPlayedDate, date)
                const isSameDay = existingStats.lastDailyPlayedDate === date

                if (isConsecutive && !isSameDay) {
                    const newStreak = existingStats.dailyWinStreak + 1
                    updates.dailyWinStreak = newStreak
                    updates.dailyBestStreak = Math.max(existingStats.dailyBestStreak, newStreak)
                } else if (!isSameDay) {
                    // New streak starts
                    updates.dailyWinStreak = 1
                    updates.dailyBestStreak = Math.max(existingStats.dailyBestStreak, 1)
                }
            } else {
                // Lost - reset streak
                updates.dailyWinStreak = 0
            }

            updates.lastDailyPlayedDate = date

        } else if (mode === 'suite') {
            updates.suiteGamesPlayed = existingStats.suiteGamesPlayed + 1

            if (won) {
                updates.suiteWins = existingStats.suiteWins + 1

                const isConsecutive = isConsecutiveDay(existingStats.lastSuitePlayedDate, date)
                const isSameDay = existingStats.lastSuitePlayedDate === date

                if (isConsecutive && !isSameDay) {
                    const newStreak = existingStats.suiteWinStreak + 1
                    updates.suiteWinStreak = newStreak
                    updates.suiteBestStreak = Math.max(existingStats.suiteBestStreak, newStreak)
                } else if (!isSameDay) {
                    updates.suiteWinStreak = 1
                    updates.suiteBestStreak = Math.max(existingStats.suiteBestStreak, 1)
                }
            } else {
                updates.suiteWinStreak = 0
            }

            updates.lastSuitePlayedDate = date

        } else if (mode === 'free') {
            updates.freeGamesPlayed = existingStats.freeGamesPlayed + 1
            if (won) {
                updates.freeWins = existingStats.freeWins + 1
            }
        }

        await ctx.db.patch(existingStats._id, updates)
        return { success: true }
    },
})

// Helper to check if dates are consecutive
function isConsecutiveDay(lastDate: string | undefined, currentDate: string): boolean {
    if (!lastDate) return false

    const last = new Date(lastDate)
    const current = new Date(currentDate)
    const diffTime = current.getTime() - last.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    return diffDays === 1
}

// Get leaderboard
export const getLeaderboard = query({
    args: {
        sortBy: v.optional(v.string()), // 'totalWordsFound' | 'dailyBestStreak' | 'suiteBestStreak' | 'totalGamesPlayed'
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { sortBy = 'totalWordsFound', limit = 20 }) => {
        let query

        // Note: Convex doesn't support ordering by index value directly in query
        // We'll fetch all and sort in memory (fine for small datasets)
        const allStats = await ctx.db.query('userStats').collect()

        // Sort based on sortBy parameter
        const sorted = allStats.sort((a, b) => {
            switch (sortBy) {
                case 'dailyBestStreak':
                    return b.dailyBestStreak - a.dailyBestStreak
                case 'suiteBestStreak':
                    return b.suiteBestStreak - a.suiteBestStreak
                case 'totalGamesPlayed':
                    return b.totalGamesPlayed - a.totalGamesPlayed
                case 'totalWordsFound':
                default:
                    return b.totalWordsFound - a.totalWordsFound
            }
        })

        // Take top N
        const top = sorted.slice(0, limit)

        return top.map((stats, index) => ({
            rank: index + 1,
            odI: stats.odI,
            name: stats.name,
            totalWordsFound: stats.totalWordsFound,
            dailyBestStreak: stats.dailyBestStreak,
            suiteBestStreak: stats.suiteBestStreak,
            totalGamesPlayed: stats.totalGamesPlayed,
            dailyWins: stats.dailyWins,
            suiteWins: stats.suiteWins,
        }))
    },
})
