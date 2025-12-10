'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { User } from 'lucide-react'

interface UsernameModalProps {
    onComplete: () => void
}

export function UsernameModal({ onComplete }: UsernameModalProps) {
    const [username, setUsername] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const setUsernameMutation = useMutation(api.users.setUsername)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const result = await setUsernameMutation({ username })
            if (result.success) {
                onComplete()
            } else {
                setError(result.error || 'Erreur inconnue')
            }
        } catch (e) {
            setError('Erreur de connexion')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-pink-500 rounded-full mb-4">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Bienvenue !</h2>
                    <p className="text-gray-400">Choisissez un pseudo pour commencer</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Votre pseudo"
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors text-center text-xl"
                            maxLength={20}
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            3-20 caractères, lettres, chiffres et _ uniquement
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || username.length < 3}
                        className="w-full py-3 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-xl transition-all"
                    >
                        {loading ? 'Enregistrement...' : 'Continuer'}
                    </button>
                </form>
            </div>
        </div>
    )
}

// Hook to check if user needs to set username
export function useNeedsUsername() {
    const currentUser = useQuery(api.users.getCurrentUser)

    // Still loading
    if (currentUser === undefined) return { loading: true, needsUsername: false }

    // Not logged in or has username
    if (!currentUser || currentUser.username) return { loading: false, needsUsername: false }

    // Logged in but no username
    return { loading: false, needsUsername: true }
}
