'use client'

import { cn } from '@workspace/ui/lib/utils'
import {
    Flame,
    Calendar,
    TrendingUp,
    Trophy,
    Star,
    BookOpen,
    Target,
    GraduationCap,
    Award,
    Zap,
    Heart,
    Lock
} from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'

interface AchievementCardProps {
    achievement: {
        id: string
        isUnlocked: boolean
        unlockedAt: string | null
        progress: any
        achievement: {
            code: string
            title: string
            description: string
            icon: string | null
            category: string
        }
    }
}

const ICON_MAP: Record<string, any> = {
    Flame,
    Calendar,
    TrendingUp,
    Trophy,
    Star,
    BookOpen,
    Target,
    GraduationCap,
    Award,
    Zap,
    Heart,
}

export function AchievementCard({ achievement }: AchievementCardProps) {
    const { isUnlocked, unlockedAt, achievement: def } = achievement
    const IconComponent = def.icon && ICON_MAP[def.icon] ? ICON_MAP[def.icon] : Trophy

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 border shadow-none",
                isUnlocked
                    ? "bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                    : "bg-muted/30 border-dashed opacity-70 grayscale"
            )}
        >
            <CardContent className="p-5">

                <div className="flex items-start gap-4">
                    <div
                        className={cn(
                            "flex size-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 border overflow-hidden",
                            isUnlocked
                                ? "bg-primary/10 text-primary border-primary/20 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
                                : "bg-muted text-muted-foreground/50 border-transparent"
                        )}
                    >
                        {isUnlocked ? (
                            def.icon && def.icon.startsWith('http') ? (
                                <img src={def.icon} alt={def.title} className="size-full object-contain p-2" />
                            ) : (() => {
                                const Icon = def.icon && ICON_MAP[def.icon] ? ICON_MAP[def.icon] : Trophy;
                                return <Icon className="size-6" />;
                            })()
                        ) : (
                            <Lock className="size-5" />
                        )}
                    </div>

                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className={cn(
                                "text-sm font-bold transition-colors",
                                isUnlocked ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {def.title}
                            </h4>
                            {isUnlocked && (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider">
                                    Đã mở
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {def.description}
                        </p>

                        <div className="pt-2">
                            {isUnlocked && unlockedAt ? (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                    Đạt được vào {format(new Date(unlockedAt), 'dd/MM/yyyy')}
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden border border-border/50">
                                        <div className="h-full bg-muted-foreground/20 w-1/3 rounded-full" />
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">
                                        Chưa đạt được
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Shine Effect */}
                {isUnlocked && (
                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                )}
            </CardContent>
        </Card>
    )
}
