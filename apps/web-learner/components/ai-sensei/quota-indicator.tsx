"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { agentApi } from "@/lib/api/services/agent-api"
import { Progress } from "@workspace/ui/components/progress"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { Zap, Star, Crown, ChevronRight, Calendar } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { formatDistanceToNow, differenceInDays } from "date-fns"
import { vi } from "date-fns/locale"

export function QuotaIndicator() {
    const { data: quota, isLoading } = useQuery({
        queryKey: ["quota-status"],
        queryFn: () => agentApi.sensei.getQuotaStatus(),
        refetchOnWindowFocus: true,
    })

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border bg-muted/20 animate-pulse w-[130px]">
                <div className="size-6 bg-muted rounded-lg" />
                <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-2 bg-muted rounded w-3/4" />
                    <div className="h-1 bg-muted rounded w-full" />
                </div>
            </div>
        )
    }

    if (!quota) return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/10 border border-border/50 rounded-2xl grayscale opacity-50 cursor-not-allowed">
                        <Zap className="size-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Sensei</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>Chưa thể kết nối tới Sensei. Vui lòng kiểm tra lại kết nối mạng hoặc máy chủ.</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )

    const percentage = quota.limit === -1 ? 100 : Math.min(100, (quota.remaining / quota.limit) * 100)
    const isCritical = quota.remaining <= 2 && quota.limit !== -1

    const getTierConfig = (tier: string) => {
        switch (tier.toLowerCase()) {
            case 'premium':
                return {
                    label: "PREMIUM",
                    icon: <Crown className="size-3.5 fill-purple-500 text-purple-600" />,
                    color: "from-purple-500/20 to-indigo-500/20 text-purple-700 border-purple-200",
                    progressColor: "bg-purple-600",
                    glow: "shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                }
            case 'plus':
                return {
                    label: "PLUS",
                    icon: <Star className="size-3.5 fill-amber-400 text-amber-500" />,
                    color: "from-amber-400/20 to-orange-500/20 text-amber-700 border-amber-200",
                    progressColor: "bg-amber-500",
                    glow: "shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                }
            default:
                return {
                    label: "FREE",
                    icon: <Zap className="size-3.5 fill-blue-400 text-blue-500" />,
                    color: "from-blue-400/20 to-cyan-500/20 text-blue-700 border-blue-200",
                    progressColor: "bg-blue-500",
                    glow: ""
                }
        }
    }

    const config = getTierConfig(quota.tier)

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "group flex items-center gap-3 px-3 py-1.5 rounded-2xl border bg-gradient-to-br transition-all duration-300 cursor-help hover:scale-[1.02]",
                            config.color,
                            config.glow
                        )}
                    >
                        <div className="flex items-center justify-center p-1 bg-white/50 rounded-lg shadow-sm">
                            {config.icon}
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-[70px]">
                            <div className="flex items-center justify-between gap-2 leading-none">
                                <span className="text-[9px] font-bold uppercase tracking-wider">{config.label}</span>
                                <span className={cn(
                                    "text-[10px] font-bold",
                                    isCritical ? "text-destructive animate-pulse" : "text-foreground/70"
                                )}>
                                    {quota.limit === -1 ? "∞" : `${quota.remaining}/${quota.limit}`}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-black/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={cn("h-full", config.progressColor)}
                                />
                            </div>
                        </div>
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="w-[240px] p-4 rounded-2xl shadow-xl border-border/50 backdrop-blur-xl bg-background/95">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", config.color)}>
                                {config.icon}
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground leading-none">Gói hiện tại</p>
                                <p className="text-sm font-bold">{quota.tier.toUpperCase()}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground font-medium">Số lượt còn lại hôm nay</span>
                                <span className="font-bold">{quota.limit === -1 ? "∞" : `${quota.remaining}/${quota.limit}`}</span>
                            </div>
                            <Progress value={percentage} className="h-1.5" />
                        </div>

                        {quota.expiresAt && (
                            <div className="space-y-1.5 p-2 rounded-xl bg-muted/30 border border-border/50">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-foreground">
                                    <Calendar className="size-3.5 text-primary" />
                                    <span>Thông tin gói</span>
                                </div>
                                <div className="flex flex-col gap-0.5 pl-5.5">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-muted-foreground font-medium">Hiệu lực gói:</span>
                                        <span className="font-bold text-primary">
                                            Còn {differenceInDays(new Date(quota.expiresAt), new Date())} ngày
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            Số lượt chat và roleplay được cấp hàng ngày dựa trên gói của bạn. Tự động làm mới vào 00:00.
                        </p>

                        {(quota.tier === 'free' || quota.tier === 'plus') && (
                            <Link
                                href="/dashboard/payment/subscriptions"
                                className="flex items-center justify-between w-full px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-all group/btn"
                            >
                                Nâng cấp ngay
                                <ChevronRight className="size-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
