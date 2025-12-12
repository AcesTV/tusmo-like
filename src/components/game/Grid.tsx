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

export function Tile({
  letter,
  status,
  isFirstLetter,
  isPlaceholder,
  animate,
  flipDelay = 0,
}: TileProps) {
  // Get inline styles using CSS variables
  const getStatusStyles = (): React.CSSProperties => {
    if (animate) {
      // During animation, set the target colors for the flip reveal
      const statusMap: Record<TileStatus, { bg: string; border: string }> = {
        correct: { bg: 'var(--tile-correct)', border: 'var(--tile-correct)' },
        present: { bg: 'var(--tile-present)', border: 'var(--tile-present)' },
        absent: { bg: 'var(--tile-absent)', border: 'var(--tile-absent)' },
        empty: {
          bg: 'var(--tile-empty-bg)',
          border: 'var(--tile-empty-border)',
        },
        filled: {
          bg: 'var(--tile-filled-bg)',
          border: 'var(--tile-filled-border)',
        },
      }
      const colors = statusMap[status]
      return {
        animationDelay: `${flipDelay}ms`,
        '--tile-result-bg': colors.bg,
        '--tile-result-border': colors.border,
      } as React.CSSProperties
    }

    // Non-animated states use inline styles with CSS variables
    if (isFirstLetter) {
      return {
        backgroundColor: 'var(--tile-correct)',
        borderColor: 'var(--tile-correct)',
        color: 'white',
      }
    }
    if (isPlaceholder) {
      return {
        backgroundColor: 'var(--tile-placeholder-bg)',
        borderColor: 'var(--tile-placeholder-border)',
        color: 'var(--tile-placeholder-text)',
      }
    }

    const styleMap: Record<TileStatus, React.CSSProperties> = {
      correct: {
        backgroundColor: 'var(--tile-correct)',
        borderColor: 'var(--tile-correct)',
        color: 'white',
      },
      present: {
        backgroundColor: 'var(--tile-present)',
        borderColor: 'var(--tile-present)',
        color: 'white',
      },
      absent: {
        backgroundColor: 'var(--tile-absent)',
        borderColor: 'var(--tile-absent)',
        color: 'white',
      },
      empty: {
        backgroundColor: 'var(--tile-empty-bg)',
        borderColor: 'var(--tile-empty-border)',
        color: 'var(--muted-foreground)',
      },
      filled: {
        backgroundColor: 'var(--tile-filled-bg)',
        borderColor: 'var(--tile-filled-border)',
        color: 'white',
        transform: 'scale(1.05)',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
    }
    return styleMap[status]
  }

  return (
    <div
      className={cn(
        'w-12 h-12 md:w-14 md:h-14 flex items-center justify-center',
        'text-xl md:text-2xl font-bold uppercase rounded-lg border-2',
        'transition-all duration-200',
        animate && 'animate-flip tile-animating',
      )}
      style={getStatusStyles()}
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
