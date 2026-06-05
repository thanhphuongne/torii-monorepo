'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAcademyExam, useStartAcademyExamAttempt, useSaveAcademyExamDraft, useSubmitAcademyExamAttempt, useAcademyExamAttempt } from '@/lib/api/services/academy-exam-api';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card';
import { Progress } from '@workspace/ui/components/progress';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { Checkbox } from '@workspace/ui/components/checkbox';
import { Badge } from '@workspace/ui/components/badge';
import { Separator } from '@workspace/ui/components/separator';
import { Label } from '@workspace/ui/components/label';
import { 
  ChevronLeft, 
  ChevronRight, 
  Timer, 
  Send, 
  CheckCircle2, 
  X, 
  Award,
  HelpCircle,
  History,
  AlertTriangle,
  Volume2,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

export default function ExamRunnerPage() {
  const { examId } = useParams() as { examId: string };
  const searchParams = useSearchParams();
  const attemptIdFromQuery = searchParams.get('attemptId');
  const enrollmentIdFromQuery = searchParams.get('enrollmentId') || undefined;
  const router = useRouter();

  const { data: exam, isLoading: isLoadingExam } = useAcademyExam(examId);
  const startAttemptMutation = useStartAcademyExamAttempt();
  const saveDraftMutation = useSaveAcademyExamDraft();
  const submitMutation = useSubmitAcademyExamAttempt();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    if (attemptIdFromQuery) {
      setAttemptId(attemptIdFromQuery);
    }
  }, [attemptIdFromQuery]);

  const { data: attempt, isLoading: isLoadingAttempt } = useAcademyExamAttempt(attemptId || undefined);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-start or load attempt (scoped theo enrollment — bắt buộc khi chưa có attemptId)
  useEffect(() => {
    if (
      exam &&
      !attemptId &&
      !startAttemptMutation.isPending &&
      enrollmentIdFromQuery
    ) {
      startAttemptMutation.mutate(
        { examId, enrollmentId: enrollmentIdFromQuery },
        { onSuccess: (data) => setAttemptId(data.id) },
      );
    }
  }, [
    exam,
    attemptId,
    examId,
    startAttemptMutation,
    enrollmentIdFromQuery,
  ]);

  // Sync answers from draft
  useEffect(() => {
    if (attempt?.draftAnswers) {
      setAnswers(attempt.draftAnswers);
    }
    if (attempt?.status === 'SUBMITTED') {
      // already submitted, show results
    }
  }, [attempt]);

  // Timer logic
  useEffect(() => {
    if (attempt && attempt.status === 'IN_PROGRESS' && exam?.totalTimeLimitMinutes) {
      const startTime = new Date(attempt.startedAt).getTime();
      const endTime = startTime + (exam.totalTimeLimitMinutes * 60 * 1000);
      
      const updateTimer = () => {
         const now = Date.now();
         const diff = Math.max(0, Math.floor((endTime - now) / 1000));
         setTimeLeft(diff);
         if (diff === 0) {
            handleAutoSubmit();
         }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [attempt, exam]);

  const handleAutoSubmit = useCallback(() => {
     if (attemptId && !submitMutation.isPending) {
        submitMutation.mutate({ attemptId: attemptId! });
        toast.warning("Thời gian đã hết! Bài làm đã được tự động nộp.");
     }
  }, [attemptId, submitMutation]);

  const saveAnswer = async (questionId: string, value: any) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    
    // Throttle draft saving if needed, for now just save
    try {
      await saveDraftMutation.mutateAsync({ attemptId: attemptId!, draftAnswers: newAnswers });
    } catch (e) {
      console.error(e);
    }
  }

  const handleSubmit = async () => {
    setIsConfirmOpen(true);
  }

  const confirmSubmit = async () => {
    try {
      await submitMutation.mutateAsync({ attemptId: attemptId! });
      toast.success("Đã nộp bài thành công!");
    } catch (error: any) {
      toast.error("Không thể nộp bài: " + error.message);
    }
  }

  if (
    exam &&
    !attemptIdFromQuery &&
    !enrollmentIdFromQuery &&
    !attemptId &&
    !startAttemptMutation.isPending
  ) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-center text-muted-foreground">
          Không tìm thấy thông tin ghi danh khóa học. Hãy mở bài thi từ trang học trong lộ trình
          (có kèm enrollment).
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    );
  }

  if (isLoadingExam || isLoadingAttempt || startAttemptMutation.isPending) {
    return (
       <div className="flex flex-col items-center justify-center h-screen bg-background">
          <Progress value={45} className="w-[300px] mb-4" />
          <p className="text-muted-foreground animate-pulse">Đang chuẩn bị đề thi...</p>
       </div>
    );
  }

  if (attempt?.status === 'SUBMITTED' && !isReviewMode) {
    const percentage = Math.round(attempt.percentage || 0);
    const passed = !!attempt.isPassed;
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Card className="overflow-hidden shadow-none">
          <CardHeader className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-xl sm:text-2xl">Kết quả bài thi</CardTitle>
                <CardDescription className="line-clamp-2">
                  {exam?.title}
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className={passed ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}
              >
                {passed ? "ĐẠT" : "KHÔNG ĐẠT"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-xl border bg-muted/20 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Điểm tổng
                  </span>
                </div>
                <div className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                  {percentage}%
                </div>
              </div>
              <div className="mt-3">
                <Progress value={percentage} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Hệ thống đã ghi nhận kết quả và cập nhật tiến độ học tập của bạn.
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" onClick={() => router.back()}>
                Quay lại bài học
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="default" onClick={() => setIsReviewMode(true)}>
                  <History className="mr-2 size-4" />
                  Xem lại bài làm
                </Button>
                {!passed && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAttemptId(null);
                      setAnswers({});
                      setCurrentQuestionIndex(0);
                    }}
                  >
                    Làm lại
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Question Runner UI
  const sections = exam?.sections || [];
  const allExamQuestions = sections.flatMap((s: any) => s.questions || s.examQuestions || []);
  const currentExamQuestion = allExamQuestions[currentQuestionIndex];
  const question = currentExamQuestion?.question;

  if (!question) {
    return <div className="p-20 text-center">Không tìm thấy câu hỏi</div>;
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
       <header className="bg-background border-b h-16 flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="w-5 h-5" />
             </Button>
             <div>
                <h1 className="font-bold text-foreground line-clamp-1">{exam?.title}</h1>
                <p className="text-xs text-muted-foreground">Câu {currentQuestionIndex + 1} / {allExamQuestions.length}</p>
             </div>
          </div>

          <div className="flex items-center gap-6">
             {timeLeft !== null && (
                 <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${timeLeft < 60 ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-muted text-foreground'}`}>
                   <Timer className="w-4 h-4" />
                   <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                </div>
             )}
             {isReviewMode ? (
                <Button variant="outline" onClick={() => setIsReviewMode(false)}>
                   <X className="w-4 h-4 mr-2" />
                   Thoát xem lại
                </Button>
             ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmit}>
                   <Send className="w-4 h-4 mr-2" />
                   Nộp bài
                </Button>
             )}
          </div>
       </header>

       <div className="flex-1 max-w-5xl w-full mx-auto p-6 flex gap-8">
          <div className="flex-1 space-y-6">
             <Card className="border-none shadow-sm">
                <CardHeader>
                   <CardDescription className="text-xs text-primary font-bold uppercase tracking-wider">
                      {currentExamQuestion.section?.title || "Câu hỏi"} | {question.level || "—"}
                   </CardDescription>

                   {/* Question Media (Audio/Image) */}
                   {question.mediaUrl && (
                      <div className="mt-4">
                         {question.categoryType === 'LISTENING' ? (
                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col gap-3">
                               <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                                  <Volume2 className="w-3.5 h-3.5" />
                                  File nghe câu hỏi
                               </div>
                               <audio 
                                 src={question.mediaUrl} 
                                 controls 
                                 className="w-full h-10"
                                 autoPlay={false}
                               />
                            </div>
                         ) : (
                            <div className="rounded-xl overflow-hidden border bg-white p-1 shadow-sm max-w-2xl mx-auto">
                               <div className="flex items-center gap-2 text-muted-foreground font-bold text-[10px] uppercase tracking-wider p-2 border-b bg-muted/30">
                                  <ImageIcon className="w-3 h-3" />
                                  Hình ảnh minh họa
                               </div>
                               <img 
                                 src={question.mediaUrl} 
                                 alt="Question media" 
                                 className="w-full h-auto object-contain max-h-[400px]"
                               />
                            </div>
                         )}
                      </div>
                   )}

                   <div className="text-lg font-medium text-foreground pt-4 whitespace-pre-wrap">
                      {question.stem}
                   </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {question.passage && (
                       <div className="p-5 bg-muted/40 rounded-xl border border-border/50 text-sm italic leading-relaxed mb-6">
                          {question.passage}
                       </div>
                    )}

                   {question.questionType === 'SINGLE_CHOICE' && (
                      <RadioGroup 
                        value={answers[question.id] || ""} 
                        onValueChange={(v) => !isReviewMode && saveAnswer(question.id, v)}
                        className="space-y-3"
                      >
                          {question.options?.map((opt: any) => {
                             const isSelected = answers[question.id] === opt.optionKey;
                             const isCorrect = opt.isCorrect;
                             
                             let borderClass = "border-border bg-background";
                             if (isReviewMode) {
                                if (isCorrect) borderClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/20";
                                else if (isSelected) borderClass = "border-red-500 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/20";
                             } else if (isSelected) {
                                borderClass = "border-primary bg-primary/5 ring-1 ring-primary/20";
                             }

                             return (
                                <div key={opt.optionKey} className={`flex items-center gap-3 p-4 border rounded-xl transition-all ${!isReviewMode ? 'hover:bg-muted' : ''} ${borderClass}`}>
                                   <RadioGroupItem value={opt.optionKey} id={opt.optionKey} disabled={isReviewMode} />
                                   <Label htmlFor={opt.optionKey} className="flex-1 cursor-pointer font-medium flex items-center justify-between">
                                      <span>{opt.optionKey}. {opt.content}</span>
                                      {isReviewMode && (
                                         <div className="flex items-center gap-2">
                                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            {isSelected && !isCorrect && <X className="w-4 h-4 text-red-500" />}
                                            {isSelected && <span className="text-[10px] font-bold uppercase text-muted-foreground ml-2">(Lựa chọn của bạn)</span>}
                                         </div>
                                      )}
                                   </Label>
                                </div>
                             );
                          })}
                      </RadioGroup>
                   )}

                   {question.questionType === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-3">
                         {question.options?.map((opt: any) => (
                            <div key={opt.optionKey} className="flex items-center gap-3 p-4 border rounded-xl bg-background hover:bg-muted transition-all">
                               <Checkbox 
                                 id={opt.optionKey}
                                 disabled={isReviewMode}
                                 checked={(answers[question.id] || []).includes(opt.optionKey)}
                                 onCheckedChange={(checked) => {
                                    if (isReviewMode) return;
                                    const current = answers[question.id] || [];
                                    const next = checked 
                                      ? [...current, opt.optionKey]
                                      : current.filter((v: string) => v !== opt.optionKey);
                                    saveAnswer(question.id, next);
                                 }}
                               />
                               <Label htmlFor={opt.optionKey} className="flex-1 cursor-pointer font-medium">{opt.optionKey}. {opt.content}</Label>
                            </div>
                         ))}
                      </div>
                   )}

                   {question.questionType === 'TRUE_FALSE' && (
                      <div className="flex gap-4">
                         {['TRUE', 'FALSE'].map(v => (
                            <Button 
                              key={v}
                              variant={answers[question.id] === v ? 'default' : 'outline'}
                              className="flex-1 h-14 text-lg font-bold"
                              onClick={() => !isReviewMode && saveAnswer(question.id, v)}
                              disabled={isReviewMode}
                            >
                               {v === 'TRUE' ? 'ĐÚNG' : 'SAI'}
                            </Button>
                         ))}
                      </div>
                   )}
                </CardContent>

                    {isReviewMode && question.explanation && (
                       <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-2xl animate-in fade-in slide-in-from-top-2 text-left">
                          <div className="flex items-center gap-2 mb-2 text-primary">
                             <HelpCircle className="w-4 h-4" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Giải thích chi tiết</span>
                          </div>
                          <div className="text-sm text-foreground leading-relaxed italic">
                             {question.explanation}
                          </div>
                       </div>
                    )}

             </Card>

             <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(i => i - 1)}
                >
                   <ChevronLeft className="w-4 h-4 mr-2" /> Câu trước
                </Button>
                
                <div className="text-sm text-muted-foreground bg-background px-4 py-1.5 rounded-full border">
                   Đã trả lời {Object.keys(answers).length} / {allExamQuestions.length}
                </div>

                <Button 
                   onClick={() => {
                     if (currentQuestionIndex < allExamQuestions.length - 1) {
                        setCurrentQuestionIndex(i => i + 1);
                     } else if (isReviewMode) {
                        setIsReviewMode(false);
                     } else {
                        handleSubmit();
                     }
                   }}
                  className={currentQuestionIndex === allExamQuestions.length - 1 ? 'bg-emerald-600' : ''}
                >
                   {currentQuestionIndex === allExamQuestions.length - 1 ? (isReviewMode ? "Đóng" : "Kết thúc bài thi") : "Câu tiếp theo"}
                   {!(currentQuestionIndex === allExamQuestions.length - 1 && isReviewMode) && <ChevronRight className="w-4 h-4 ml-2" />}

                </Button>
             </div>
          </div>

          <aside className="w-[300px] hidden lg:block space-y-6">
             <Card className="border-none shadow-sm h-[calc(100vh-140px)] flex flex-col">
                <CardHeader>
                   <CardTitle className="text-sm flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      Danh sách câu hỏi
                   </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 pt-0">
                   <div className="grid grid-cols-5 gap-2">
                      {allExamQuestions.map((_, i) => (
                         <button
                           key={i}
                           onClick={() => setCurrentQuestionIndex(i)}
                           className={`h-9 w-9 rounded-lg text-xs font-bold transition-all border
                             ${currentQuestionIndex === i ? 'bg-primary text-white border-primary border-2 scale-110 shadow-md' : 
                               answers[allExamQuestions[i].questionId] ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' : 
                               'bg-background text-muted-foreground hover:bg-muted'}
                           `}
                         >
                            {i + 1}
                         </button>
                      ))}
                   </div>
                </CardContent>
                <div className="p-4 bg-muted/30 border-t">
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                         <div className="h-3 w-3 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50"></div>
                         <span>Đã làm</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                         <div className="h-3 w-3 rounded bg-background border"></div>
                         <span>Chưa làm</span>
                      </div>
                   </div>
                </div>
             </Card>
          </aside>
       </div>

       <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent className="max-w-[400px]">
             <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                   <AlertTriangle className="w-5 h-5 text-amber-500" />
                   Xác nhận nộp bài?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground pt-2">
                   Bạn có chắc chắn muốn nộp bài thi không? Sau khi nộp, bạn sẽ không thể thay đổi câu trả lời.
                </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter className="pt-4">
                <AlertDialogCancel className="font-bold border-none hover:bg-muted">Hủy</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
                >
                   Nộp bài ngay
                </AlertDialogAction>
             </AlertDialogFooter>
          </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
