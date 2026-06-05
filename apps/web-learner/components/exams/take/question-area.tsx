'use client'

import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/button"
import { Flag, ArrowLeft, ArrowRight, Play, Pause } from "lucide-react"
import { useState, useRef, useEffect } from 'react'
import { MarkdownRenderer } from "@/components/common/markdown-renderer"

export interface Question {
    id: string
    content: string
    type: 'single' | 'listening' | 'reading'
    audioUrl?: string
    imageUrl?: string
    readingPassage?: string
    options: { id: string; label: string }[]
}

interface QuestionAreaProps {
    question: Question
    selectedOption?: string
    isFlagged: boolean
    onAnswer: (questionId: string, optionId: string) => void
    onFlag: (questionId: string) => void
    onNext: () => void
    onPrev: () => void
    isFirst: boolean
    isLast: boolean
}

export function QuestionArea({
    question,
    selectedOption,
    isFlagged,
    onAnswer,
    onFlag,
    onNext,
    onPrev,
    isFirst,
    isLast
}: QuestionAreaProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        setIsPlaying(false)
    }, [question.id])

    const toggleAudio = async () => {
        const el = audioRef.current
        if (!el) return
        if (isPlaying) {
            el.pause()
            setIsPlaying(false)
            return
        }
        try {
            await el.play()
            setIsPlaying(true)
        } catch {
            setIsPlaying(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

            {/* Listening Section */}
            {question.type === 'listening' && question.audioUrl && (
                <div className="bg-muted p-4 rounded-lg flex items-center gap-4">
                    <Button
                        type="button"
                        size="icon"
                        className="h-12 w-12 rounded-full shrink-0"
                        onClick={() => void toggleAudio()}
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-1/3 animate-pulse" />
                        </div>
                    </div>
                    <audio
                        key={`${question.id}-${question.audioUrl}`}
                        ref={audioRef}
                        src={question.audioUrl}
                        preload="auto"
                        onEnded={() => setIsPlaying(false)}
                        onPause={() => setIsPlaying(false)}
                        className="hidden"
                    />
                </div>
            )}

            {/* Reading Passage */}
            {question.type === 'reading' && question.readingPassage && (
                <div className="bg-card border p-6 rounded-lg prose max-w-none">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Đọc đoạn văn sau</h4>
                    <MarkdownRenderer content={question.readingPassage} className="leading-relaxed text-card-foreground" />
                </div>
            )}

            {/* Image (if question has media) */}
            {question.imageUrl && (
                <div className="bg-card border p-4 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={question.imageUrl}
                        alt="Hình ảnh câu hỏi"
                        className="w-full max-h-[420px] object-contain"
                    />
                </div>
            )}

            {/* Question Content */}
            <div>
                <div className="text-xl md:text-2xl font-semibold text-foreground leading-relaxed mb-6">
                    <MarkdownRenderer content={question.content} className="prose-p:my-0 prose-headings:my-1" />
                </div>

                <RadioGroup
                    value={selectedOption}
                    onValueChange={(val) => onAnswer(question.id, val)}
                    className="space-y-4"
                >
                    {question.options.map((opt) => (
                        <div
                            key={opt.id}
                            className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${selectedOption === opt.id
                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                : "border hover:border-primary/50 bg-card"
                                }`}
                            onClick={() => onAnswer(question.id, opt.id)}
                        >
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <Label htmlFor={opt.id} className="flex-1 cursor-pointer font-medium text-card-foreground text-base">
                                <MarkdownRenderer content={opt.label} inline />
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-8 border-t">
                <Button
                    variant="ghost"
                    onClick={onPrev}
                    disabled={isFirst}
                    className="text-muted-foreground"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Câu trước
                </Button>

                <Button
                    variant={isFlagged ? "secondary" : "ghost"}
                    className={isFlagged ? "" : "text-muted-foreground hover:text-foreground"}
                    onClick={() => onFlag(question.id)}
                >
                    <Flag className={`w-4 h-4 mr-2 ${isFlagged ? "fill-current" : ""}`} />
                    {isFlagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}
                </Button>

                <Button
                    onClick={onNext}
                    className="min-w-[120px]"
                >
                    {isLast ? "Nộp bài" : "Câu tiếp"}
                    {!isLast && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
            </div>
        </div>
    )
}
