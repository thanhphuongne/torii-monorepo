'use client'

import { cn } from "@workspace/ui/lib/utils"
import { Flag } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

interface QuestionNavigatorProps {
    questions: any[]
    currentIndex: number
    answers: Record<string, string>
    flags: Set<string>
    onSelect: (index: number) => void
}

export function QuestionNavigator({
    questions,
    currentIndex,
    answers,
    flags,
    onSelect
}: QuestionNavigatorProps) {
    return (
        <div className="h-full flex flex-col bg-background/50 border-r border-border">
            <div className="p-6 border-b border-border">
                <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground/50 mb-4">Bảng điều hướng</h3>
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex-wrap">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                        <span>Đã trả lời</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/40" />
                        <span>Đã đánh dấu</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full border border-border" />
                        <span>Chưa trả lời</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-5 gap-3">
                    {questions.map((q, index) => {
                        const isAnswered = !!answers[q.id]
                        const isFlagged = flags.has(q.id)
                        const isActive = currentIndex === index

                        return (
                            <Button
                                key={q.id}
                                variant="ghost"
                                onClick={() => onSelect(index)}
                                className={cn(
                                    "relative size-10 text-[10px] font-bold rounded-lg transition-all duration-300 border flex items-center justify-center p-0",
                                    isActive
                                        ? "ring-1 ring-primary border-primary bg-primary/10 text-primary z-10 hover:bg-primary/20 hover:text-primary"
                                        : "border-border hover:border-primary/30 hover:bg-accent text-muted-foreground",
                                    isAnswered && !isActive
                                        ? "bg-primary/20 text-primary border-primary/20 hover:bg-primary/30"
                                        : "",
                                    isFlagged && "border-primary/50 text-primary"
                                )}
                            >
                                {index + 1}
                                {isFlagged && (
                                    <div className="absolute -top-1 -right-1">
                                        <Flag className="size-3 fill-primary text-primary" />
                                    </div>
                                )}
                            </Button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
