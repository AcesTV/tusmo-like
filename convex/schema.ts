import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

// Extend users table with username
const extendedAuthTables = {
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    username: v.optional(v.string()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_username', ['username']),
}

export default defineSchema({
  ...extendedAuthTables,

  // Daily challenges (generated each day)
  dailyGames: defineTable({
    date: v.string(), // YYYY-MM-DD
    word: v.string(),
    suiteWords: v.array(v.string()),
  }).index('by_date', ['date']),

  // Individual game attempts
  gameAttempts: defineTable({
    date: v.string(),
    mode: v.string(), // 'daily' | 'suite' | 'free'
    attempts: v.array(
      v.object({
        word: v.string(),
        result: v.array(v.string()), // 'correct' | 'present' | 'absent'
      })
    ),
    completed: v.boolean(),
    won: v.boolean(),
    time: v.optional(v.number()), // milliseconds
    userId: v.optional(v.id('users')),
    guestId: v.optional(v.string()), // For anonymous users
  })
    .index('by_user_date_mode', ['userId', 'date', 'mode'])
    .index('by_guest_date_mode', ['guestId', 'date', 'mode']),

  // Multiplayer rooms
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(), // Can be a guestId or stringified userId
    // Legacy field (for backward compatibility)
    wordLength: v.optional(v.number()),
    // New range fields
    minWordLength: v.optional(v.number()), // Minimum word length (4-8)
    maxWordLength: v.optional(v.number()), // Maximum word length (4-8)
    wordCount: v.optional(v.number()), // Number of words in the series
    words: v.array(v.string()), // Words for the series, ordered by increasing length
    state: v.string(), // 'waiting' | 'playing' | 'finished'
    players: v.array(
      v.object({
        odI: v.string(),
        name: v.string(),
        wordIndex: v.number(),
        attempts: v.number(),
        finished: v.boolean(),
        finishTime: v.optional(v.number()),
      })
    ),
    startTime: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_code', ['code']),

  // Leaderboards (per day/mode)
  leaderboards: defineTable({
    date: v.string(),
    mode: v.string(),
    entries: v.array(
      v.object({
        odI: v.string(),
        name: v.string(),
        time: v.number(),
        attempts: v.number(),
      })
    ),
  }).index('by_date_mode', ['date', 'mode']),

  // User statistics (persistent for leaderboards)
  userStats: defineTable({
    odI: v.string(), // odI or guestId
    name: v.string(),
    userId: v.optional(v.id('users')),

    // Win streaks
    dailyWinStreak: v.number(),
    dailyBestStreak: v.number(),
    suiteWinStreak: v.number(),
    suiteBestStreak: v.number(),

    // Games played
    totalGamesPlayed: v.number(),
    dailyGamesPlayed: v.number(),
    suiteGamesPlayed: v.number(),
    freeGamesPlayed: v.number(),

    // Wins
    dailyWins: v.number(),
    suiteWins: v.number(),
    freeWins: v.number(),

    // Words found
    totalWordsFound: v.number(),

    // Tracking for streak calculation
    lastDailyPlayedDate: v.optional(v.string()),
    lastSuitePlayedDate: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_odI', ['odI'])
    .index('by_userId', ['userId'])
    .index('by_totalWordsFound', ['totalWordsFound'])
    .index('by_dailyBestStreak', ['dailyBestStreak'])
    .index('by_suiteBestStreak', ['suiteBestStreak'])
    .index('by_totalGamesPlayed', ['totalGamesPlayed']),
})
