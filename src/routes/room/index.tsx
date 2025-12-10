'use client'

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Users, Plus, ArrowRight, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

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
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [wordLength, setWordLength] = useState(6)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)

  const createRoomMutation = useMutation(api.rooms.createRoom)
  const joinRoomMutation = useMutation(api.rooms.joinRoom)

  // Load saved name and player ID (client-side only)
  useEffect(() => {
    setName(getPlayerName())
    setPlayerId(getPlayerId())
  }, [])

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError('Entrez votre pseudo')
      return
    }
    if (!playerId) {
      setError('Chargement en cours...')
      return
    }

    setLoading(true)
    setError(null)
    setPlayerName(name.trim())

    try {
      const result = await createRoomMutation({
        hostId: playerId,
        hostName: name.trim(),
        wordLength,
      })
      navigate({ to: '/room/$code', params: { code: result.code } })
    } catch (e) {
      setError('Erreur lors de la création')
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!name.trim()) {
      setError('Entrez votre pseudo')
      return
    }
    if (!roomCode.trim()) {
      setError('Entrez le code de la room')
      return
    }

    setLoading(true)
    setError(null)
    setPlayerName(name.trim())

    if (!playerId) {
      setError('Chargement en cours...')
      setLoading(false)
      return
    }

    try {
      const result = await joinRoomMutation({
        code: roomCode.trim().toUpperCase(),
        odI: playerId,
        name: name.trim(),
      })

      if ('error' in result && result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      navigate({ to: '/room/$code', params: { code: roomCode.trim().toUpperCase() } })
    } catch (e) {
      setError('Erreur lors de la connexion')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </Link>
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
            <h1 className="text-3xl font-bold text-white">Créer ou rejoindre une partie</h1>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Name input */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Votre pseudo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Entrez votre pseudo"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
              maxLength={20}
            />
          </div>

          {/* Create room section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-pink-400" />
              Créer une partie
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Longueur des mots</label>
              <div className="flex gap-2">
                {[5, 6, 7, 8].map((len) => (
                  <button
                    key={len}
                    onClick={() => setWordLength(len)}
                    className={`flex-1 py-2 rounded-lg font-semibold transition-all ${wordLength === len
                      ? 'bg-pink-500 text-white'
                      : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                      }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Création...' : 'Créer une partie'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>

          {/* Join room section */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Rejoindre une partie
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Code de la room</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase font-mono text-center text-xl tracking-widest"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Connexion...' : 'Rejoindre'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
