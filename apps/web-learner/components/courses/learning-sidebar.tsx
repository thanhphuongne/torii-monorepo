'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Circle, CheckCircle2, PlayCircle, Lock } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Progress } from '@workspace/ui/components/progress'
import { cn } from '@workspace/ui/lib/utils'
import { LiveSessionBlock } from './live-session-block'

interface LearningSidebarProps {
    courseTitle: string
    curriculum: any[]
    progress: number
    completedLessons: number // Keep for backward compat or just remove if I update usage
    completedLessonIds?: string[]
    totalLessons: number
    currentLessonId: string | null
    isOpen: boolean
    onToggle: () => void
    onLessonSelect: (lessonId: string) => void
    /** When true, show live sessions block with "Vào phòng" */
    liveClassId?: string
    isLiveCourse?: boolean
}

export function LearningSidebar({
    courseTitle,
    curriculum,
    progress,
    completedLessons,
    completedLessonIds = [],
    totalLessons,
    currentLessonId,
    isOpen,
    onToggle,
    onLessonSelect,
    liveClassId,
    isLiveCourse,
}: LearningSidebarProps) {
    const [expandedSections, setExpandedSections] = useState<number[]>([0])

    const toggleSection = (sectionId: number) => {
        setExpandedSections((prev) =>
            prev.includes(sectionId)
                ? prev.filter((id) => id !== sectionId)
                : [...prev, sectionId]
        )
    }

    if (!isOpen) {
        return null
    }

    return (
        <div className="flex shrink-0 flex-col border-l border-border bg-background transition-all duration-300 fixed inset-y-0 right-0 z-50 h-full w-80 lg:relative lg:z-0 lg:border-l-0">
            {/* Simple Sidebar Header */}
            <div className="space-y-6 border-b border-border/10 p-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-sans text-xs font-bold italic uppercase tracking-widest text-foreground/60">
                        Nội dung học
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Tiến độ khóa học</span>
                        <span className="text-xs font-bold text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1 bg-primary/5" />
                    <p className="text-[10px] font-medium text-muted-foreground/30">
                        Đã hoàn thành {completedLessons}/{totalLessons} bài học
                    </p>
                </div>
            </div>

            {isLiveCourse && liveClassId && (
                <div className="p-4 border-b border-border/40">
                    <LiveSessionBlock liveClassId={liveClassId} compact maxSessions={3} />
                </div>
            )}

            {/* Curriculum List */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-none">
                {curriculum.map((module, moduleIndex) => (
                    <div key={module.id || moduleIndex} className="space-y-1">
                        <Button
                            variant="ghost"
                            onClick={() => toggleSection(moduleIndex)}
                            className={cn(
                                'h-auto w-full justify-between rounded-lg p-4',
                                expandedSections.includes(moduleIndex)
                                    ? 'bg-muted/10 text-left'
                                    : 'text-left hover:bg-muted/5',
                            )}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <ChevronDown className={cn(
                                    'h-4 w-4 text-muted-foreground/40 transition-transform duration-300',
                                    expandedSections.includes(moduleIndex) && 'rotate-180 text-primary',
                                )} />
                                <div className="space-y-0.5 overflow-hidden">
                                    <h4 className="truncate text-xs font-bold uppercase tracking-normal text-foreground">
                                        {module.title}
                                    </h4>
                                    <p className="text-left text-[10px] font-medium text-muted-foreground/40">
                                        Chương {moduleIndex + 1} • {module.lessons?.length || 0} bài học
                                    </p>
                                </div>
                            </div>
                        </Button>

                        <div className={cn(
                            'overflow-hidden px-1 pt-1 transition-all duration-300',
                            expandedSections.includes(moduleIndex) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
                        )}>
                            <div className="space-y-1">
                                {module.lessons?.map((lesson: any, lessonIndex: number) => {
                                    const isActive = lesson.id === currentLessonId
                                    const isLocked = !lesson.isUnlocked

                                    return (
                                        <Button
                                            key={lesson.id || lessonIndex}
                                            variant={isActive ? 'secondary' : 'ghost'}
                                            disabled={isLocked}
                                            onClick={() => onLessonSelect(lesson.id)}
                                            className={cn(
                                                'h-auto w-full justify-start rounded-lg p-3.5 text-left',
                                                isActive
                                                    ? 'bg-primary/5 text-primary'
                                                    : 'text-muted-foreground',
                                                isLocked && 'opacity-30',
                                            )}
                                        >
                                            <div className="shrink-0">
                                                {isActive
                                                    ? <PlayCircle className="h-4 w-4 text-primary" />
                                                    : isLocked
                                                        ? <Lock className="h-3.5 w-3.5 text-muted-foreground/30" />
                                                        : <Circle className="h-1.5 w-1.5 fill-muted-foreground/20 text-muted-foreground/20" />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className={cn(
                                                    'line-clamp-1 text-xs font-bold transition-colors',
                                                    isActive ? 'text-primary' : 'text-foreground/80',
                                                )}>
                                                    {lesson.title}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <p className="text-[10px] font-medium text-muted-foreground/40">
                                                        {lesson.videoDuration
                                                            ? `${Math.floor(lesson.videoDuration / 60)}:${(lesson.videoDuration % 60).toString().padStart(2, '0')}`
                                                            : 'Session'}
                                                    </p>
                                                    {(lesson.completed || completedLessonIds.includes(lesson.id)) && (
                                                        <CheckCircle2 className="h-3 w-3 text-primary/60" />
                                                    )}
                                                </div>
                                            </div>
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
