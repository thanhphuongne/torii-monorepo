'use client';

import { useState, useCallback, useEffect, useRef, useMemo, type SyntheticEvent } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { endOfDay, isBefore } from 'date-fns';
import { useAcademyClass, useCurriculum, type CurriculumLesson, type CurriculumModule } from '@/lib/api/services/academy-classes';
import { useAcademyVodPackage, useAcademyVodCurriculum, useAcademyVodEnrollmentCheck, useAcademyVodCompletedLessonIds, academyVodLearningProgressApi } from '@/lib/api/services/academy-vod';
import { useAcademyEnrollmentCheck } from '@/lib/api/services/academy-enrollment-api';
import { useAcademyCompletedLessonIds, academyLearningProgressApi } from '@/lib/api/services/academy-learning-progress-api';
import { useAcademyLesson } from '@/lib/api/services/academy-lesson-api';
import { useAcademyLearnerAssessmentStatus, type AcademyAssessmentStatus } from '@/lib/api/services/academy-assessment-plan-api';
import { Progress } from '@workspace/ui/components/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@workspace/ui/components/accordion';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Separator } from '@workspace/ui/components/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@workspace/ui/components/avatar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import { toast } from '@workspace/ui/components/sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@workspace/ui/lib/utils';
import {
    ChevronLeft, CheckCircle2, PlayCircle, Lock, FileText, BookOpen,
    MessageSquare, ChevronRight, Download, Send,
    AlertCircle, Clock, Trophy, HelpCircle, Timer, RotateCcw,
    Paperclip, PenTool, MessageCircle, Menu, X, ChevronDown, LogOut,
    Sparkles
} from 'lucide-react';
import type { AcademyLessonModel } from '@workspace/schemas';
import { LessonDiscussion } from '@/components/courses/lesson-discussion';
import { LessonAIAssistant } from '@/components/courses/lesson-ai-assistant';
import { TextSelectionToolbar } from '@/components/courses/text-selection-toolbar';
import { AcademyResourceList } from '@/components/courses/academy-resource-list';
import { CourseCompletionModal } from '@/components/courses/course-completion-modal';
import { MarkdownRenderer } from '@/components/common/markdown-renderer';
import { isVodDeliveryFromEnrollment } from '@/lib/academy/is-vod-delivery';
import { useAppDispatch, useAppSelector } from '@/hooks/hooks';
import { logout } from '@/store/slices/authSlice';


// ─── Constants & Utils ────────────────────────────────────────────────────────
const EMPTY_IDS: string[] = [];
/** Stable empty array — `data ?? []` in render creates a new [] each time and breaks useCallback/useEffect deps. */
const EMPTY_ASSESSMENT_STATUS: AcademyAssessmentStatus[] = [];

function normalizeItemKind(kind?: string) {
    return (kind || '').toUpperCase();
}

function isTrackableLessonKind(kind?: string) {
    const k = normalizeItemKind(kind);
    return k === 'VIDEO' || k === 'READING';
}

function lessonProgressId(lesson: { id: string; referenceId?: string | null }) {
    return lesson.id;
}

function fmtDuration(seconds?: number) {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Components ─────────────────────────────────────────────────────────────

function LessonIcon({ lesson, isActive, isCompleted, unlocked }: {
    lesson: any; isActive: boolean; isCompleted: boolean; unlocked: boolean;
}) {
    if (!unlocked) return <Lock className="size-3.5 text-muted-foreground/30 shrink-0" />;
    if (isCompleted) return <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />;

    const kind = normalizeItemKind(lesson.kind);
    switch (kind) {
        case 'VIDEO': return <PlayCircle className={cn("size-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />;
        case 'READING': return <BookOpen className={cn("size-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />;
        default: return <FileText className={cn("size-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />;
    }
}

function MilestoneItem({ milestone, onClick, forceLocked }: {
    milestone: any;
    onClick: () => void;
    forceLocked?: boolean;
    compact?: boolean;
}) {
    const isLocked = forceLocked || milestone.status === 'LOCKED';
    const isPassed = milestone.status === 'PASSED';
    const compact = !!(arguments[0] as any)?.compact;

    return (
        <Button
            variant="ghost"
            className={cn(
                "w-full justify-start h-auto gap-3 rounded-lg border border-transparent transition-all group",
                compact ? "py-2 px-2.5" : "py-3 px-3",
                isLocked && "opacity-50 grayscale pointer-events-none"
            )}
            onClick={onClick}
            disabled={isLocked}
        >
            <div className={cn(
                "rounded-full flex items-center justify-center shrink-0 border border-border bg-background group-hover:border-primary/30 transition-colors",
                compact ? "size-7" : "size-8",
                isPassed && "border-emerald-200 bg-emerald-50 text-emerald-600",
            )}>
                {isPassed ? <Trophy className={cn(compact ? "size-3.5" : "size-4")} /> : <FileText className={cn(compact ? "size-3.5" : "size-4")} />}
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tight leading-none mb-1">
                    {milestone.kind === 'FINAL_EXAM' ? 'Thử thách cuối khóa' : 'Bài kiểm tra'}
                </p>
                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                    {milestone.examTitle || milestone.title}
                </p>
                {isPassed && milestone.percentage !== undefined && (
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-tight">
                        {Math.round(milestone.percentage)}% Đạt
                    </span>
                )}
            </div>
            {isPassed ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
            ) : !isLocked && (
                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform" />
            )}
        </Button>
    );
}

function ModuleItem({ mod, currentLessonId, completedIds, isLessonUnlocked, milestones, onSelectMilestone, onSelectLesson }: {
    mod: any;
    currentLessonId: string | null;
    completedIds: Set<string>;
    isLessonUnlocked: (l: any) => boolean;
    milestones: any[];
    onSelectMilestone: (m: any) => void;
    onSelectLesson: (l: any) => void;
}) {
    const hasActive = mod.lessons?.some((l: any) => l.id === currentLessonId);
    const totalLessonsInModule = mod.lessons?.length || 0;
    const completedLessonsInModule = (mod.lessons || []).filter((lesson: any) =>
        completedIds.has(lessonProgressId(lesson))
    ).length;
    const moduleMilestones =
        milestones?.filter((m) => {
            if (m.moduleId !== mod.id) return false;
            if (m.triggerLessonId) return false; // module-level only
            const kind = normalizeItemKind(m.kind);
            // Backward/forward compatible kinds from backend
            return kind === 'MODULE_CHECKPOINT' || kind === 'MODULE_TEST' || kind === 'MODULE_EXAM';
        }) || [];


    return (
        <AccordionItem value={mod.id} className="border-none px-2">
            <AccordionTrigger className={cn(
                "hover:no-underline py-3 px-3 rounded-lg transition-all group text-left",
                hasActive && "bg-primary/5"
            )}>
                <div className="flex flex-col items-start gap-1 min-w-0">
                    <span className={cn("text-sm font-semibold group-hover:text-primary transition-colors", hasActive && "text-primary")}>
                        {mod.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-semibold opacity-60">
                        {completedLessonsInModule}/{totalLessonsInModule} bài học
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-3 space-y-1 relative overflow-visible">
                {mod.lessons?.map((lesson: any) => {
                    const isActive = lesson.id === currentLessonId;
                    const isDone = completedIds.has(lessonProgressId(lesson));
                    const unlocked = isLessonUnlocked(lesson);
                    const lessonMilestones = milestones?.filter(m =>
                        (m.triggerLessonId && (m.triggerLessonId === lesson.id || m.triggerLessonId === lesson.referenceId))
                    ) || [];


                    return (
                        <div key={lesson.id} className="px-1">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start h-auto py-2.5 px-3 gap-3 rounded-md border border-transparent transition-all",
                                    isActive && "bg-accent/50 border-accent text-accent-foreground",
                                    !isActive && "hover:bg-muted/80"
                                )}
                                onClick={() => onSelectLesson(lesson)}
                                disabled={!unlocked}
                            >
                                <LessonIcon lesson={lesson} isActive={isActive} isCompleted={isDone} unlocked={unlocked} />
                                <div className="flex flex-col items-start min-w-0 text-left">
                                    <span className={cn(
                                        "text-xs font-semibold truncate",
                                        isActive ? "text-primary" : "text-foreground/80",
                                        !unlocked && "opacity-40"
                                    )}>
                                        {lesson.title}
                                    </span>
                                    {lesson.videoDuration ? (
                                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                                            <Clock className="size-2.5" />
                                            {fmtDuration(lesson.videoDuration)}
                                        </span>
                                    ) : null}
                                </div>
                                {isActive && <div className="size-1.5 rounded-full bg-primary ml-auto shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
                            </Button>

                            {lessonMilestones.map(m => (
                                <div key={m.assessmentId} className="pl-6 mt-1 border-l-2 border-primary/10 ml-5 relative z-10">
                                    <MilestoneItem
                                        milestone={m}
                                        forceLocked={!isDone}
                                        compact
                                        onClick={() => onSelectMilestone(m)}
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })}

                {moduleMilestones.length > 0 && (
                    <div className="mx-2 mt-3 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
                        <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider px-1">Bài kiểm tra</p>
                        {moduleMilestones.map((m) => {
                            const moduleLessons = mod.lessons || [];
                            const canOpenModuleMilestone =
                                moduleLessons.length > 0 &&
                                moduleLessons.every((lesson: any) =>
                                    completedIds.has(lessonProgressId(lesson))
                                );
                            return (
                                <MilestoneItem
                                    key={m.assessmentId}
                                    milestone={m}
                                    forceLocked={!canOpenModuleMilestone}
                                    compact
                                    onClick={() => onSelectMilestone(m)}
                                />
                            );
                        })}
                    </div>
                )}
            </AccordionContent>
        </AccordionItem>
    );
}

function VideoPlayer({ lesson, onComplete, onProgress }: { lesson: any; onComplete: () => void; onProgress?: (time: number) => void }) {
    const autoMarkedRef = useRef(false);
    useEffect(() => { autoMarkedRef.current = false; }, [lesson?.id]);

    const markOnce = useCallback(() => {
        if (autoMarkedRef.current) return;
        autoMarkedRef.current = true;
        onComplete();
    }, [onComplete]);

    const onTimeUpdate = (e: any) => {
        const v = e.currentTarget;
        if (v.duration && v.currentTime / v.duration >= 0.95) markOnce();
        onProgress?.(v.currentTime);
    };

    if (!lesson?.videoUrl) return (
        <div className="aspect-video bg-muted/40 flex items-center justify-center rounded-xl border border-dashed m-4">
            <div className="text-center space-y-3 px-4">
                <div className="size-12 rounded-full bg-background flex items-center justify-center mx-auto border shadow-sm">
                    <PlayCircle className="size-6 text-muted-foreground/30" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground/60 italic">Nội dung bài học đang được xử lý...</p>
            </div>
        </div>
    );

    return (
        <div className="relative aspect-video bg-black overflow-hidden shadow-2xl xl:rounded-xl ring-1 ring-white/10 group/player">
            <video
                key={lesson?.id}
                src={lesson?.videoUrl}
                className="w-full h-full object-contain"
                controls
                controlsList="nodownload"
                onEnded={markOnce}
                onTimeUpdate={onTimeUpdate}
                playsInline
                preload="auto"
            />
        </div>
    );
}

function ArticleViewer({ lesson, onComplete, onPrev, onNext, navDisabledPrev, navDisabledNext, isCompleted }: any) {
    return (
        <article className="animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-in-out">
            <div className="max-w-3xl mx-auto space-y-12">

                {lesson?.content ? (
                    <MarkdownRenderer
                        content={lesson.content}
                        className="prose prose-slate dark:prose-invert max-w-none prose-p:text-base prose-p:leading-relaxed prose-headings:font-bold prose-img:rounded-2xl prose-img:shadow-lg prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl"
                    />
                ) : (
                    <p className="text-muted-foreground italic text-lg text-center py-20">
                        Nội dung đang được soạn thảo...
                    </p>
                )}

                <div className="mt-3 flex justify-end">
                    <Button
                        onClick={onComplete}
                        variant="link"
                        size="sm"
                        className="h-auto px-0 text-sm font-medium"
                        disabled={isCompleted}
                    >
                        {isCompleted ? "Đã hoàn thành" : "Xác nhận hoàn thành"}
                    </Button>
                </div>
            </div>
        </article>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseLearnPage() {
    const params = useParams<{ courseId: string }>();
    const deliveryTargetId = params.courseId;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const requestedMode = searchParams.get('mode')?.toUpperCase();
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const hasHandledForbiddenRef = useRef(false);
    const lessonQueryParam = searchParams.get('lesson');

    const { data: enrollmentData, error: enrollmentError } = useAcademyEnrollmentCheck(deliveryTargetId);

    // ── API (Strict mode by Enrollment) ───────────────────────────────────
    // Nguồn sự thật để quyết định LIVE vs VOD là Enrollment (vodPackageId/liveClassId/type/mode),
    // không suy đoán bằng 403/404 fallback.
    const enrollment = enrollmentData?.enrollment;
    const isVodCandidate = isVodDeliveryFromEnrollment(enrollment, requestedMode);

    const { data: liveClassData, isLoading: liveClassLoading, error: liveClassError } = useAcademyClass(deliveryTargetId, { enabled: !isVodCandidate });
    const { data: liveCurriculum, isLoading: liveCurriculumLoading, error: liveCurriculumError } = useCurriculum(deliveryTargetId, { enabled: !isVodCandidate });

    const { data: vodPackageData, isLoading: vodLoading } = useAcademyVodPackage(deliveryTargetId, { enabled: isVodCandidate });
    const { data: vodCurriculum, isLoading: vodCurriculumLoading } = useAcademyVodCurriculum(deliveryTargetId, { enabled: isVodCandidate });

    const classData = isVodCandidate ? vodPackageData : liveClassData;
    const curriculum = isVodCandidate ? vodCurriculum : liveCurriculum;

    const isModeDetermined = !!enrollmentData;

    const { data: liveCompletedIds } = useAcademyCompletedLessonIds(deliveryTargetId ?? '', { enabled: !isVodCandidate });
    const { data: vodCompletedIds } = useAcademyVodCompletedLessonIds(deliveryTargetId ?? '', { enabled: isVodCandidate });

    const isDataLoading = isVodCandidate
        ? (vodLoading || vodCurriculumLoading)
        : (liveClassLoading || liveCurriculumLoading);

    const isLoading = !isModeDetermined || isDataLoading;

    // 5. Completed Lessons check
    const completedContentItemIds = isVodCandidate
        ? (vodCompletedIds ?? EMPTY_IDS)
        : (liveCompletedIds ?? EMPTY_IDS);

    // ── Milestones ────────────────────────────────────────────────────────
    const { data: milestonesData } = useAcademyLearnerAssessmentStatus({
        deliveryTargetId,
        enrollmentId: enrollmentData?.enrollment?.id,
    });
    const milestones = milestonesData ?? EMPTY_ASSESSMENT_STATUS;

    // ── State ──────────────────────────────────────────────────────────────
    const [currentLesson, setCurrentLesson] = useState<CurriculumLesson | null>(null);
    // expandedModules: null means "not yet initialized" so we expand all after curriculum loads
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'discussion' | 'resources'>('content');
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [pendingMilestone, setPendingMilestone] = useState<any | null>(null);
    const [lessonVideoTime, setLessonVideoTime] = useState<number>(0);


    useEffect(() => {
        // Handle explicit forbidden/unauthorized from enrollment check
        const isForbiddenEnrollment = (enrollmentError as any)?.response?.status === 403 ||
            (!isLoading && enrollmentData && !enrollmentData.isEnrolled);

        if (!hasHandledForbiddenRef.current && isForbiddenEnrollment) {
            hasHandledForbiddenRef.current = true;
            toast.error('Bạn không có quyền truy cập hoặc chưa được ghi danh vào lớp học này.');
            router.replace('/dashboard/my-courses');
            return;
        }

        // Handle case where course is truly not found (only if not loading)
        const isNotFound =
            !isLoading &&
            !classData &&
            (isVodCandidate
                ? !vodLoading && !vodPackageData
                : !liveClassLoading && !liveClassData);


        if (!hasHandledForbiddenRef.current && isNotFound) {
            hasHandledForbiddenRef.current = true;
            toast.error('Không tìm thấy thông tin lớp học.');
            router.replace('/dashboard/my-courses');
        }
    }, [
        enrollmentData,
        enrollmentError,
        isLoading,
        classData,
        isVodCandidate,
        vodLoading,
        vodPackageData,
        liveClassLoading,
        liveClassData,
        router,
    ]);

    // ── Computed data & State ─────────────────────────────────────────────
    const completedIds = useMemo(() => new Set<string>(completedContentItemIds), [completedContentItemIds]);

    // ── Sorting Logic ──────────────────────────────────────────────────────
    const sortedModules = useMemo(() => {
        if (!curriculum) return [];
        return [...(curriculum.modules ?? [])]
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((mod: any) => ({
                ...mod,
                lessons: [...mod.lessons].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            }));
    }, [curriculum]);

    const allLessons: CurriculumLesson[] = useMemo(() =>
        sortedModules.flatMap((m: any) => m.lessons),
        [sortedModules]
    );

    const trackableOrdered = useMemo(
        () => allLessons.filter((l) => isTrackableLessonKind(l.kind)),
        [allLessons],
    );

    const moduleOrderMap = useMemo(() => {
        const map = new Map<string, number>();
        sortedModules.forEach((mod: any, idx: number) => {
            map.set(mod.id, mod.order ?? idx);
        });
        return map;
    }, [sortedModules]);

    const lessonOrderMeta = useMemo(() => {
        const map = new Map<string, { moduleOrder: number; lessonOrder: number; moduleId: string }>();
        sortedModules.forEach((mod: any, modIdx: number) => {
            const moduleOrder = mod.order ?? modIdx;
            (mod.lessons || []).forEach((lesson: any, lessonIdx: number) => {
                const meta = {
                    moduleOrder,
                    lessonOrder: lesson.order ?? lessonIdx,
                    moduleId: mod.id,
                };
                map.set(lesson.id, meta);
                if (lesson.referenceId) {
                    map.set(lesson.referenceId, meta);
                }
            });

        });
        return map;
    }, [sortedModules]);

    const isSequentialUnlocked = useCallback(
        (lesson: CurriculumLesson) => {
            // Live classes don't require sequential learning
            if (!isVodCandidate) return true;

            if (!isTrackableLessonKind(lesson.kind)) return true;
            const idx = trackableOrdered.findIndex((l) => l.id === lesson.id);
            if (idx <= 0) return true;
            const prev = trackableOrdered[idx - 1];
            return prev ? completedIds.has(lessonProgressId(prev)) : true;
        },
        [isVodCandidate, trackableOrdered, completedIds],
    );

    const hasBlockingRequiredMilestoneBeforeLesson = useCallback(
        (lesson: CurriculumLesson) => {
            // Live classes don't have blocking milestones for lesson access
            if (!isVodCandidate) return false;

            const lessonMeta = lessonOrderMeta.get(lesson.id);
            if (!lessonMeta) return false;

            return milestones.some((m: AcademyAssessmentStatus) => {
                const kind = normalizeItemKind(m.kind);
                if (!m?.isRequired) return false;
                if (m.status === 'PASSED') return false;

                if (kind === 'LESSON_CHECKPOINT' && m.triggerLessonId) {
                    const triggerMeta = lessonOrderMeta.get(m.triggerLessonId);
                    if (!triggerMeta) return false;
                    if (triggerMeta.moduleOrder < lessonMeta.moduleOrder) return true;
                    return (
                        triggerMeta.moduleId === lessonMeta.moduleId &&
                        triggerMeta.lessonOrder < lessonMeta.lessonOrder
                    );
                }

                if (kind === 'MODULE_CHECKPOINT' && m.moduleId) {
                    const milestoneModuleOrder = moduleOrderMap.get(m.moduleId);
                    if (milestoneModuleOrder === undefined) return false;
                    return milestoneModuleOrder < lessonMeta.moduleOrder;
                }

                return false;
            });

        },
        [lessonOrderMeta, milestones, moduleOrderMap],
    );

    const effectiveLessonUnlocked = useCallback(
        (lesson: CurriculumLesson) =>
            lesson.isUnlocked &&
            isSequentialUnlocked(lesson) &&
            !hasBlockingRequiredMilestoneBeforeLesson(lesson),
        [hasBlockingRequiredMilestoneBeforeLesson, isSequentialUnlocked],
    );

    const currentLessonKind = normalizeItemKind(currentLesson?.kind);
    const shouldFetchLessonDetail = !!currentLesson?.referenceId;

    // ── Load curriculum → sync selected lesson ────────────────────────────
    useEffect(() => {
        if (!curriculum) return;

        const flat = curriculum.modules.flatMap((m: any) => m.lessons) as CurriculumLesson[];
        const requestedLessonId = lessonQueryParam;
        const findModuleIdByLessonId = (lessonId: string) =>
            curriculum.modules.find((m: any) => (m.lessons || []).some((l: any) => l.id === lessonId))?.id;

        const pickDefaultLesson = (): CurriculumLesson | null => {
            let pick: CurriculumLesson | null = null;
            for (const lesson of flat) {
                const completed = isTrackableLessonKind(lesson.kind)
                    ? completedIds.has(lessonProgressId(lesson))
                    : false;
                if (effectiveLessonUnlocked(lesson) && !completed) {
                    pick = lesson;
                    break;
                }
            }
            if (!pick) pick = curriculum.modules[0]?.lessons[0] ?? null;
            return pick;
        };

        const replaceLessonQuery = (lessonId: string) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set('lesson', lessonId);
            const q = next.toString();
            router.replace(q ? `${pathname}?${q}` : pathname);
        };

        if (requestedLessonId) {
            const requested = flat.find((l) => l.id === requestedLessonId) ?? null;
            if (requested && effectiveLessonUnlocked(requested)) {
                setCurrentLesson(requested);
                const moduleId = findModuleIdByLessonId(requested.id);
                if (moduleId) setExpandedModules(new Set([moduleId]));
                return;
            }
            const pick = pickDefaultLesson();
            setCurrentLesson(pick);
            if (pick) {
                const moduleId = findModuleIdByLessonId(pick.id);
                if (moduleId) setExpandedModules(new Set([moduleId]));
            }
            if (pick) replaceLessonQuery(pick.id);
        } else {
            setCurrentLesson((prev) => {
                const next = prev ? prev : pickDefaultLesson();
                if (next) {
                    const moduleId = findModuleIdByLessonId(next.id);
                    if (moduleId) {
                        // Không gọi setExpandedModules trong updater của setState khác (impure); defer ra microtask.
                        queueMicrotask(() => setExpandedModules(new Set([moduleId])));
                    }
                }
                return next;
            });
        }
        // Không depend vào `searchParams` (object có thể đổi identity mỗi render trên Next.js) — chỉ cần lessonQueryParam.
    }, [curriculum, lessonQueryParam, completedContentItemIds, effectiveLessonUnlocked, router, pathname]);

    // ── Check Course Completion ───────────────────────────────────────────
    useEffect(() => {
        if (!deliveryTargetId || !classData || allLessons.length === 0) return;
        const trackable = allLessons.filter(l => isTrackableLessonKind(l.kind));
        const total = trackable.length;
        const done = trackable.filter(l => completedIds.has(lessonProgressId(l))).length;
        const allMilestonesPassed = milestones.length === 0 || milestones.every(m => m.status === 'PASSED');

        if (total > 0 && done === total && allMilestonesPassed) {
            // For LIVE classes, wait until endDate
            if (!isVodCandidate) {
                const endDateString = (classData as any)?.cohort?.endDate || (classData as any)?.endDate;
                if (endDateString && isBefore(new Date(), endOfDay(new Date(endDateString)))) return;
            }

            const key = `course_completed_${deliveryTargetId}`;
            if (!localStorage.getItem(key)) {
                setShowCompletionModal(true);
                localStorage.setItem(key, 'true');
            }
        }
    }, [deliveryTargetId, classData, allLessons, completedIds, isVodCandidate, milestones]);

    // ── Lesson Details ────────────────────────────────────────────────────
    const { data: lessonDetail, isLoading: lessonLoading } = useAcademyLesson(
        currentLesson?.referenceId ?? '',
        { enabled: shouldFetchLessonDetail },
    );

    // ── Actions ────────────────────────────────────────────────────────────
    const markLessonComplete = useCallback(async () => {
        if (!currentLesson || !isTrackableLessonKind(currentLesson.kind)) return;
        if (completedIds.has(lessonProgressId(currentLesson))) return;

        try {
            if (isVodCandidate) {
                await academyVodLearningProgressApi.trackProgress({ lessonId: currentLesson.id, packageId: deliveryTargetId! });
                await queryClient.invalidateQueries({ queryKey: ['academy-vod-learning', 'completed-lessons', deliveryTargetId] });
            } else {
                await academyLearningProgressApi.trackProgress({ lessonId: currentLesson.id, liveClassId: deliveryTargetId! });
                await queryClient.invalidateQueries({ queryKey: ['academy-learning', 'completed-lessons', deliveryTargetId] });
            }
            toast.success('Bài học đã hoàn thành! 🎉');

            // Nếu có bài kiểm tra (milestone) gắn với lesson/module vừa hoàn thành, tự gợi ý ngay để user không bị "kẹt" (đặc biệt trên mobile).
            const justCompletedId = currentLesson.id;
            const justCompletedRef = (currentLesson as any)?.referenceId;
            const completedNow = new Set(completedIds);
            completedNow.add(justCompletedId);

            const lessonTriggered = milestones.find((m: any) => {
                const kind = normalizeItemKind(m.kind);
                if (!m?.examId) return false;
                if (m.status === 'PASSED') return false;
                if (!m.triggerLessonId) return false;
                if (kind !== 'LESSON_CHECKPOINT') return false;
                return m.triggerLessonId === justCompletedId || (justCompletedRef && m.triggerLessonId === justCompletedRef);
            }) as any | undefined;

            const moduleMeta = lessonOrderMeta.get(justCompletedId) || (justCompletedRef ? lessonOrderMeta.get(justCompletedRef) : undefined);
            const currentModuleId = moduleMeta?.moduleId;
            const moduleLessons = currentModuleId ? (sortedModules.find((mod: any) => mod.id === currentModuleId)?.lessons || []) : [];
            const moduleAllDone =
                moduleLessons.length > 0 &&
                moduleLessons.every((l: any) => {
                    const id = lessonProgressId(l);
                    return completedNow.has(id);
                });

            const moduleTriggered = moduleAllDone
                ? (milestones.find((m: any) => {
                    const kind = normalizeItemKind(m.kind);
                    if (!m?.examId) return false;
                    if (m.status === 'PASSED') return false;
                    if (m.triggerLessonId) return false;
                    if (!currentModuleId || m.moduleId !== currentModuleId) return false;
                    return kind === 'MODULE_CHECKPOINT' || kind === 'MODULE_TEST' || kind === 'MODULE_EXAM';
                }) as any | undefined)
                : undefined;

            const nextMilestone = lessonTriggered || moduleTriggered;
            if (nextMilestone) {
                if (currentModuleId) setExpandedModules(new Set([currentModuleId]));
                setSidebarOpen(true);
                setPendingMilestone(nextMilestone);
            }
        } catch (e: any) {
            toast.error(e?.userMessage || 'Lỗi cập nhật tiến độ.');
        }
    }, [currentLesson, completedIds, queryClient, deliveryTargetId, isVodCandidate, milestones, lessonOrderMeta, sortedModules]);

    const currentIndex = currentLesson ? allLessons.findIndex(l => l.id === currentLesson.id) : -1;
    const prevLesson = currentIndex > 0 ? (allLessons[currentIndex - 1] ?? null) : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? (allLessons[currentIndex + 1] ?? null) : null;
    const updateLessonQuery = useCallback((lessonId: string) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set('lesson', lessonId);
        const q = next.toString();
        router.replace(q ? `${pathname}?${q}` : pathname);
    }, [searchParams, router, pathname]);

    const goTo = (lesson: CurriculumLesson | null) => {
        if (lesson && effectiveLessonUnlocked(lesson)) {
            setCurrentLesson(lesson);
            updateLessonQuery(lesson.id);
            setSidebarOpen(false);
            const k = normalizeItemKind(lesson.kind);
            setActiveTab(k === 'READING' ? 'discussion' : 'content');
            setLessonVideoTime(0);
        }
    };

    const handleOpenMilestoneConfirm = (milestone: any) => {
        setPendingMilestone(milestone);
    };

    const handleConfirmMilestone = () => {
        if (!pendingMilestone?.examId) return;
        const eid = enrollmentData?.enrollment?.id;
        if (!eid) {
            toast.error('Không xác định được ghi danh khóa học. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.');
            setPendingMilestone(null);
            return;
        }
        const qs = new URLSearchParams();
        qs.set('enrollmentId', eid);
        if (pendingMilestone.latestAttemptId) {
            qs.set('attemptId', pendingMilestone.latestAttemptId);
        }
        const q = qs.toString();
        const target = `/exams/${pendingMilestone.examId}${q ? `?${q}` : ''}`;
        setPendingMilestone(null);
        router.push(target);
    };

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            toast.success('Đăng xuất thành công');
        } catch {
            toast.error('Có lỗi khi đăng xuất');
        } finally {
            router.push('/login');
        }
    };


    // ── Final Progress Stats ──────────────────────────────────────────────
    const trackableLessons = trackableOrdered;
    const totalTrackableLessons = trackableLessons.length;
    const completedLessonsCount = trackableLessons.filter(l => completedIds.has(lessonProgressId(l))).length;
    const passedMilestonesCount = milestones.filter(m => m.status === 'PASSED').length;
    const totalLessons = totalTrackableLessons + milestones.length;
    const completedCount = completedLessonsCount + passedMilestonesCount;
    const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const isCurrentDone = !!currentLesson && completedIds.has(lessonProgressId(currentLesson));

    // ── Loading ────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="bg-background h-screen flex flex-col">
                <div className="h-16 border-b border-border bg-card flex items-center px-6 gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 p-8 space-y-4">
                        <Skeleton className="aspect-video w-full rounded-xl" />
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                    <div className="hidden xl:block w-[380px] border-l border-border p-4 space-y-3">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                    </div>
                </div>
            </div>
        );
    }

    // If forbidden handled, avoid flicker / crashes while redirecting
    const firstError: any = (liveClassError || liveCurriculumError || enrollmentError) as any;
    if (firstError?.response?.status === 403) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-3">
                    <p className="text-lg font-bold text-foreground">Bạn không có quyền truy cập</p>
                    <p className="text-sm text-muted-foreground">Đang chuyển hướng về khóa học của bạn...</p>
                </div>
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <p className="text-2xl font-bold text-foreground">Không tìm thấy khóa học</p>
                    <Button variant="link" className="font-semibold" onClick={() => router.push('/dashboard/my-courses')}>
                        Về danh sách khóa học
                    </Button>
                </div>
            </div>
        );
    }

    const isVideoLesson = currentLessonKind === 'VIDEO';
    const isArticleLesson = currentLessonKind === 'READING';


    return (
        <div className="bg-background text-foreground font-sans antialiased h-screen flex flex-col overflow-hidden">

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <header className="h-16 border-b bg-card flex items-center justify-between px-4 sm:px-6 z-50 shrink-0 shadow-sm">
                <div
                    className="flex items-center gap-4 cursor-pointer group hover:bg-muted/30 px-2 -ml-2 rounded-lg transition-colors overflow-hidden"
                    onClick={() => setSidebarOpen(true)}
                >
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-tight text-primary font-mono">Học tập</span>
                            <Separator orientation="vertical" className="h-2.5 bg-border/50" />
                            <span className="text-[10px] font-medium text-muted-foreground/60 truncate max-w-[120px] sm:max-w-none uppercase tracking-tight">
                                {classData?.name}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <h1 className="text-sm sm:text-base font-bold tracking-tight group-hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-[400px]">
                                {currentLesson?.title ?? 'Chọn bài học'}
                            </h1>
                            <ChevronDown className="size-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <Separator orientation="vertical" className="h-6 bg-border/40 hidden md:block" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full p-0"
                                aria-label="Mở menu tài khoản"
                            >
                                <Avatar className="h-9 w-9 border border-primary/20">
                                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.displayName || 'Avatar'} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {user?.displayName?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => router.push('/dashboard/my-courses')}
                            >
                                <BookOpen className="mr-2 size-4" />
                                Quay về Khóa học của tôi
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 size-4" />
                                Đăng xuất
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* ── BODY ───────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden relative">

                {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
                <main className="flex-1 flex flex-col relative overflow-y-auto no-scrollbar scroll-smooth">

                    {/* Video / Content Section */}
                    <div className="flex-none w-full">
                        {isVideoLesson && (
                            <div className="w-full border-b bg-card">
                                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-3">
                                    <Card>
                                        <CardContent className="p-0">
                                            <VideoPlayer
                                                lesson={lessonDetail}
                                                onComplete={markLessonComplete}
                                                onProgress={setLessonVideoTime}
                                            />
                                        </CardContent>
                                    </Card>
                                    {!isCurrentDone && lessonDetail?.videoUrl && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Timer className="size-4" />
                                            <p className="font-normal">
                                                Video sẽ tự động hoàn thành sau khi xem hết 95% thời lượng
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={cn("flex-1 w-full mx-auto py-10 px-4 sm:px-6", isArticleLesson ? "max-w-3xl" : "max-w-5xl")}>
                        <section className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">Bài học {currentIndex + 1}</Badge>
                                    {isCurrentDone && <Badge className="bg-emerald-500 text-white border-none">Đã hoàn thành</Badge>}
                                </div>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                        {currentLesson?.title ?? 'Chọn bài học'}
                                    </h2>
                                    <div className="grid w-full grid-cols-2 gap-2 md:w-auto">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goTo(prevLesson)}
                                            disabled={!prevLesson || !effectiveLessonUnlocked(prevLesson)}
                                            className="h-10 w-full justify-center font-normal"
                                        >
                                            <ChevronLeft className="size-4" />
                                            Trước
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => goTo(nextLesson)}
                                            disabled={!nextLesson || !effectiveLessonUnlocked(nextLesson)}
                                            className="h-10 w-full justify-center font-normal"
                                        >
                                            Tiếp
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {isArticleLesson ? (
                                <div className="pt-2">
                                    {!lessonLoading && currentLesson ? (
                                        <div className="animate-in fade-in duration-700">
                                            <ArticleViewer
                                                lesson={lessonDetail!}
                                                onComplete={markLessonComplete}
                                                onPrev={() => goTo(prevLesson)}
                                                onNext={() => goTo(nextLesson)}
                                                navDisabledPrev={!prevLesson || !effectiveLessonUnlocked(prevLesson)}
                                                navDisabledNext={!nextLesson || !effectiveLessonUnlocked(nextLesson)}
                                                isCompleted={isCurrentDone}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="content" className="font-normal uppercase tracking-tight text-[10px] font-bold">Tổng quan</TabsTrigger>
                                        <TabsTrigger value="discussion" className="font-normal uppercase tracking-tight text-[10px] font-bold">Thảo luận</TabsTrigger>
                                        <TabsTrigger value="resources" className="font-normal uppercase tracking-tight text-[10px] font-bold">Tài liệu</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="content" className="py-6 space-y-4">
                                        <>
                                            <h3 className="text-lg font-normal">Giới thiệu bài học</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {(lessonDetail as any)?.description || "Nội dung đang được cập nhật."}
                                            </p>
                                            {!isCurrentDone && currentLesson && !isVideoLesson && (
                                                <Button onClick={markLessonComplete} className="w-full sm:w-auto font-normal">
                                                    Đánh dấu hoàn thành
                                                </Button>
                                            )}
                                        </>
                                    </TabsContent>

                                    <TabsContent value="discussion" className="py-6">
                                        <LessonDiscussion
                                            deliveryScopeId={deliveryTargetId as string}
                                            lessonId={(currentLesson as any)?.id ?? ''}
                                            moduleId={(currentLesson as any)?.moduleId}
                                        />
                                    </TabsContent>

                                    <TabsContent value="resources" className="py-6">
                                        <AcademyResourceList deliveryScopeId={deliveryTargetId as string} />
                                    </TabsContent>
                                </Tabs>
                            )}

                            {isArticleLesson && (
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                                    <TabsList>
                                        <TabsTrigger value="discussion" className="font-normal uppercase tracking-tight text-[10px] font-bold">Bình luận</TabsTrigger>
                                        <TabsTrigger value="resources" className="font-normal uppercase tracking-tight text-[10px] font-bold">Tài nguyên</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="discussion" className="py-6">
                                        <LessonDiscussion
                                            deliveryScopeId={deliveryTargetId as string}
                                            lessonId={(currentLesson as any)?.id ?? ''}
                                            moduleId={(currentLesson as any)?.moduleId}
                                        />
                                    </TabsContent>

                                    <TabsContent value="resources" className="py-6">
                                        <AcademyResourceList deliveryScopeId={deliveryTargetId as string} />
                                    </TabsContent>
                                </Tabs>
                            )}
                        </section>

                        {lessonLoading && (
                            <div className="p-12 space-y-8 max-w-3xl mx-auto">
                                <Skeleton className="h-10 w-2/3 rounded-full" />
                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-full rounded-full" />
                                    <Skeleton className="h-4 w-5/6 rounded-full" />
                                    <Skeleton className="h-4 w-4/6 rounded-full" />
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* ── SIDEBAR DRAWER / ASIDE ────────────────────────────── */}
                <aside
                    className={cn(
                        "flex flex-col w-full xl:w-[350px] bg-card border-l fixed xl:static inset-0 z-[60] xl:z-auto transition-transform duration-300",
                        sidebarOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"
                    )}
                >
                    <div className="p-4 border-b flex items-center justify-between xl:hidden">
                        <span className="font-bold">Nội dung khóa học</span>
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                            <X className="size-4" />
                        </Button>
                    </div>

                    <div className="p-6 border-b space-y-4">
                        <div className="flex items-center gap-4">
                            <Progress value={progressPct} className="flex-1 h-2" />
                            <span className="text-sm font-bold text-primary">{progressPct}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                            Đã học {completedCount} / {totalLessons} nội dung
                        </p>
                    </div>

                    <ScrollArea className="flex-1 min-h-0">
                        <Accordion
                            type="multiple"
                            value={Array.from(expandedModules)}
                            onValueChange={(values) => setExpandedModules(new Set(values))}
                            className="w-full"
                        >
                            {sortedModules.map((mod: any) => (
                                <ModuleItem
                                    key={mod.id}
                                    mod={mod}
                                    currentLessonId={currentLesson?.id ?? null}
                                    completedIds={completedIds}
                                    isLessonUnlocked={effectiveLessonUnlocked}
                                    milestones={milestones.filter(m => {
                                        const kind = normalizeItemKind(m.kind);
                                        if (kind === 'FINAL_EXAM') return false;

                                        // Check if Module Checkpoint matches current module
                                        if (kind === 'MODULE_CHECKPOINT' && m.moduleId === mod.id) return true;

                                        // Check if Lesson Checkpoint matches any lesson in current module
                                        if (kind === 'LESSON_CHECKPOINT' && m.triggerLessonId) {
                                            return mod.lessons?.some((l: any) =>
                                                l.id === m.triggerLessonId || l.referenceId === m.triggerLessonId
                                            );
                                        }

                                        return false;
                                    })}

                                    onSelectMilestone={handleOpenMilestoneConfirm}
                                    onSelectLesson={lesson => {
                                        setCurrentLesson(lesson);
                                        updateLessonQuery(lesson.id);
                                        if (lesson?.moduleId) setExpandedModules(new Set([lesson.moduleId]));
                                        setSidebarOpen(false);
                                    }}
                                />
                            ))}
                        </Accordion>

                        {/* Final Challenge Section */}
                        {milestones.some(m => normalizeItemKind(m.kind) === 'FINAL_EXAM') && (
                            <div className="p-4 bg-muted/30 m-4 rounded-lg">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-4 tracking-wider">Thử thách cuối khóa</h4>
                                {milestones.filter(m => normalizeItemKind(m.kind) === 'FINAL_EXAM').map(m => (
                                    <MilestoneItem
                                        key={m.assessmentId}
                                        milestone={m}
                                        forceLocked={completedLessonsCount < totalTrackableLessons}
                                        onClick={() => handleOpenMilestoneConfirm(m)}
                                    />
                                ))}
                            </div>
                        )}
                        <div className="h-8 xl:h-0" />
                    </ScrollArea>
                </aside>

                {/* Overlays for mobile */}
                {
                    sidebarOpen && (
                        <div
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[55] xl:hidden animate-in fade-in duration-300"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )
                }
            </div >

            <CourseCompletionModal
                isOpen={showCompletionModal}
                courseName={classData?.name}
                onClose={() => setShowCompletionModal(false)}
            />

            <AlertDialog
                open={!!pendingMilestone}
                onOpenChange={(open) => {
                    if (!open) setPendingMilestone(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận bắt đầu bài kiểm tra</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingMilestone?.examTitle || 'Bạn sắp chuyển sang màn hình làm bài.'}
                            {' '}
                            Bạn có muốn bắt đầu ngay bây giờ không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Để sau</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmMilestone}>
                            Bắt đầu làm bài
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Contextual Text Selection Popover - Only for Video/Reading */}
            {isTrackableLessonKind(currentLesson?.kind) && <TextSelectionToolbar />}

            {/* AI Assistant Floating Chatbox - Only for Video/Reading */}
            {isTrackableLessonKind(currentLesson?.kind) && (
                <LessonAIAssistant
                    key={(currentLesson as any)?.id ?? 'global'}
                    lessonId={(currentLesson as any)?.id ?? ''}
                    courseId={deliveryTargetId as string}
                    currentTime={lessonVideoTime}
                    lessonTitle={currentLesson?.title}
                    lessonType={currentLesson?.kind as any}
                />
            )}
        </div >
    );
}
