'use client'

import { useState, useCallback, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { TileStatus } from '@/components/game/Grid'

interface GameState {
    wordLength: number
    firstLetter: string
    currentGuess: string
    attempts: { word: string; result: TileStatus[] }[]
    foundLetters: (string | null)[]
    keyboardState: Record<string, TileStatus>
    gameOver: boolean
    won: boolean
    startTime: number | null
}

export function useGameState(wordLength: number, firstLetter: string, targetWord: string) {
    const [state, setState] = useState<GameState>(() => ({
        wordLength,
        firstLetter,
        currentGuess: firstLetter, // Start with first letter
        attempts: [],
        foundLetters: Array(wordLength).fill(null).map((_, i) => i === 0 ? firstLetter : null),
        keyboardState: {},
        gameOver: false,
        won: false,
        startTime: Date.now(),
    }))

    const submitGuessMutation = useMutation(api.games.submitGuess)

    const handleKey = useCallback((key: string) => {
        if (state.gameOver) return

        setState((prev) => {
            if (key === 'BACKSPACE') {
                // Can't delete first letter
                if (prev.currentGuess.length <= 1) return prev

                const newGuess = prev.currentGuess.slice(0, -1)
                return { ...prev, currentGuess: newGuess }
            }

            if (key === 'ENTER') {
                // Submit is handled separately
                return prev
            }

            // Add letter
            if (/^[A-Z]$/.test(key) && prev.currentGuess.length < prev.wordLength) {
                return { ...prev, currentGuess: prev.currentGuess + key }
            }

            return prev
        })
    }, [state.gameOver])

    const submitGuess = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        if (state.currentGuess.length !== state.wordLength) {
            return { success: false, error: 'Mot incomplet' }
        }

        if (state.gameOver) {
            return { success: false, error: 'Partie terminée' }
        }

        try {
            const result = await submitGuessMutation({
                word: state.currentGuess,
                mode: 'daily',
                targetWord,
            })

            if (!result.valid) {
                return { success: false, error: result.error }
            }

            setState((prev) => {
                const newAttempts = [
                    ...prev.attempts,
                    { word: result.word!, result: result.result! as TileStatus[] },
                ]

                // Update keyboard state
                const newKeyboardState = { ...prev.keyboardState }
                const priority: Record<string, number> = { absent: 1, present: 2, correct: 3 }

                result.word!.split('').forEach((letter, i) => {
                    const status = result.result![i] as TileStatus
                    const current = newKeyboardState[letter]
                    if (!current || priority[status] > priority[current]) {
                        newKeyboardState[letter] = status
                    }
                })

                // Track found letters
                const newFoundLetters = [...prev.foundLetters]
                result.result!.forEach((status, i) => {
                    if (status === 'correct') {
                        result.word!.split('').forEach((letter, idx) => {
                            if (idx === i) {
                                newFoundLetters[i] = letter
                            }
                        })
                    }
                })

                const won = result.won!
                const gameOver = won || newAttempts.length >= 6

                return {
                    ...prev,
                    attempts: newAttempts,
                    keyboardState: newKeyboardState,
                    foundLetters: newFoundLetters,
                    currentGuess: gameOver ? prev.currentGuess : prev.firstLetter,
                    gameOver,
                    won,
                }
            })

            return { success: true }
        } catch (error) {
            return { success: false, error: 'Erreur de connexion' }
        }
    }, [state.currentGuess, state.wordLength, state.gameOver, submitGuessMutation, targetWord])

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

    const reset = useCallback((newWordLength: number, newFirstLetter: string) => {
        setState({
            wordLength: newWordLength,
            firstLetter: newFirstLetter,
            currentGuess: newFirstLetter,
            attempts: [],
            foundLetters: Array(newWordLength).fill(null).map((_, i) => i === 0 ? newFirstLetter : null),
            keyboardState: {},
            gameOver: false,
            won: false,
            startTime: Date.now(),
        })
    }, [])

    return {
        state,
        handleKey,
        submitGuess,
        reset,
    }
}
