'use client';

import {
    Clock,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    CheckCircle2
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'

interface LessonNavigationProps {
    duration: number;
    order: number;
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

export function LessonNavigation({ duration, order, hasPrevious, hasNext, onPrevious, onNext }: LessonNavigationProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                        {duration
                            ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
                            : '00:00'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Bài học #{order || 1}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    className="px-5 text-xs font-bold uppercase tracking-widest border-border/50 hover:bg-muted cursor-pointer transition-all"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Trước
                </Button>
                <Button
                    size="sm"
                    onClick={onNext}
                    // disabled={!hasNext && false} // Allow redirect to completion
                    className="px-6 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all"
                >
                    {hasNext ? (
                        <>Bài Tiếp <ChevronRight className="w-4 h-4 ml-2" /></>
                    ) : (
                        <>Hoàn thành <CheckCircle2 className="w-4 h-4 ml-2" /></>
                    )}
                </Button>
            </div>
        </div>
    );
}
