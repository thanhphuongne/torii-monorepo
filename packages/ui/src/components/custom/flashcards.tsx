"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { toast } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Progress } from "@workspace/ui/components/progress"
import { Card, CardContent } from "@workspace/ui/components/card"
import { RotateCcw, ChevronLeft, ChevronRight, ThumbsUp, Volume2, ArrowRightLeft } from "lucide-react"

export type FlashcardDifficulty = "forgot" | "known"

export interface Flashcard {
    id: string
    front: string
    back: string
    frontImage?: string
    backImage?: string
    tag?: string
    phonetic?: string
    audioUrl?: string
}

export interface FlashcardsData {
    title: string
    description?: string
    cards: Flashcard[]
    /** Show self-rating buttons (default: true) */
    showRatings?: boolean
    /** Randomise order (default: false) */
    shuffle?: boolean
}

export interface FlashcardRating {
    cardId: string
    difficulty: FlashcardDifficulty
}

export interface FlashcardsResult {
    ratings: FlashcardRating[]
    counts: Record<FlashcardDifficulty, number>
}

export interface FlashcardsProps {
    flashcardsData: FlashcardsData
    onRate?: (rating: FlashcardRating) => void
    onComplete?: (result: FlashcardsResult) => void
    onViewDetail?: (card: Flashcard) => void
    className?: string
    /** Nếu true, ẩn màn hình tổng kết nội bộ để cho phép parent render UI hoàn thành riêng. */
    hideInternalCompletion?: boolean
}

function shuffleArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5)
}

const DIFFICULTY_CONFIG: Record<
    FlashcardDifficulty,
    { label: string; variant: "destructive" | "default" }
> = {
    forgot: { label: "Quên", variant: "destructive" },
    known: { label: "Nhớ", variant: "default" },
}

export function Flashcards({ flashcardsData, onRate, onComplete, onViewDetail, className, hideInternalCompletion }: FlashcardsProps) {
    const { title, description, showRatings = true, shuffle = false } = flashcardsData

    const cards = React.useMemo(
        () => shuffle ? shuffleArray(flashcardsData.cards) : flashcardsData.cards,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [ratings, setRatings] = useState<FlashcardRating[]>([])
    const [finished, setFinished] = useState(false)

    const card = cards[index]
    if (!card) return null

    const progress = ((index + (flipped ? 1 : 0)) / cards.length) * 100

    const handleFlip = useCallback(() => setFlipped((f) => !f), [])

    const [isAudioPlaying, setIsAudioPlaying] = useState(false)

    const playAudio = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();

        if (card.audioUrl) {
            setIsAudioPlaying(true)
            const audio = new Audio(card.audioUrl);

            audio.play()
                .then(() => {
                    console.log("Audio playing:", card.audioUrl);
                })
                .catch(err => {
                    console.error("Flashcard Audio playback failed:", err, "URL:", card.audioUrl);
                    toast.error("Không thể phát âm thanh. Vui lòng kiểm tra lại file hoặc mạng.");
                })
                .finally(() => {
                    setIsAudioPlaying(false)
                });
        } else {
            // Text-to-Speech Fallback
            if (!card.front) return;

            setIsAudioPlaying(true);

            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(card.front);

            // Detect if Japanese (roughly checking for Hiragana, Katakana, or Kanji)
            const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(card.front);
            utterance.lang = isJapanese ? 'ja-JP' : 'en-US';
            utterance.rate = 0.9; // Slightly slower for learning

            utterance.onend = () => setIsAudioPlaying(false);
            utterance.onerror = () => {
                setIsAudioPlaying(false);
                toast.error("Lỗi phát âm thanh tự động.");
            };

            window.speechSynthesis.speak(utterance);
        }
    }, [card.audioUrl, card.front])

    const handleRate = useCallback(
        (difficulty: FlashcardDifficulty) => {
            const rating = { cardId: card.id, difficulty }
            const newRatings = [...ratings, rating]
            setRatings(newRatings)

            // Call onRate callback if provided
            onRate?.(rating)

            if (index + 1 >= cards.length) {
                const counts: Record<FlashcardDifficulty, number> = { forgot: 0, known: 0 }
                for (const r of newRatings) counts[r.difficulty]++
                setFinished(true)
                onComplete?.({ ratings: newRatings, counts })
            } else {
                setIndex((i) => i + 1)
                setFlipped(false)
            }
        },
        [ratings, card.id, index, cards.length, onComplete, onRate]
    )

    // ── Finished ──────────────────────────────────────────────────────────────
    if (finished) {
        if (hideInternalCompletion) {
            // Đã hoàn thành – giao lại cho parent hiển thị UI tổng kết (onComplete đã được gọi trong handleRate).
            return null
        }

        const counts: Record<FlashcardDifficulty, number> = { forgot: 0, known: 0 }
        for (const r of ratings) counts[r.difficulty]++
        return (
            <div className={cn("w-full max-w-2xl mx-auto space-y-4", className)}>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Hoàn thành phiên ôn tập!</h2>
                    <p className="text-muted-foreground">Bạn đã ôn hết {cards.length} thẻ.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {(Object.keys(DIFFICULTY_CONFIG) as FlashcardDifficulty[]).map((d) => (
                        <Card key={d}>
                            <CardContent className="pt-4 text-center">
                                <p className="text-3xl font-bold">{counts[d]}</p>
                                <p className="text-sm text-muted-foreground capitalize">{DIFFICULTY_CONFIG[d].label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => { setIndex(0); setFlipped(false); setRatings([]); setFinished(false) }}
                    >
                        <RotateCcw className="mr-2 size-4" /> Bắt đầu lại
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("w-full mx-auto space-y-6", className)}>
            {/* Header info - Optional, can be hidden if parent adds its own */}
            {!hideInternalCompletion && (
                <div className="flex items-center justify-between px-2">
                    <div>
                        <h2 className="font-bold text-xl text-primary">{title}</h2>
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                </div>
            )}

            <div className="relative flex items-center justify-center group px-12 pb-12">
                {/* Side Arrows */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-14 w-10 md:h-16 md:w-12 rounded-full opacity-60 hover:opacity-100 hover:bg-transparent transition-opacity"
                    onClick={() => { if (index > 0) { setIndex((i) => i - 1); setFlipped(false) } }}
                    disabled={index === 0}
                >
                    <ChevronLeft className="size-8 text-muted-foreground" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-14 w-10 md:h-16 md:w-12 rounded-full opacity-60 hover:opacity-100 hover:bg-transparent transition-opacity"
                    onClick={() => { if (index + 1 < cards.length) { setIndex((i) => i + 1); setFlipped(false) } }}
                    disabled={index + 1 >= cards.length}
                >
                    <ChevronRight className="size-8 text-muted-foreground" />
                </Button>

                {/* 3-D flip card Container */}
                <div className="w-full max-w-2xl perspective-1000">
                    <div
                        className={cn(
                            "relative w-full min-h-[22rem] md:min-h-[26rem] transition-all duration-500 transform-style-3d cursor-pointer shadow-xl rounded-3xl border border-border/50",
                            flipped ? "rotate-y-180" : ""
                        )}
                        style={{ transformStyle: 'preserve-3d' }}
                        onClick={handleFlip}
                        role="button"
                        aria-label={flipped ? "Card back — click to flip" : "Card front — click to flip"}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleFlip()}
                    >
                        {/* Front Side */}
                        <div
                            className="absolute inset-0 w-full h-full backface-hidden rounded-3xl bg-card flex flex-col items-center p-8 text-center bg-gradient-to-br from-white to-slate-50/50 overflow-y-auto pt-16 scrollbar-hide"
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                        >
                            <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-10 w-10 rounded-full transition-all",
                                        isAudioPlaying ? "text-primary animate-pulse scale-110" : "text-slate-400 hover:text-primary"
                                    )}
                                    onClick={playAudio}
                                    disabled={isAudioPlaying}
                                >
                                    <Volume2 className={cn("size-6", isAudioPlaying ? "fill-primary" : "")} />
                                </Button>
                            </div>

                            <div className="space-y-4 w-full flex flex-col items-center">
                                {card.tag && (
                                    <div className="bg-secondary/20 text-secondary-foreground text-xs font-semibold px-4 py-2 rounded-xl max-w-full leading-relaxed border border-secondary/30 mb-2">
                                        {card.tag}
                                    </div>
                                )}
                                {card.frontImage && <img src={card.frontImage} alt="card front" className="mx-auto max-h-32 object-contain rounded-xl shadow-sm mb-4" />}
                                <h3 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight break-words w-full">
                                    {card.front}
                                </h3>
                                {card.phonetic && (
                                    <p className="text-xl md:text-2xl text-slate-500 font-medium italic">「 {card.phonetic} 」</p>
                                )}
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-4">
                                <Button
                                    variant="link"
                                    className="text-primary font-semibold hover:no-underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetail?.(card);
                                    }}
                                >
                                    Xem chi tiết
                                </Button>
                            </div>
                        </div>

                        {/* Back Side */}
                        <div
                            className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl bg-[#f8fbff] flex flex-col items-center p-8 text-center border-2 border-primary/10 shadow-inner overflow-y-auto pt-16 scrollbar-hide"
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-10 w-10 rounded-full transition-all",
                                        isAudioPlaying ? "text-primary animate-pulse scale-110" : "text-slate-400 hover:text-primary"
                                    )}
                                    onClick={playAudio}
                                    disabled={isAudioPlaying}
                                >
                                    <Volume2 className={cn("size-6", isAudioPlaying ? "fill-primary" : "")} />
                                </Button>
                            </div>

                            <div className="w-full flex flex-col items-center gap-4 pt-4">
                                {card.backImage && <img src={card.backImage} alt="card back" className="max-h-32 object-contain rounded-xl shadow-sm mb-2" />}

                                <h3 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight">
                                    {card.front}
                                </h3>

                                {card.phonetic && (
                                    <p className="text-xl md:text-2xl text-slate-500 font-medium italic">「 {card.phonetic} 」</p>
                                )}

                                <div className="mt-2 space-y-1">
                                    <p className="text-2xl md:text-3xl text-slate-700 font-bold leading-relaxed">
                                        Nghĩa: {card.back}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-4">
                                <Button
                                    variant="link"
                                    className="text-primary font-semibold hover:no-underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDetail?.(card);
                                    }}
                                >
                                    Xem chi tiết
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Controls Area */}
            <div className="flex flex-col items-center gap-6 pb-4">
                <div className="flex items-center gap-4">
                    <div className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary font-bold text-sm shadow-sm">
                        {index + 1} / {cards.length}
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 w-full px-4">
                    {showRatings && flipped ? (
                        <div className="flex gap-4 flex-wrap justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {(Object.keys(DIFFICULTY_CONFIG) as FlashcardDifficulty[]).map((d) => (
                                <Button
                                    key={d}
                                    variant={DIFFICULTY_CONFIG[d].variant}
                                    size="lg"
                                    className="px-8 rounded-2xl font-bold shadow-md hover:scale-105 transition-transform"
                                    onClick={(e) => { e.stopPropagation(); handleRate(d); }}
                                >
                                    {DIFFICULTY_CONFIG[d].label}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <Button
                            onClick={handleFlip}
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-white min-w-[200px] h-14 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                        >
                            <ArrowRightLeft className="mr-3 size-5" />
                            {flipped ? "Mặt trước" : "Mặt sau"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Minimal Progress Bar at very bottom */}
            <div className="max-w-2xl mx-auto px-4">
                <Progress value={progress} className="h-1.5 bg-slate-100" />
            </div>
        </div>
    )
}