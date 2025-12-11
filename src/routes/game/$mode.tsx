'use client'

import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '../../../convex/_generated/api'
import { Grid, type TileStatus } from '@/components/game/Grid'
import { Keyboard } from '@/components/game/Keyboard'
import { Timer } from '@/components/game/Timer'
import { ArrowLeft, RotateCcw, Clock, Target } from 'lucide-react'

export const Route = createFileRoute('/game/$mode')({
    component: GamePage,
})

// Get or create a guest/player ID for tracking
function getGuestId(): string {
    if (typeof window === 'undefined') return ''
    let id = localStorage.getItem('tusmo_playerId')
    if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem('tusmo_playerId', id)
    }
    return id
}

function getPlayerName(): string {
    if (typeof window === 'undefined') return 'Joueur'
    return localStorage.getItem('tusmo_playerName') || 'Joueur'
}

function GamePage() {
    const { mode } = useParams({ from: '/game/$mode' })
    const dailyInfo = useQuery(api.games.getDailyInfo)
    const submitGuessMutation = useMutation(api.games.submitGuess)
    const saveDailyCompletionMutation = useMutation(api.games.saveDailyCompletion)

    // Guest ID for tracking
    const [guestId, setGuestId] = useState('')
    const completionSaved = useRef(false)

    // Stats tracking
    const updateStatsMutation = useMutation(api.stats.updateStats)
    const [playerId, setPlayerId] = useState<string>('')
    const [playerName, setPlayerName] = useState<string>('Joueur')

    // Check if already completed today (for daily/suite modes)
    const dailyCompletion = useQuery(
        api.games.getDailyCompletion,
        mode === 'daily' || mode === 'suite'
            ? { mode, guestId: guestId || 'loading' }
            : 'skip'
    )

    useEffect(() => {
        const id = getGuestId()
        setGuestId(id)
        setPlayerId(id)
        setPlayerName(getPlayerName())
    }, [])

    // For free mode - word length selector
    const [freeLength, setFreeLength] = useState(6)
    const randomWord = useQuery(
        api.games.getRandomWord,
        mode === 'free' ? { length: freeLength } : 'skip'
    )

    // Game state
    const [wordLength, setWordLength] = useState(6)
    const [firstLetter, setFirstLetter] = useState('T')
    const [targetWord, setTargetWord] = useState('')
    const [currentGuess, setCurrentGuess] = useState('')
    const [attempts, setAttempts] = useState<{ word: string; result: TileStatus[] }[]>([])
    const [foundLetters, setFoundLetters] = useState<(string | null)[]>([])
    const [keyboardState, setKeyboardState] = useState<Record<string, TileStatus>>({})
    const [gameOver, setGameOver] = useState(false)
    const [won, setWon] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [suiteIndex, setSuiteIndex] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Get daily word for validation
    const dailyWord = useQuery(
        api.games.getDailyWord,
        mode === 'daily' || mode === 'suite'
            ? { mode, wordIndex: mode === 'suite' ? suiteIndex : undefined }
            : 'skip'
    )

    // Initialize game
    useEffect(() => {
        if (mode === 'daily' && dailyInfo) {
            setWordLength(dailyInfo.daily.length)
            setFirstLetter(dailyInfo.daily.firstLetter)
            setCurrentGuess(dailyInfo.daily.firstLetter)
            setFoundLetters(
                Array(dailyInfo.daily.length)
                    .fill(null)
                    .map((_, i) => (i === 0 ? dailyInfo.daily.firstLetter : null))
            )
            setStartTime(Date.now())
            setLoading(false)
        } else if (mode === 'suite' && dailyInfo) {
            const word = dailyInfo.suite.words[suiteIndex]
            if (word) {
                setWordLength(word.length)
                setFirstLetter(word.firstLetter)
                setCurrentGuess(word.firstLetter)
                setFoundLetters(
                    Array(word.length)
                        .fill(null)
                        .map((_, i) => (i === 0 ? word.firstLetter : null))
                )
                if (!startTime) setStartTime(Date.now())
                setLoading(false)
            }
        } else if (mode === 'free' && randomWord) {
            setWordLength(randomWord.length)
            setFirstLetter(randomWord.firstLetter)
            setTargetWord(randomWord.word)
            setCurrentGuess(randomWord.firstLetter)
            setFoundLetters(
                Array(randomWord.length)
                    .fill(null)
                    .map((_, i) => (i === 0 ? randomWord.firstLetter : null))
            )
            setStartTime(Date.now())
            setLoading(false)
        }
    }, [mode, dailyInfo, randomWord, suiteIndex, startTime])

    // Set target word from daily query
    useEffect(() => {
        if (dailyWord) {
            setTargetWord(dailyWord)
        }
    }, [dailyWord])

    const handleKey = useCallback(
        (key: string) => {
            if (gameOver) return
            setError(null)

            if (key === 'BACKSPACE') {
                if (currentGuess.length > 1) {
                    setCurrentGuess((prev) => prev.slice(0, -1))
                }
            } else if (key === 'ENTER') {
                // Submit will be handled by submitGuess
            } else if (/^[A-Z]$/.test(key) && currentGuess.length < wordLength) {
                setCurrentGuess((prev) => prev + key)
            }
        },
        [gameOver, currentGuess, wordLength]
    )

    const submitGuess = useCallback(async () => {
        if (currentGuess.length !== wordLength) {
            setError('Mot incomplet')
            return
        }

        try {
            const result = await submitGuessMutation({
                word: currentGuess,
                mode,
                targetWord,
            })

            if (!result.valid) {
                setError(result.error || 'Mot invalide')
                return
            }

            const newAttempt = { word: result.word!, result: result.result! as TileStatus[] }
            setAttempts((prev) => [...prev, newAttempt])

            // Update keyboard
            const newKeyboardState = { ...keyboardState }
            const priority: Record<string, number> = { absent: 1, present: 2, correct: 3 }
            result.word!.split('').forEach((letter, i) => {
                const status = result.result![i] as TileStatus
                const current = newKeyboardState[letter]
                if (!current || priority[status] > priority[current]) {
                    newKeyboardState[letter] = status
                }
            })
            setKeyboardState(newKeyboardState)

            // Update found letters
            setFoundLetters((prev) => {
                const newFound = [...prev]
                result.result!.forEach((status, i) => {
                    if (status === 'correct') {
                        newFound[i] = result.word![i]
                    }
                })
                return newFound
            })

            if (result.won) {
                setWon(true)
                if (mode === 'suite' && suiteIndex < (dailyInfo?.suite.totalWords ?? 5) - 1) {
                    // Move to next word in suite
                    setTimeout(() => {
                        setSuiteIndex((prev) => prev + 1)
                        setAttempts([])
                        setKeyboardState({})
                        setGameOver(false)
                        setWon(false)
                    }, 1500)
                } else {
                    // Game won - update stats
                    setGameOver(true)
                    const wordsFound = mode === 'suite' ? (dailyInfo?.suite.totalWords ?? 5) : 1
                    if (playerId) {
                        updateStatsMutation({
                            odI: playerId,
                            name: playerName,
                            mode,
                            won: true,
                            wordsFound,
                            date: new Date().toISOString().split('T')[0],
                        })
                    }
                }
            } else if (attempts.length + 1 >= 6) {
                // Game lost - update stats
                setGameOver(true)
                const wordsFound = mode === 'suite' ? suiteIndex : 0 // Partial words found in suite
                if (playerId) {
                    updateStatsMutation({
                        odI: playerId,
                        name: playerName,
                        mode,
                        won: false,
                        wordsFound,
                        date: new Date().toISOString().split('T')[0],
                    })
                }
            } else {
                setCurrentGuess(firstLetter)
            }
        } catch (e) {
            setError('Erreur de connexion')
        }
    }, [
        currentGuess,
        wordLength,
        submitGuessMutation,
        updateStatsMutation,
        mode,
        targetWord,
        keyboardState,
        attempts,
        firstLetter,
        suiteIndex,
        dailyInfo,
        playerId,
        playerName,
    ])

    // Physical keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
    }, [handleKey, submitGuess])

    const restart = () => {
        if (mode === 'free') {
            window.location.reload() // Get new random word
        }
    }

    // Save completion when game ends (for daily/suite)
    useEffect(() => {
        if (gameOver && (mode === 'daily' || mode === 'suite') && guestId && startTime && !completionSaved.current) {
            completionSaved.current = true
            const time = Date.now() - startTime
            saveDailyCompletionMutation({
                mode,
                guestId,
                won,
                time,
                attempts: attempts.map(a => ({ word: a.word, result: a.result })),
            })
        }
    }, [gameOver, mode, guestId, startTime, won, attempts, saveDailyCompletionMutation])

    const modeLabels: Record<string, string> = {
        daily: 'Mot du Jour',
        suite: 'Suite du Jour',
        free: 'Partie Libre',
    }

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    // Show "already completed" screen for daily/suite modes
    if ((mode === 'daily' || mode === 'suite') && dailyCompletion?.completed) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
                <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Retour</span>
                    </Link>
                    <div className="text-center">
                        <div className="text-sm text-gray-400">{modeLabels[mode]}</div>
                    </div>
                    <div className="w-20" />
                </header>

                <main className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
                    <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
                        <div className="text-6xl mb-4">{dailyCompletion.won ? '🏆' : '✅'}</div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {dailyCompletion.won ? 'Félicitations !' : 'Défi terminé'}
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Vous avez déjà joué le {modeLabels[mode].toLowerCase()} aujourd'hui.
                        </p>

                        <div className="flex justify-center gap-6 mb-6">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 text-cyan-400 mb-1">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-mono text-xl">{formatTime(dailyCompletion.time || 0)}</span>
                                </div>
                                <div className="text-xs text-gray-500">Temps</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 text-orange-400 mb-1">
                                    <Target className="w-5 h-5" />
                                    <span className="font-mono text-xl">{dailyCompletion.attempts}</span>
                                </div>
                                <div className="text-xs text-gray-500">Essais</div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 mb-6">
                            Revenez demain pour un nouveau défi !
                        </p>

                        <Link
                            to="/"
                            className="inline-block px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            Retour au menu
                        </Link>
                    </div>
                </main>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white text-xl">Chargement...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                    <span>Retour</span>
                </Link>
                <div className="text-center">
                    <div className="text-sm text-gray-400">{modeLabels[mode]}</div>
                    {mode === 'suite' && (
                        <div className="text-xs text-gray-500">
                            Mot {suiteIndex + 1}/{dailyInfo?.suite.totalWords ?? 5}
                        </div>
                    )}
                </div>
                <Timer startTime={startTime} running={!gameOver} />
            </header>

            {/* Error toast */}
            {error && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    {error}
                </div>
            )}

            {/* Game area */}
            <main className="flex-1 flex flex-col items-center justify-center gap-8 p-4">
                <Grid
                    attempts={attempts}
                    currentGuess={currentGuess}
                    wordLength={wordLength}
                    firstLetter={firstLetter}
                    foundLetters={foundLetters}
                />

                <Keyboard
                    onKey={(key) => (key === 'ENTER' ? submitGuess() : handleKey(key))}
                    keyboardState={keyboardState}
                    disabled={gameOver}
                />
            </main>

            {/* Game over modal */}
            {gameOver && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
                        <h2 className="text-3xl font-bold mb-4">
                            {won ? '🎉 Bravo!' : '😔 Perdu'}
                        </h2>
                        <p className="text-gray-400 mb-4">
                            {won
                                ? `Trouvé en ${attempts.length} essai${attempts.length > 1 ? 's' : ''}!`
                                : `Le mot était: ${targetWord}`}
                        </p>

                        {/* Word display */}
                        <div className="flex justify-center gap-1 mb-6">
                            {targetWord.split('').map((letter, i) => (
                                <div
                                    key={i}
                                    className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold"
                                >
                                    {letter}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 justify-center">
                            {mode === 'free' && (
                                <button
                                    onClick={restart}
                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Rejouer
                                </button>
                            )}
                            <Link
                                to="/"
                                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                            >
                                Menu
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
