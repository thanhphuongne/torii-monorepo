'use client'

import { ArrowLeft, CheckCircle2, Layout } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'
import { Badge } from '@workspace/ui/components/badge'

interface LessonHeaderProps {
    courseTitle: string
    lessonTitle: string
    progress: number
    sidebarOpen: boolean
    onToggleSidebar: () => void
    isCompleted?: boolean
}

export function LessonHeader({ courseTitle, lessonTitle, progress, sidebarOpen, onToggleSidebar, isCompleted }: LessonHeaderProps) {
    return (
        <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between gap-4 px-4">
                <div className="flex min-w-0 items-center gap-4">
                    <Link href="/dashboard/my-courses">
                        <Button variant="ghost" size="icon" className="cursor-pointer rounded-xl hover:bg-muted/50">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {courseTitle}
                        </p>
                        <h1 className="mt-0.5 max-w-[200px] truncate font-sans text-xl font-bold uppercase italic tracking-normal text-foreground sm:max-w-md">
                            {lessonTitle}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isCompleted && (
                        <Badge variant="outline" className="hidden sm:flex gap-1.5 animate-in fade-in zoom-in-95 duration-500 text-primary border-primary/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Đã học xong
                        </Badge>
                    )}
                    <Badge variant="outline" className="hidden sm:flex gap-1.5 border-border/50">
                        {progress}% hoàn thành
                    </Badge>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleSidebar}
                        className={cn('cursor-pointer rounded-xl transition-all hover:bg-muted/50', sidebarOpen && 'bg-primary/5 text-primary')}
                    >
                        <Layout className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    )
}
