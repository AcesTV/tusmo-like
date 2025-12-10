import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  ...authTables,

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
    wordLength: v.number(),
    words: v.array(v.string()), // 4 words for the series
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
})
