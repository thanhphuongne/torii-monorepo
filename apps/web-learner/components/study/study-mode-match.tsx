'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademyMatchGame as useMatchGame } from '@/lib/api/services/academy-study-set-api';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { ChevronLeft, RefreshCw, Trophy, Timer, X } from 'lucide-react';
import { toast } from 'sonner';
import { StudyModeSelection } from './study-mode-selection';

interface MatchItem {
    id: string; // The original card ID
    text: string;
    type: 'term' | 'definition';
    uniqueId: string; // To differentiate between term and definition even with same ID
}

export function StudyModeMatch({ setId }: { setId: string }) {
    const router = useRouter();
    const [items, setItems] = useState<MatchItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [matches, setMatches] = useState<string[]>([]); // Array of original card IDs that are matched
    const [startTime, setStartTime] = useState<number | null>(null);
    const [time, setTime] = useState(0);
    const [gameFinished, setGameFinished] = useState(false);
    const [wrongSelection, setWrongSelection] = useState<string | null>(null);

    const authMatch = useMatchGame(setId, 6, { enabled: true });
    const pairs = authMatch.data;
    const isLoading = authMatch.isLoading;
    const isError = authMatch.isError;
    const refetch = authMatch.refetch;

    const initGame = useCallback(() => {
        if (!pairs) return;

        const flattened: MatchItem[] = [];
        pairs.forEach((pair: any) => {
            flattened.push({ id: pair.id, text: pair.term, type: 'term', uniqueId: `${pair.id}-term` });
            flattened.push({ id: pair.id, text: pair.definition, type: 'definition', uniqueId: `${pair.id}-def` });
        });

        // Shuffle
        setItems(flattened.sort(() => Math.random() - 0.5));
        setMatches([]);
        setSelectedId(null);
        setStartTime(Date.now());
        setTime(0);
        setGameFinished(false);
    }, [pairs]);

    useEffect(() => {
        if (pairs) initGame();
    }, [pairs, initGame]);

    useEffect(() => {
        if (startTime && !gameFinished) {
            const timer = setInterval(() => {
                setTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [startTime, gameFinished]);

    const handleSelect = (item: MatchItem) => {
        if (matches.includes(item.id) || gameFinished) return;

        if (!selectedId) {
            setSelectedId(item.uniqueId);
            setWrongSelection(null);
            return;
        }

        if (selectedId === item.uniqueId) {
            setSelectedId(null);
            return;
        }

        const firstItem = items.find(i => i.uniqueId === selectedId)!;

        // Check match
        if (firstItem.id === item.id && firstItem.type !== item.type) {
            // Match!
            const newMatches = [...matches, item.id];
            setMatches(newMatches);
            setSelectedId(null);

            if (newMatches.length === (pairs?.length || 0)) {
                setGameFinished(true);
            }
        } else {
            // Wrong match
            setWrongSelection(item.uniqueId);
            setTimeout(() => {
                setSelectedId(null);
                setWrongSelection(null);
            }, 500);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-border border-t-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Đang xáo trộn thẻ...</p>
                </div>
            </div>
        );
    }

    if (isError || !pairs || pairs.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                    <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                        <X className="size-8" />
                    </div>
                    <h2 className="text-lg font-semibold">Không thể tải dữ liệu</h2>
                    <p className="text-sm text-muted-foreground">
                        Bộ thẻ này cần đủ số lượng thẻ để chơi ghép cặp.
                    </p>
                    <Button onClick={() => router.push(`/dashboard/study-sets/${setId}`)}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Về bộ thẻ
                    </Button>
                </div>
            </div>
        );
    }

    if (gameFinished && pairs) {
        return (
            <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-10 space-y-10">
                <div className="flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
                    <div className="w-24 h-24 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mb-6">
                        <Trophy className="size-12" />
                    </div>
                    <h2 className="text-4xl font-bold mb-2">Thành công!</h2>
                    <p className="text-muted-foreground text-xl mb-8">Bạn hoàn thành trong {time} giây</p>
                    <div className="flex gap-4">
                        <Button size="lg" onClick={initGame}>
                            <RefreshCw className="mr-2 size-5" /> Chơi lại
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => router.push(`/dashboard/study-sets/${setId}`)}>
                            <ChevronLeft className="mr-2 size-5" /> Về bộ thẻ
                        </Button>
                    </div>
                </div>
                <StudyModeSelection
                    selectedSetId={setId}
                    selectedCount={pairs.length}
                    activeMode="match"
                />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-10 relative space-y-10">
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-background/80 backdrop-blur-md z-20 py-2">
                <Button variant="ghost" onClick={() => router.push(`/dashboard/study-sets/${setId}`)}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Thoát game
                </Button>
                <div className="flex items-center gap-3 bg-muted px-6 py-2 rounded-full font-mono text-2xl font-bold shadow-inner">
                    <Timer className="size-6 text-primary" />
                    {time}s
                </div>
                <div className="w-20" /> {/* Spacer */}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-in fade-in duration-500">
                {items.map((item) => {
                    const isMatched = matches.includes(item.id);
                    const isSelected = selectedId === item.uniqueId;
                    const isWrong = wrongSelection === item.uniqueId;

                    if (isMatched) {
                        return (
                            <div key={item.uniqueId} className="h-32 rounded-xl border border-dashed border-muted opacity-0 transition-all duration-300 scale-90" />
                        );
                    }

                    let ringClass = "";
                    if (isSelected) ringClass = "ring-4 ring-primary ring-offset-2 scale-105 shadow-xl z-10";
                    if (isWrong) ringClass = "ring-4 ring-destructive ring-offset-2 animate-shake shadow-lg z-10";

                    return (
                        <Card
                            key={item.uniqueId}
                            className={`h-40 flex items-center justify-center p-4 cursor-pointer transition-all duration-300 hover:shadow-lg active:scale-95 text-center ${ringClass} ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:border-primary/50'}`}
                            onClick={() => handleSelect(item)}
                        >
                            <CardContent className="p-0 font-medium text-lg leading-snug break-words max-h-full overflow-hidden">
                                {item.text}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Hint for mobile */}
            <p className="mt-12 text-center text-muted-foreground text-sm opacity-50 select-none">
                Hãy chọn một thuật ngữ và nghĩa tương ứng để chúng biến mất!
            </p>

            <StudyModeSelection
                selectedSetId={setId}
                selectedCount={pairs.length}
                activeMode="match"
            />
        </div>
    );
}
