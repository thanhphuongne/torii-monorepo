"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { QuotaIndicator } from "./quota-indicator"
import { cn } from "@workspace/ui/lib/utils"

interface SenseiPageHeaderProps {
    title: string
    description: string
    icon: LucideIcon
    children?: React.ReactNode
    className?: string
}

export function SenseiPageHeader({
    title,
    description,
    icon: Icon,
    children,
    className
}: SenseiPageHeaderProps) {
    return (
        <div className={cn("mb-2 mt-0 flex flex-col items-start justify-between gap-2 sm:mb-4 sm:mt-0 sm:gap-4 xl:flex-row xl:items-center", className)}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded-xl shrink-0 border">
                        <Icon className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            {title}
                        </h1>
                        <p className="text-muted-foreground font-medium text-xs">{description}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                {children}
            </div>
        </div>
    )
}
