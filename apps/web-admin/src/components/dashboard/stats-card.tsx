import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type StatsCardTone = "neutral" | "primary" | "success" | "warning" | "info"

export interface StatsCardProps {
    title: string
    value: string | number
    sub: string
    icon: React.ElementType
    trend?: string
    highlight?: boolean
    /** Giữ prop để tương thích; giao diện thống nhất trung tính */
    tone?: StatsCardTone
}

export function StatsCard({ title, value, sub, icon: Icon, trend, highlight }: StatsCardProps) {
    return (
        <Card
            className={cn(
                "shadow-sm",
                highlight && "border-primary/50",
            )}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <p className="text-xs font-medium text-muted-foreground">{title}</p>
                <div className="rounded-md bg-muted p-2 text-muted-foreground">
                    <Icon className="size-4" strokeWidth={2} />
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex flex-wrap items-baseline gap-2">
                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
                    {trend && (
                        <Badge variant="secondary" className="text-[10px] font-medium">
                            <ArrowUpRight className="size-3" />
                            {trend}
                        </Badge>
                    )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </CardContent>
        </Card>
    )
}
