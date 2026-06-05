'use client';

import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Layers, Target, Zap } from 'lucide-react';

interface StudyModeSelectionProps {
    selectedSetId: string | null;
    selectedCount: number;
    activeMode?: 'review' | 'test' | 'match';
}

export function StudyModeSelection({ selectedSetId, selectedCount, activeMode }: StudyModeSelectionProps) {
    const isDisabled = !selectedSetId || selectedCount === 0;
    return (
        <section className="w-full space-y-3" data-purpose="study-mode-selection">
            <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground sm:text-base">Chế độ học</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                    {/* Flashcard / SRS */}
                    <Card
                        className={`shadow-none ${
                            activeMode === 'review' ? 'border-blue-500/40 bg-blue-500/[0.04]' : ''
                        }`}
                        data-purpose="mode-card-flashcard"
                    >
                        <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
                            <div className="flex items-start gap-3 text-left sm:flex-col sm:items-center sm:text-center">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 sm:h-10 sm:w-10">
                                    <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-sm font-semibold text-foreground">Flashcard</p>
                                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                                        Lật thẻ, làm quen từ mới.
                                    </p>
                                </div>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                disabled={isDisabled}
                                className="h-9 w-full border-blue-600/40 text-blue-700 hover:bg-blue-500/10 dark:text-blue-400"
                            >
                                <Link href={selectedSetId ? `/dashboard/study-sets/${selectedSetId}/review` : '#'}>
                                    Vào Flashcard
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Multiple choice test */}
                    <Card
                        className={`shadow-none ${
                            activeMode === 'test' ? 'border-orange-500/40 bg-orange-500/[0.04]' : ''
                        }`}
                        data-purpose="mode-card-quiz"
                    >
                        <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
                            <div className="flex items-start gap-3 text-left sm:flex-col sm:items-center sm:text-center">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 sm:h-10 sm:w-10">
                                    <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-sm font-semibold text-foreground">Trắc nghiệm</p>
                                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                                        Kiểm tra mức độ nhớ.
                                    </p>
                                </div>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                disabled={isDisabled}
                                className="h-9 w-full border-orange-600/40 text-orange-700 hover:bg-orange-500/10 dark:text-orange-400"
                            >
                                <Link href={selectedSetId ? `/dashboard/study-sets/${selectedSetId}/test` : '#'}>
                                    Vào trắc nghiệm
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Match / active recall */}
                    <Card
                        className={`shadow-none ${
                            activeMode === 'match' ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : ''
                        }`}
                        data-purpose="mode-card-intensive"
                    >
                        <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
                            <div className="flex items-start gap-3 text-left sm:flex-col sm:items-center sm:text-center">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 sm:h-10 sm:w-10">
                                    <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                    <p className="text-sm font-semibold text-foreground">Match</p>
                                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                                        Ghép cặp thuật ngữ — định nghĩa.
                                    </p>
                                </div>
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                disabled={isDisabled}
                                className="h-9 w-full border-emerald-600/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                            >
                                <Link href={selectedSetId ? `/dashboard/study-sets/${selectedSetId}/match` : '#'}>
                                    Vào Match
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
