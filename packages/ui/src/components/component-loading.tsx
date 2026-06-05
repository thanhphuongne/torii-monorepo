import { cn } from "@workspace/ui/lib/utils"
interface ComponentLoadingProps {
    text?: string
    className?: string
}

export function ComponentLoading({ text = "Loading...", className }: ComponentLoadingProps) {
    return (
        <div className={cn("flex items-center justify-center p-8 min-h-[200px] w-full bg-background/50 rounded-3xl animate-in fade-in duration-700", className)}>
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
                {text && (
                    <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 animate-pulse">
                        {text}
                    </div>
                )}
            </div>
        </div>
    )
}
