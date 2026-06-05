'use client'

import { useEffect, useState } from 'react'
import type { LiveSessionResponseDTO } from '@workspace/schemas'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'
import { cn } from '@workspace/ui/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Video } from 'lucide-react'
import { toast } from '@workspace/ui/components/sonner'

import {
    canJoinLiveSessionNow,
    getLiveSessionUiState,
    liveSessionApi,
} from '@/lib/api/services/academy-live-session-api'

const MEET_URL = (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_MEET_URL || 'https://meet.torii.com') : 'https://meet.torii.com')

interface LiveSessionBlockProps {
    liveClassId: string
    /** Compact style for cards/sidebar */
    compact?: boolean
    /** Max sessions to show */
    maxSessions?: number
    className?: string
}

export function LiveSessionBlock({ liveClassId, compact = false, maxSessions = 3, className }: LiveSessionBlockProps) {
    const [sessions, setSessions] = useState<LiveSessionResponseDTO[]>([])
    const [loading, setLoading] = useState(true)
    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30 * 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (!liveClassId) {
            setLoading(false)
            return
        }
        let cancelled = false
        liveSessionApi.getSessions(liveClassId).then((data) => {
            if (!cancelled)
                setSessions(data ?? [])
        }).catch(() => {
            if (!cancelled)
                setSessions([])
        }).finally(() => {
            if (!cancelled)
                setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [liveClassId])

    const upcomingOrLive = sessions
        .filter((s) => getLiveSessionUiState(s, now) !== 'ended')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, maxSessions)

    const handleJoin = async (sessionId: string) => {
        try {
            setJoiningId(sessionId)
            const joinData = await liveSessionApi.joinSession(sessionId)
            const url = `${MEET_URL}?access_token=${joinData.token}`
            window.open(url, '_blank', 'noopener,noreferrer')
            toast.success('Đang mở phòng học...')
        }
        catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể vào phòng học')
        }
        finally {
            setJoiningId(null)
        }
    }

    if (loading) {
        return (
            <div className={cn('flex items-center justify-center py-4 text-muted-foreground', className)}>
                <Spinner className="h-5 w-5 animate-spin" />
            </div>
        )
    }

    if (upcomingOrLive.length === 0) {
        return null
    }

    return (
        <div className={cn('space-y-2', className)}>
            <p className={cn(
                'flex items-center gap-2 font-bold text-foreground',
                compact ? 'text-xs uppercase tracking-widest text-muted-foreground' : 'text-sm',
            )}>
                <Video className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                {compact ? 'Lịch live' : 'Buổi học trực tuyến'}
            </p>
            <ul className={cn('space-y-1.5', compact && 'space-y-1')}>
                {upcomingOrLive.map((session) => {
                    const uiState = getLiveSessionUiState(session, now)
                    const canJoin = canJoinLiveSessionNow(session, now)
                    const isLive = uiState === 'live'
                    return (
                        <li
                            key={session.id}
                            className={cn(
                                'flex items-center justify-between gap-2 rounded-lg border border-border bg-card/50 p-2.5',
                                compact && 'p-2',
                            )}
                        >
                            <div className="min-w-0 flex-1">
                                <p className={cn('truncate font-medium text-foreground', compact && 'text-xs')}>
                                    {session.title}
                                </p>
                                <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
                                    {format(new Date(session.scheduledAt), 'EEE, dd/MM • HH:mm', { locale: vi })} · {session.duration} phút
                                </p>
                            </div>
                            {canJoin && (
                                <Button
                                    size="sm"
                                    className={cn(
                                        'shrink-0 gap-1.5 rounded-lg font-bold',
                                        compact ? 'h-7 px-2 text-[10px]' : 'h-8 px-3 text-xs',
                                    )}
                                    onClick={() => handleJoin(session.id)}
                                    disabled={!!joiningId}
                                >
                                    {joiningId === session.id
                                        ? <Spinner className="h-3.5 w-3.5 animate-spin" />
                                        : <Video className="h-3.5 w-3.5" />}
                                    {isLive ? 'Vào phòng' : 'Sẵn sàng vào'}
                                </Button>
                            )}
                            {!canJoin && uiState === 'scheduled' && (
                                <span className={cn('shrink-0 text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
                                    Sắp diễn ra
                                </span>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
