'use client'

import { useEffect, useState } from 'react'

interface TimerProps {
    startTime: number | null
    running?: boolean
}

export function Timer({ startTime, running = true }: TimerProps) {
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
        if (!startTime || !running) return

        const interval = setInterval(() => {
            setElapsed(Date.now() - startTime)
        }, 1000)

        return () => clearInterval(interval)
    }, [startTime, running])

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className="text-xl font-mono font-bold text-cyan-400">
            {formatTime(elapsed)}
        </div>
    )
}
