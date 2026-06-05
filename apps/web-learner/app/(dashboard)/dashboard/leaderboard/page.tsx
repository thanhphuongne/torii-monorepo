'use client'

import { useState } from 'react'
import { useLeaderboard } from '@/lib/api/services/gamification-api'
import { PageLoading } from '@workspace/ui/components/page-loading'
import { useAppSelector } from '@/hooks/hooks'

// Import extracted components
import {
    LeaderboardHeader,
    PodiumCard,
    CurrentUserRank,
    LeaderboardTable
} from '@/components/leaderboard'

export default function LeaderboardPage() {
    const [leaderboardType, setLeaderboardType] = useState<'global' | 'streak' | 'active'>('global')
    const { data: leaderboard, isLoading } = useLeaderboard(leaderboardType)
    const { user: currentUser } = useAppSelector((state) => state.auth)

    if (isLoading) {
        return <PageLoading />
    }

    const topThree = leaderboard?.users?.slice(0, 3) || []
    const others = leaderboard?.users?.slice(3) || []

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-8">
            <LeaderboardHeader
                type={leaderboardType}
                onTypeChange={setLeaderboardType}
            />

            {/* Podium: 2 | 1 | 3 */}
            <div className="mb-6 overflow-x-auto md:mb-8">
                <div className="grid min-w-[320px] grid-cols-3 items-end gap-1.5 sm:gap-3 md:gap-4">
                    {topThree.length >= 2 && (
                        <PodiumCard
                            user={topThree[1]!}
                            rank={2}
                            isCurrentUser={topThree[1]!.id === currentUser?.id}
                            type={leaderboardType as 'global' | 'streak' | 'active'}
                        />
                    )}
                    {topThree.length >= 1 && (
                        <PodiumCard
                            user={topThree[0]!}
                            rank={1}
                            isCurrentUser={topThree[0]!.id === currentUser?.id}
                            type={leaderboardType as 'global' | 'streak' | 'active'}
                        />
                    )}
                    {topThree.length >= 3 && (
                        <PodiumCard
                            user={topThree[2]!}
                            rank={3}
                            isCurrentUser={topThree[2]!.id === currentUser?.id}
                            type={leaderboardType as 'global' | 'streak' | 'active'}
                        />
                    )}
                </div>
            </div>

            {/* Current User Summary Card */}
            {leaderboard?.currentUser && (
                <CurrentUserRank
                    user={leaderboard.currentUser}
                    type={leaderboardType as 'global' | 'streak' | 'active'}
                />
            )}

            {/* Leaderboard Table */}
            <LeaderboardTable
                users={others}
                currentUserId={currentUser?.id}
                type={leaderboardType as 'global' | 'streak' | 'active'}
            />
        </div>
    )
}
