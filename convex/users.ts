import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// Get current user profile
export const getCurrentUser = query({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return null

        const user = await ctx.db.get(userId)
        if (!user) return null

        return {
            id: userId,
            email: user.email,
            name: user.name,
            image: user.image,
            username: user.username,
        }
    },
})

// Check if username is available
export const isUsernameAvailable = query({
    args: { username: v.string() },
    handler: async (ctx, { username }) => {
        const normalized = username.toLowerCase().trim()
        if (normalized.length < 3 || normalized.length > 20) {
            return { available: false, error: 'Le pseudo doit faire entre 3 et 20 caractères' }
        }
        if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
            return { available: false, error: 'Le pseudo ne peut contenir que des lettres, chiffres et _' }
        }

        const existing = await ctx.db
            .query('users')
            .filter((q) => q.eq(q.field('username'), normalized))
            .first()

        return { available: !existing }
    },
})

// Set username for current user
export const setUsername = mutation({
    args: { username: v.string() },
    handler: async (ctx, { username }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) {
            return { success: false, error: 'Non connecté' }
        }

        const normalized = username.toLowerCase().trim()

        // Validate
        if (normalized.length < 3 || normalized.length > 20) {
            return { success: false, error: 'Le pseudo doit faire entre 3 et 20 caractères' }
        }
        if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
            return { success: false, error: 'Le pseudo ne peut contenir que des lettres, chiffres et _' }
        }

        // Check availability
        const existing = await ctx.db
            .query('users')
            .filter((q) => q.eq(q.field('username'), normalized))
            .first()

        if (existing && existing._id !== userId) {
            return { success: false, error: 'Ce pseudo est déjà pris' }
        }

        // Update user
        await ctx.db.patch(userId, { username: normalized })

        return { success: true, username: normalized }
    },
})
