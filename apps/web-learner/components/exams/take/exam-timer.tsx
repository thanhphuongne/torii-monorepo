'use client'

import { useState, useEffect } from 'react'
import { Progress } from "@workspace/ui/components/progress"
import { Clock } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

interface ExamTimerProps {
    durationMinutes: number
    initialSeconds?: number // For resume - start from this time instead
    onTimeUp: () => void
    onTimeUpdate?: (seconds: number) => void // Callback to update parent with current time
}

export function ExamTimer({ durationMinutes, initialSeconds, onTimeUp, onTimeUpdate }: ExamTimerProps) {
    const [timeLeft, setTimeLeft] = useState(initialSeconds ?? durationMinutes * 60)

    // Sync timeLeft with initialSeconds when it changes (e.g., when resuming)
    useEffect(() => {
        if (initialSeconds !== undefined && initialSeconds !== timeLeft) {
            setTimeLeft(initialSeconds)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSeconds]) // Only depend on initialSeconds, not timeLeft to avoid infinite loop

    useEffect(() => {
        if (onTimeUpdate) {
            onTimeUpdate(timeLeft)
        }
    }, [timeLeft, onTimeUpdate])

    useEffect(() => {
        if (timeLeft <= 0) {
            onTimeUp()
            return
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, onTimeUp])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const progress = (timeLeft / (durationMinutes * 60)) * 100
    const isUrgent = timeLeft < 300 // Last 5 mins

    return (
        <div className="flex items-center gap-4 min-w-[200px]">
            <div className={cn(
                "flex items-center gap-2 text-xl font-bold uppercase tracking-widest tabular-nums",
                isUrgent ? "text-destructive animate-pulse" : "text-foreground"
            )}>
                <Clock className="w-5 h-5" />
                {formatTime(timeLeft)}
            </div>
            <div className="flex-1 w-32 hidden sm:block">
                <Progress
                    value={progress}
                    className="h-2 bg-muted/20"
                    indicatorClassName={isUrgent ? "bg-destructive transition-colors duration-500" : "bg-primary transition-colors duration-500"}
                />
            </div>
        </div>
    )
}
