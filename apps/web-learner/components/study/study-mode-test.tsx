'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademyTestQuiz as useTestQuiz } from '@/lib/api/services/academy-study-set-api';
import { Button } from '@workspace/ui/components/button';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { StudyModeSelection } from './study-mode-selection';
import { Quiz, type QuizData, type QuizResult } from '@workspace/ui/components/custom/quiz';
import { MarkdownRenderer } from '../common/markdown-renderer';

interface Question {
    id: string;
    type: 'multiple_choice' | 'true_false';
    question: string;
    options: string[];
    answer: string;
    displayedAnswer?: string;
    hint?: string;
    phonetic?: string;
}

export function StudyModeTest({ setId }: { setId: string }) {
    const router = useRouter();
    const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

    const authQuiz = useTestQuiz(setId, 10, { enabled: true });
    const rawQuestions = authQuiz.data;
    const isLoading = authQuiz.isLoading;
    const isError = authQuiz.isError;
    const refetch = authQuiz.refetch;

    const quizData: QuizData | null = useMemo(() => {
        if (!rawQuestions) return null;
        const questions: QuizData['questions'] = rawQuestions.map((q: any) => {
            const isTrueFalse = q.type === 'true_false';
            const baseQuestion = isTrueFalse
                ? `${q.question} có nghĩa là "${q.displayedAnswer}"?`
                : q.question;

            const optionsLabels: string[] = isTrueFalse
                ? ['Đúng', 'Sai']
                : (q.options ?? []);

            const correctLabel = isTrueFalse ? (q.correctAnswer ? 'Đúng' : 'Sai') : q.correctAnswer;

            const options = optionsLabels.map((label) => ({
                id: label,
                label,
            }));

            return {
                id: q.id,
                type: isTrueFalse ? 'true-false' : 'single',
                question: baseQuestion,
                options,
                correctIds: [correctLabel],
                hint: q.hint,
            };
        });

        return {
            title: 'Trắc nghiệm từ vựng',
            description: 'Chọn đáp án đúng cho mỗi câu hỏi.',
            questions,
            shuffle: true,
            passingScore: 70,
        };
    }, [rawQuestions]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-border border-t-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Đang chuẩn bị bài thi...</p>
                </div>
            </div>
        );
    }

    if (isError || !quizData || quizData.questions.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                    <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                        <AlertCircle className="size-8" />
                    </div>
                    <h2 className="text-lg font-semibold">Không thể tải bài thi</h2>
                    <p className="text-sm text-muted-foreground">
                        Vui lòng đảm bảo bộ thẻ của bạn có ít nhất 4 thẻ để tạo bài trắc nghiệm.
                    </p>
                    <Button onClick={() => router.push(`/dashboard/study-sets/${setId}`)}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại bộ thẻ
                    </Button>
                </div>
            </div>
        );
    }

const TestResultScreen = ({
    result,
    setId,
    router,
    onRetry,
}: {
    result: QuizResult;
    setId: string;
    router: any;
    onRetry: () => void;
}) => {
    return (
        <div className="flex-1 flex flex-col gap-8">
            <div className="w-full max-w-4xl mx-auto space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
                        className="inline-flex items-center gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Về bộ thẻ</span>
                    </Button>
                </div>

                <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                        Kết quả bài trắc nghiệm
                    </p>
                    <p className="text-2xl font-semibold">
                        {result.score} / {result.maxScore} câu đúng ({result.percentage}%)
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button onClick={onRetry} className="sm:flex-1">
                            Làm lại bài này
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
                            className="sm:flex-1"
                        >
                            Kết thúc và về bộ thẻ
                        </Button>
                    </div>
                </div>

                <StudyModeSelection
                    selectedSetId={setId}
                    selectedCount={result.maxScore}
                    activeMode="test"
                />
            </div>
        </div>
    );
};

    if (quizResult && quizData) {
        return (
            <TestResultScreen 
                result={quizResult}
                setId={setId}
                router={router}
                onRetry={() => {
                    setQuizResult(null);
                    refetch();
                }}
            />
        );
    }

    return (
        <div 
            className="flex min-h-[calc(100vh-4rem)] w-full flex-col items-center overflow-x-hidden px-2 py-3 md:px-8 md:py-8"
            data-purpose="quiz-page"
        >
            <div className="w-full max-w-5xl mx-auto flex flex-col space-y-4">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <button
                        onClick={() => router.push(`/dashboard/study-sets/${setId}`)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Quay lại bộ thẻ</span>
                    </button>
                </div>

                {quizData && (
                    <Quiz
                        quizData={quizData}
                        hideInternalResult
                        onComplete={(res) => setQuizResult(res)}
                        className="max-w-4xl"
                        renderContent={(content, context) => (
                            <MarkdownRenderer 
                                content={content} 
                                inline={['option', 'title'].includes(context)} 
                            />
                        )}
                    />
                )}

                {quizData && (
                    <div className="pt-4 max-w-4xl mx-auto w-full">
                        <StudyModeSelection
                            selectedSetId={setId}
                            selectedCount={quizData.questions.length}
                            activeMode="test"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

