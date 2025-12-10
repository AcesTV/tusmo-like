'use client'

import { cn } from '@/lib/utils'
import type { TileStatus } from './Grid'

interface KeyboardProps {
    onKey: (key: string) => void
    keyboardState: Record<string, TileStatus>
    disabled?: boolean
}

const ROWS = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'BACKSPACE'],
]

export function Keyboard({ onKey, keyboardState, disabled }: KeyboardProps) {
    const handleClick = (key: string) => {
        if (!disabled) {
            onKey(key)
        }
    }

    return (
        <div className="flex flex-col gap-1.5 items-center">
            {ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                    {row.map((key) => {
                        const status = keyboardState[key]
                        const isWide = key === 'ENTER' || key === 'BACKSPACE'
                        const displayKey = key === 'BACKSPACE' ? '⌫' : key === 'ENTER' ? 'ENTRÉE' : key

                        return (
                            <button
                                key={key}
                                onClick={() => handleClick(key)}
                                disabled={disabled}
                                className={cn(
                                    'h-12 md:h-14 rounded-lg font-semibold text-sm transition-all',
                                    'active:scale-95 disabled:opacity-50',
                                    isWide ? 'px-3 md:px-4 min-w-16 md:min-w-20' : 'w-8 md:w-10',
                                    // Default
                                    !status && 'bg-slate-600 hover:bg-slate-500 text-white',
                                    // States
                                    status === 'correct' && 'bg-green-500 text-white',
                                    status === 'present' && 'bg-yellow-500 text-white',
                                    status === 'absent' && 'bg-slate-700 text-slate-400'
                                )}
                            >
                                {displayKey}
                            </button>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
