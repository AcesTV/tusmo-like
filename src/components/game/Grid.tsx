'use client'

import { cn } from '@/lib/utils'
import { JSX } from 'react'

export type TileStatus = 'correct' | 'present' | 'absent' | 'empty' | 'filled'

interface TileProps {
  letter: string
  status: TileStatus
  isFirstLetter?: boolean
  isPlaceholder?: boolean
  animate?: boolean
  flipDelay?: number
}

// Map status to CSS custom property values for the reveal animation
const statusColors: Record<TileStatus, { bg: string; border: string }> = {
  correct: { bg: 'rgb(34 197 94)', border: 'rgb(34 197 94)' }, // green-500
  present: { bg: 'rgb(234 179 8)', border: 'rgb(234 179 8)' }, // yellow-500
  absent: { bg: 'rgb(71 85 105)', border: 'rgb(71 85 105)' }, // slate-600
  empty: { bg: 'transparent', border: 'transparent' },
  filled: { bg: 'rgb(51 65 85)', border: 'rgb(34 211 238)' }, // slate-700, cyan-400
}

export function Tile({
  letter,
  status,
  isFirstLetter,
  isPlaceholder,
  animate,
  flipDelay = 0,
}: TileProps) {
  const colors = statusColors[status]

  return (
    <div
      className={cn(
        'w-12 h-12 md:w-14 md:h-14 flex items-center justify-center',
        'text-xl md:text-2xl font-bold uppercase rounded-lg border-2',
        // During animation: start with neutral gray, CSS will reveal the color
        animate && 'animate-flip tile-animating',
        // Non-animated states
        !animate && status === 'empty' && 'bg-slate-800/50 border-slate-600/50 text-slate-600',
        !animate && status === 'filled' && 'bg-slate-700 border-cyan-400 text-white scale-105 shadow-lg shadow-cyan-500/20',
        !animate && status === 'correct' && 'bg-green-500 border-green-500 text-white',
        !animate && status === 'present' && 'bg-yellow-500 border-yellow-500 text-white',
        !animate && status === 'absent' && 'bg-slate-600 border-slate-600 text-white',
        !animate && isFirstLetter && 'bg-green-500 border-green-500 text-white',
        !animate && isPlaceholder && 'bg-green-600/40 border-green-500/60 text-green-300',
        // Animated: always white text
        animate && 'text-white',
      )}
      style={animate ? {
        animationDelay: `${flipDelay}ms`,
        '--tile-result-bg': colors.bg,
        '--tile-result-border': colors.border,
      } as React.CSSProperties : undefined}
    >
      <span
        className="tile-content"
        style={animate ? { animationDelay: `${flipDelay}ms` } : undefined}
      >
        {letter}
      </span>
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
  animatingRow?: number | null
}

export function Grid({
  attempts,
  currentGuess,
  wordLength,
  firstLetter,
  foundLetters,
  maxAttempts = 6,
  animatingRow = null,
}: GridProps) {
  const rows: JSX.Element[] = []

  for (let row = 0; row < maxAttempts; row++) {
    const tiles: JSX.Element[] = []
    const shouldAnimate = animatingRow === row

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
          // Check if this letter matches a confirmed position (foundLetter)
          if (
            foundLetters[col] &&
            currentGuess[col].toUpperCase() === foundLetters[col]!.toUpperCase()
          ) {
            isFirstLetter = true // Use green styling for correct position
          } else {
            status = 'filled'
          }
        } else if (col === 0) {
          letter = firstLetter
          isFirstLetter = true
        } else if (foundLetters[col]) {
          letter = foundLetters[col]!
          isPlaceholder = true
        }
      } else {
        // Future row - keep empty, don't show first letter
      }

      tiles.push(
        <Tile
          key={col}
          letter={letter}
          status={status}
          isFirstLetter={isFirstLetter}
          isPlaceholder={isPlaceholder}
          animate={shouldAnimate}
          flipDelay={col * 60}
        />,
      )
    }

    rows.push(
      <div key={row} className="flex gap-1.5 md:gap-2">
        {tiles}
      </div>,
    )
  }

  return <div className="flex flex-col gap-1.5 md:gap-2">{rows}</div>
}
