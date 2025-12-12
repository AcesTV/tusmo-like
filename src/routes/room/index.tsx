'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation, useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Users, Plus, ArrowRight, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/room/')({
  component: RoomLobby,
})

// Generate a unique player ID
function getPlayerId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('tusmo_playerId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('tusmo_playerId', id)
  }
  return id
}

function getPlayerName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('tusmo_playerName') || ''
}

function setPlayerName(name: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tusmo_playerName', name)
  }
}

function RoomLobby() {
  const navigate = useNavigate()
  const { isAuthenticated } = useConvexAuth()
  const currentUser = useQuery(api.users.getCurrentUser)

  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [minLength, setMinLength] = useState(4)
  const [maxLength, setMaxLength] = useState(8)
  const [wordCount, setWordCount] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)

  const createRoomMutation = useMutation(api.rooms.createRoom)
  const joinRoomMutation = useMutation(api.rooms.joinRoom)

  // Get display name: use logged-in user name or local storage name
  const displayName = isAuthenticated && currentUser
    ? (currentUser.username || currentUser.name || 'Joueur')
    : name

  // Load saved name and player ID (client-side only)
  useEffect(() => {
    if (!isAuthenticated) {
      setName(getPlayerName())
    }
    setPlayerId(getPlayerId())
  }, [isAuthenticated])

  const handleCreateRoom = async () => {
    if (!displayName.trim()) {
      setError('Entrez votre pseudo')
      return
    }
    if (!playerId) {
      setError('Chargement en cours...')
      return
    }

    setLoading(true)
    setError(null)
    if (!isAuthenticated) {
      setPlayerName(displayName.trim())
    }

    try {
      const result = await createRoomMutation({
        hostId: playerId,
        hostName: displayName.trim(),
        minWordLength: minLength,
        maxWordLength: maxLength,
        wordCount: wordCount,
      })
      navigate({ to: '/room/$code', params: { code: result.code } })
    } catch (e) {
      setError('Erreur lors de la création')
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!displayName.trim()) {
      setError('Entrez votre pseudo')
      return
    }
    if (!roomCode.trim()) {
      setError('Entrez le code de la room')
      return
    }

    setLoading(true)
    setError(null)
    if (!isAuthenticated) {
      setPlayerName(displayName.trim())
    }

    if (!playerId) {
      setError('Chargement en cours...')
      setLoading(false)
      return
    }

    try {
      const result = await joinRoomMutation({
        code: roomCode.trim().toUpperCase(),
        odI: playerId,
        name: displayName.trim(),
      })

      if ('error' in result && result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      navigate({
        to: '/room/$code',
        params: { code: roomCode.trim().toUpperCase() },
      })
    } catch (e) {
      setError('Erreur lors de la connexion')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 p-4 flex items-center">
        <Button variant="ghost" asChild className="text-gray-400 hover:text-white">
          <Link to="/">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Link>
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-pink-500/20 rounded-full mb-4">
              <Users className="w-6 h-6 text-pink-400" />
              <span className="text-pink-400 font-semibold">Multijoueur</span>
            </div>
            <h1 className="text-3xl font-bold text-white">
              Créer ou rejoindre une partie
            </h1>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Name input - only shown if not logged in */}
          {!isAuthenticated && (
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                Votre pseudo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Entrez votre pseudo"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                maxLength={20}
              />
            </div>
          )}

          {/* Logged in user display */}
          {isAuthenticated && currentUser && (
            <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                <span className="text-pink-400 font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-white font-medium">{displayName}</div>
                <div className="text-xs text-gray-500">Connecté</div>
              </div>
            </div>
          )}

          {/* Create room section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-pink-400" />
              Créer une partie
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-3">
                Nombre de lettres : <span className="text-pink-400 font-semibold">{minLength} → {maxLength}</span>
              </label>

              <div className="space-y-4">
                {/* Min length slider */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-8">Min</span>
                  <input
                    type="range"
                    min={4}
                    max={8}
                    value={minLength}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setMinLength(val)
                      if (val > maxLength) setMaxLength(val)
                    }}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-white font-mono w-6 text-center">{minLength}</span>
                </div>

                {/* Max length slider */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-8">Max</span>
                  <input
                    type="range"
                    min={4}
                    max={8}
                    value={maxLength}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setMaxLength(val)
                      if (val < minLength) setMinLength(val)
                    }}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-white font-mono w-6 text-center">{maxLength}</span>
                </div>
              </div>

              {/* Visual indicator of word lengths */}
              <div className="flex justify-between mt-3 px-11">
                {[4, 5, 6, 7, 8].map((len) => (
                  <div
                    key={len}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${len >= minLength && len <= maxLength
                      ? 'bg-pink-500 text-white'
                      : 'bg-slate-700 text-gray-500'
                      }`}
                  >
                    {len}
                  </div>
                ))}
              </div>
            </div>

            {/* Word count slider */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-3">
                Nombre de mots : <span className="text-pink-400 font-semibold">{wordCount}</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">1</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <span className="text-sm text-gray-500">10</span>
              </div>
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              {loading ? 'Création...' : 'Créer une partie'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>

          {/* Join room section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Rejoindre une partie
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Code de la room
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase font-mono text-center text-xl tracking-widest"
                maxLength={6}
              />
            </div>

            <Button
              onClick={handleJoinRoom}
              disabled={loading}
              variant="secondary"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {loading ? 'Connexion...' : 'Rejoindre'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
