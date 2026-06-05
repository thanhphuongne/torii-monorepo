'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface TrendIndicatorProps {
    change: number
}

export function TrendIndicator({ change }: TrendIndicatorProps) {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-emerald-500" />
    if (change < 0) return <ArrowDown className="w-4 h-4 text-rose-500" />
    return <Minus className="w-4 h-4 text-slate-400" />
}
