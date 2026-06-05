import type { ReactNode } from 'react';
import { cn } from "@workspace/ui/lib/utils";

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
    stats?: Array<{
        label: string;
        value: string | number;
    }>;
    className?: string;
}

export function PageHeader({ title, subtitle, actions, stats, className }: PageHeaderProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4",
                className,
            )}
        >
            <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {title}
                </h1>
                {subtitle && (
                    <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
                {stats && stats.length > 0 && (
                    <div className="hidden items-center divide-x divide-border lg:flex">
                        {stats.map((stat, index) => (
                            <div key={index} className="px-4 first:pl-0 last:pr-0 text-right">
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className="text-lg font-semibold tabular-nums text-foreground">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                )}
                {actions}
            </div>
        </div>
    );
}
