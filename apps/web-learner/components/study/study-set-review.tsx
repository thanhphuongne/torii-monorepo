'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAcademyStudyCards as useStudyCards,
  useReviewAcademyCard as useReviewCard
} from '@/lib/api/services/academy-study-set-api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { ChevronLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { StudyModeSelection } from './study-mode-selection';
import {
  Flashcards,
  type FlashcardsData,
  type FlashcardsResult,
} from '@workspace/ui/components/custom/flashcards';

export function StudySetReview({ setId }: { setId: string }) {
  const router = useRouter();
  const { mutate: reviewCard } = useReviewCard();

  const [displayCards, setDisplayCards] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [completion, setCompletion] = useState<FlashcardsResult | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  // Reset state khi đổi bộ thẻ
  useEffect(() => {
    setIsInitialized(false);
    setDisplayCards([]);
    setCompletion(null);
    setSessionKey(0);
  }, [setId]);

  // Lấy danh sách thẻ đến hạn ôn
  const { data: cards, isLoading, isError, refetch } = useStudyCards(setId, { enabled: true });

  useEffect(() => {
    if (cards && !isInitialized) {
      setDisplayCards(cards);
      setIsInitialized(true);
    }
  }, [cards, isInitialized]);

  const flashcardsData: FlashcardsData | null = useMemo(() => {
    if (!displayCards || displayCards.length === 0) return null;

    // Helper to resolve potential relative URLs from the backend
    const resolveAudioUrl = (url?: string) => {
      if (!url) return undefined;
      if (url.startsWith('http')) return url;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      // Remove trailing slash from baseUrl and leading slash from url if needed
      const cleanBase = baseUrl.replace(/\/$/, '');
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      return `${cleanBase}${cleanUrl}`;
    };

    return {
      title: 'Ôn tập flashcard',
      description: `Bộ thẻ này có ${displayCards.length} thẻ.`,
      cards: displayCards.map((c: any) => ({
        id: c.id,
        front: c.term,
        back: c.definition,
        tag: c.hint || undefined,
        phonetic: c.languageDetails?.phonetic || c.language_details?.phonetic,
        audioUrl: resolveAudioUrl(c.languageDetails?.audioUrl || c.language_details?.audioUrl),
      })),
      showRatings: true,
      shuffle: false,
    };
  }, [displayCards]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-border border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Đang tải thẻ ôn tập...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex-1 flex flex-col items-center justify-center text-center">
        <CardContent className="space-y-4 py-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <X className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Lỗi tải dữ liệu</h2>
            <p className="text-sm text-muted-foreground">
              Không thể tải các thẻ ôn tập vào lúc này. Vui lòng thử lại.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Về bộ thẻ
            </Button>
            <Button onClick={() => refetch()}>Thử lại</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Không có thẻ để ôn
  if (!flashcardsData) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="w-full max-w-4xl mx-auto space-y-6 py-4 md:py-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
              className="inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Quay lại bộ thẻ</span>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Không có thẻ cần ôn</CardTitle>
              <CardDescription>
                Hiện tại không có thẻ nào đến hạn ôn tập trong bộ này.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
              >
                Về danh sách thẻ
              </Button>
            </CardFooter>
          </Card>

          <StudyModeSelection
            selectedSetId={setId}
            selectedCount={0}
            activeMode="review"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" data-purpose="review-page">
      <div className="w-full max-w-4xl mx-auto space-y-6 py-4 md:py-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between max-w-2xl w-full mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
            className="inline-flex items-center gap-1 -ml-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Quay lại bộ thẻ</span>
          </Button>
        </div>

        <Flashcards
          key={sessionKey}
          flashcardsData={flashcardsData}
          hideInternalCompletion
          onRate={(rating) => {
            reviewCard({
              cardId: rating.cardId,
              payload: { quality: rating.difficulty === 'known' ? 1 : 0 },
              setId
            });
          }}
          onComplete={(res) => setCompletion(res)}
          onViewDetail={(card) => {
            toast.info(`Chi tiết thẻ: ${card.front}`, {
              description: card.back,
            });
          }}
        />

        {completion && (
          <Card>
            <CardHeader>
              <CardTitle>Đã hoàn thành lượt ôn tập</CardTitle>
              <CardDescription>
                Bạn vừa ôn {flashcardsData.cards.length} thẻ. Bạn có thể ôn lại ngay nếu muốn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Thẻ đánh dấu &quot;Nhớ&quot;:{' '}
                <span className="font-medium">{completion.counts.known}</span>, &quot;Quên&quot;:{' '}
                <span className="font-medium">{completion.counts.forgot}</span>
              </p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between">
              <Button
                onClick={() => {
                  setCompletion(null);
                  setSessionKey((k) => k + 1);
                }}
              >
                Ôn lại bộ thẻ
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
              >
                Về danh sách thẻ
              </Button>
            </CardFooter>
          </Card>
        )}

        <StudyModeSelection
          selectedSetId={setId}
          selectedCount={flashcardsData.cards.length}
          activeMode="review"
        />
      </div>
    </div>
  );
}

