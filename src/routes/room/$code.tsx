'use client'

import {
  createFileRoute,
  Link,
  useParams,
  useNavigate,
} from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState, useCallback, useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { Grid, type TileStatus } from '@/components/game/Grid'
import { Keyboard } from '@/components/game/Keyboard'
import { Timer } from '@/components/game/Timer'
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Crown,
  Play,
  RotateCcw,
  LogOut,
  Trophy,
} from 'lucide-react'

export const Route = createFileRoute('/room/$code')({
  component: RoomPage,
})

function getPlayerId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('tusmo_playerId') || ''
}

function RoomPage() {
  const { code } = useParams({ from: '/room/$code' })
  const navigate = useNavigate()
  const [playerId, setPlayerId] = useState<string>('')

  // Initialize playerId client-side only
  useEffect(() => {
    setPlayerId(getPlayerId())
  }, [])

  // Queries
  const roomState = useQuery(api.rooms.getRoomState, { code })
  const currentWord = useQuery(
    api.rooms.getCurrentWord,
    roomState?.state === 'playing' && playerId
      ? { code, odI: playerId }
      : 'skip',
  )
  const ranking = useQuery(
    api.rooms.getRanking,
    roomState?.state === 'finished' || roomState?.state === 'playing'
      ? { code }
      : 'skip',
  )

  // Mutations
  const startGameMutation = useMutation(api.rooms.startGame)
  const submitGuessMutation = useMutation(api.rooms.submitRoomGuess)
  const leaveRoomMutation = useMutation(api.rooms.leaveRoom)
  const restartRoomMutation = useMutation(api.rooms.restartRoom)

  // Local state
  const [copied, setCopied] = useState(false)
  const [currentGuess, setCurrentGuess] = useState('')
  const [attempts, setAttempts] = useState<
    { word: string; result: TileStatus[] }[]
  >([])
  const [foundLetters, setFoundLetters] = useState<(string | null)[]>([])
  const [keyboardState, setKeyboardState] = useState<
    Record<string, TileStatus>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [wordIndex, setWordIndex] = useState(0)
  const [animatingRow, setAnimatingRow] = useState<number | null>(null)

  // Initialize game when word changes
  useEffect(() => {
    if (currentWord && currentWord.wordIndex !== wordIndex) {
      setWordIndex(currentWord.wordIndex)
      setCurrentGuess(currentWord.firstLetter)
      setAttempts([])
      setKeyboardState({})
      setFoundLetters(
        Array(currentWord.word.length)
          .fill(null)
          .map((_, i) => (i === 0 ? currentWord.firstLetter : null)),
      )
    } else if (currentWord && !currentGuess) {
      setCurrentGuess(currentWord.firstLetter)
      setFoundLetters(
        Array(currentWord.word.length)
          .fill(null)
          .map((_, i) => (i === 0 ? currentWord.firstLetter : null)),
      )
    }
  }, [currentWord, wordIndex, currentGuess])

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartGame = async () => {
    try {
      await startGameMutation({ code, hostId: playerId })
    } catch (e) {
      setError('Erreur lors du lancement')
    }
  }

  const handleLeaveRoom = async () => {
    try {
      await leaveRoomMutation({ code, odI: playerId })
      navigate({ to: '/room' })
    } catch (e) {
      console.error(e)
    }
  }

  const handleRestart = async () => {
    if (roomState?.hostId === playerId) {
      try {
        await restartRoomMutation({ code, hostId: playerId })
      } catch (e) {
        setError('Erreur lors du redémarrage')
      }
    }
  }

  const handleKey = useCallback(
    (key: string) => {
      if (!currentWord) return
      setError(null)

      if (key === 'BACKSPACE') {
        if (currentGuess.length > 1) {
          setCurrentGuess((prev) => prev.slice(0, -1))
        }
      } else if (key === 'ENTER') {
        // Handled by submitGuess
      } else if (
        /^[A-Z]$/.test(key) &&
        currentGuess.length < currentWord.word.length
      ) {
        setCurrentGuess((prev) => prev + key)
      }
    },
    [currentWord, currentGuess],
  )

  const submitGuess = useCallback(async () => {
    if (!currentWord || currentGuess.length !== currentWord.word.length) {
      setError('Mot incomplet')
      return
    }

    try {
      const result = await submitGuessMutation({
        code,
        odI: playerId,
        word: currentGuess,
      })

      if ('error' in result && result.error !== undefined) {
        setError(result.error)
        return
      }

      const newAttempt = {
        word: currentGuess.toUpperCase(),
        result: result.result as TileStatus[],
      }
      const newRowIndex = attempts.length
      setAttempts((prev) => [...prev, newAttempt])

      // Trigger flip animation for this row
      setAnimatingRow(newRowIndex)
      // Clear animation after all tiles have flipped
      setTimeout(() => {
        setAnimatingRow(null)
      }, currentWord.word.length * 60 + 500)

      // Update keyboard state
      const newKeyboardState = { ...keyboardState }
      const priority: Record<string, number> = {
        absent: 1,
        present: 2,
        correct: 3,
      }
      currentGuess.split('').forEach((letter, i) => {
        const status = result.result[i] as TileStatus
        const current = newKeyboardState[letter]
        if (!current || priority[status] > priority[current]) {
          newKeyboardState[letter] = status
        }
      })
      setKeyboardState(newKeyboardState)

      // Update found letters
      setFoundLetters((prev) => {
        const newFound = [...prev]
        result.result.forEach((status: string, i: number) => {
          if (status === 'correct') {
            newFound[i] = currentGuess[i]
          }
        })
        return newFound
      })

      // Handle next word or continue
      if (result.advanceToNext && result.nextFirstLetter) {
        // Will be handled by useEffect when currentWord updates
        setCurrentGuess(result.nextFirstLetter)
        setAttempts([])
        setKeyboardState({})
      } else if (!result.seriesComplete && !result.gameOver) {
        setCurrentGuess(currentWord.firstLetter)
      }
    } catch (e) {
      setError('Erreur de connexion')
    }
  }, [
    currentWord,
    currentGuess,
    code,
    playerId,
    submitGuessMutation,
    keyboardState,
  ])

  // Physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (roomState?.state !== 'playing') return
      if (e.key === 'Enter') {
        submitGuess()
      } else if (e.key === 'Backspace') {
        handleKey('BACKSPACE')
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toUpperCase())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKey, submitGuess, roomState?.state])

  if (!roomState) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const isHost = roomState.hostId === playerId
  const myPlayer = roomState.players.find((p) => p.odI === playerId)

  // WAITING STATE
  if (roomState.state === 'waiting') {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <header className="p-4 flex items-center justify-between border-b border-slate-700">
          <Link
            to="/room"
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </Link>
          <div className="text-center">
            <div className="text-sm text-gray-400">
              Série de {roomState.seriesCount} mots
            </div>
            <div className="text-xs text-gray-500">
              {roomState.wordLength} lettres
            </div>
          </div>
          <div className="w-20" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Room code */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-8 text-center">
            <div className="text-sm text-gray-400 mb-2">Code de la room</div>
            <button
              onClick={copyCode}
              className="flex items-center gap-3 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors mx-auto"
            >
              <span className="text-3xl font-mono font-bold text-white tracking-widest">
                {code}
              </span>
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              {copied ? 'Copié !' : 'Cliquez pour copier'}
            </p>
          </div>

          {/* Players list */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 w-full max-w-md mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold text-white">
                Joueurs ({roomState.players.length})
              </h2>
            </div>
            <div className="space-y-2">
              {roomState.players.map((player) => (
                <div
                  key={player.odI}
                  className={`flex items-center gap-3 p-3 rounded-lg ${player.odI === playerId
                    ? 'bg-pink-500/20 border border-pink-500/30'
                    : 'bg-slate-700/50'
                    }`}
                >
                  {player.odI === roomState.hostId && (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className="text-white font-medium">{player.name}</span>
                  {player.odI === playerId && (
                    <span className="text-xs text-pink-400 ml-auto">
                      (vous)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={roomState.players.length < 1}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                <Play className="w-5 h-5" />
                Commencer
              </button>
            ) : (
              <div className="px-6 py-3 bg-slate-700 text-gray-400 rounded-xl">
                En attente de l'hôte...
              </div>
            )}
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </main>
      </div>
    )
  }

  // PLAYING STATE - Player finished, waiting for others
  if (roomState.state === 'playing' && myPlayer?.finished && ranking) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <header className="p-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span className="text-xl font-bold text-white">
              Classement en cours
            </span>
          </div>
          {roomState.startTime && (
            <Timer startTime={roomState.startTime} running={false} />
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Success message */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Série terminée !
            </h2>
            <p className="text-gray-400">En attente des autres joueurs...</p>
          </div>

          {/* Current ranking */}
          <div className="w-full max-w-md mb-8">
            <div className="space-y-3">
              {ranking.ranking.map((player, index) => (
                <div
                  key={player.odI}
                  className={`flex items-center gap-4 p-4 rounded-xl ${player.finished
                    ? index === 0
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : index === 1
                        ? 'bg-gray-400/20 border border-gray-400/50'
                        : index === 2
                          ? 'bg-amber-600/20 border border-amber-600/50'
                          : 'bg-green-500/20 border border-green-500/50'
                    : 'bg-slate-700/50 opacity-60'
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${player.finished
                      ? index === 0
                        ? 'bg-yellow-500 text-black'
                        : index === 1
                          ? 'bg-gray-400 text-black'
                          : index === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-green-500 text-white'
                      : 'bg-slate-600 text-white'
                      }`}
                  >
                    {player.finished ? index + 1 : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {player.name}
                    </div>
                    <div className="text-sm text-gray-400">
                      {player.finished ? player.formattedTime : 'En cours...'}
                    </div>
                  </div>
                  {player.odI === playerId && (
                    <span className="text-xs text-pink-400">(vous)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Players progress */}
          <div className="flex justify-center gap-4 flex-wrap">
            {roomState.players.map((player) => (
              <div
                key={player.odI}
                className={`px-3 py-1 rounded-full text-sm ${player.finished
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-700 text-gray-400'
                  }`}
              >
                {player.name}{' '}
                {player.finished
                  ? '✓'
                  : `(${player.wordIndex + 1}/${roomState.seriesCount})`}
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // PLAYING STATE - Player still playing
  if (roomState.state === 'playing' && currentWord) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="text-center">
            <div className="text-sm text-gray-400">
              Mot {currentWord.wordIndex + 1}/{currentWord.totalWords}
            </div>
          </div>
          {roomState.startTime && (
            <Timer
              startTime={roomState.startTime}
              running={!myPlayer?.finished}
            />
          )}
        </header>

        {/* Error toast */}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}

        <main className="flex-1 flex flex-col items-center justify-center gap-8 p-4">
          <Grid
            attempts={attempts}
            currentGuess={currentGuess}
            wordLength={currentWord.word.length}
            firstLetter={currentWord.firstLetter}
            foundLetters={foundLetters}
            animatingRow={animatingRow}
          />
          <Keyboard
            onKey={(key) => (key === 'ENTER' ? submitGuess() : handleKey(key))}
            keyboardState={keyboardState}
            disabled={false}
          />
        </main>

        {/* Players status */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex justify-center gap-4 flex-wrap">
            {roomState.players.map((player) => (
              <div
                key={player.odI}
                className={`px-3 py-1 rounded-full text-sm ${player.finished
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-700 text-gray-400'
                  }`}
              >
                {player.name}{' '}
                {player.finished
                  ? '✓'
                  : `(${player.wordIndex + 1}/${roomState.seriesCount})`}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // FINISHED STATE
  if (roomState.state === 'finished' && ranking) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        <header className="p-4 flex items-center justify-center border-b border-slate-700">
          <Trophy className="w-6 h-6 text-yellow-400 mr-2" />
          <span className="text-xl font-bold text-white">Résultats</span>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Podium */}
          <div className="w-full max-w-md mb-8">
            <div className="space-y-3">
              {ranking.ranking.map((player, index) => (
                <div
                  key={player.odI}
                  className={`flex items-center gap-4 p-4 rounded-xl ${index === 0
                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                    : index === 1
                      ? 'bg-gray-400/20 border border-gray-400/50'
                      : index === 2
                        ? 'bg-amber-600/20 border border-amber-600/50'
                        : 'bg-slate-700/50'
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0
                      ? 'bg-yellow-500 text-black'
                      : index === 1
                        ? 'bg-gray-400 text-black'
                        : index === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {player.name}
                    </div>
                    <div className="text-sm text-gray-400">
                      {player.finished ? player.formattedTime : 'DNF'}
                    </div>
                  </div>
                  {player.odI === playerId && (
                    <span className="text-xs text-pink-400">(vous)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Words reveal */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 w-full max-w-md mb-8">
            <h3 className="text-sm text-gray-400 mb-3">Mots de la série</h3>
            <div className="flex flex-wrap gap-2">
              {ranking.words.map((word, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-slate-700 rounded-lg text-white font-mono"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleRestart}
              className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-colors ${isHost
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-slate-700 text-gray-400 cursor-default'
                }`}
            >
              <RotateCcw className="w-5 h-5" />
              {isHost ? 'Nouvelle partie' : 'En attente...'}
            </button>
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Quitter
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Loading or unknown state
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-white text-xl">Chargement...</div>
    </div>
  )
}
