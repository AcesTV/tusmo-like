'use client'

import { cn } from '@/lib/utils'

export type TileStatus = 'correct' | 'present' | 'absent' | 'empty' | 'filled'

interface TileProps {
    letter: string
    status: TileStatus
    isFirstLetter?: boolean
    isPlaceholder?: boolean
    animate?: boolean
}

export function Tile({
    letter,
    status,
    isFirstLetter,
    isPlaceholder,
    animate,
}: TileProps) {
    return (
        <div
            className={cn(
                'w-12 h-12 md:w-14 md:h-14 flex items-center justify-center',
                'text-xl md:text-2xl font-bold uppercase rounded-lg border-2',
                'transition-all duration-200',
                // Default state
                status === 'empty' && 'bg-slate-800 border-slate-600',
                status === 'filled' && 'bg-slate-800 border-slate-400',
                // Result states
                status === 'correct' && 'bg-green-500 border-green-500 text-white',
                status === 'present' && 'bg-yellow-500 border-yellow-500 text-white',
                status === 'absent' && 'bg-slate-600 border-slate-600 text-white',
                // First letter
                isFirstLetter && 'bg-green-500 border-green-500 text-white',
                // Placeholder
                isPlaceholder &&
                'bg-green-500/30 border-green-500/50 text-white/60',
                // Animation
                animate && 'animate-flip'
            )}
        >
            {letter}
        </div>
    )
}

interface GridProps {
    attempts: { word: string; result: TileStatus[] }[]
    currentGuess: string
    wordLength: number
    firstLetter: string
    foundLetters: (string | null)[]
    maxAttempts?: number
}

export function Grid({
    attempts,
    currentGuess,
    wordLength,
    firstLetter,
    foundLetters,
    maxAttempts = 6,
}: GridProps) {
    const rows: JSX.Element[] = []

    for (let row = 0; row < maxAttempts; row++) {
        const tiles: JSX.Element[] = []

        for (let col = 0; col < wordLength; col++) {
            let letter = ''
            let status: TileStatus = 'empty'
            let isFirstLetter = false
            let isPlaceholder = false

            if (row < attempts.length) {
                // Completed row
                letter = attempts[row].word[col]
                status = attempts[row].result[col]
            } else if (row === attempts.length) {
                // Current row
                if (col < currentGuess.length) {
                    letter = currentGuess[col]
                    status = 'filled'
                } else if (col === 0) {
                    letter = firstLetter
                    isFirstLetter = true
                } else if (foundLetters[col]) {
                    letter = foundLetters[col]!
                    isPlaceholder = true
                }
            } else {
                // Future row - show first letter only on first column
                if (col === 0) {
                    letter = firstLetter
                    isFirstLetter = true
                }
            }

            tiles.push(
                <Tile
                    key={col}
                    letter={letter}
                    status={status}
                    isFirstLetter={isFirstLetter}
                    isPlaceholder={isPlaceholder}
                />
            )
        }

        rows.push(
            <div key={row} className="flex gap-1.5 md:gap-2">
                {tiles}
            </div>
        )
    }

    return <div className="flex flex-col gap-1.5 md:gap-2">{rows}</div>
}
