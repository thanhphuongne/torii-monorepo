'use client';

import { RecommendedCoursesSection } from '@/components/dashboard/recommended-courses-section';
import { StreakWelcomeModal } from '@/components/dashboard/streak-welcome-modal';
import { useAppSelector } from '@/hooks/hooks';
import {
    useAcademyLearningStats,
    useAcademyMyCourses,
} from '@/lib/api/services/academy-learning-progress-api';
import {
    useAchievements,
    useGamificationProfile,
    useStreak,
} from '@/lib/api/services/gamification-api';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Progress } from '@workspace/ui/components/progress';
import {
    ArrowRight,
    Award,
    BookMarked,
    BookOpen,
    Bot,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Flame,
    Gift,
    Hand,
    Medal,
    Shield,
    Star,
    Trophy,
} from 'lucide-react';
import Link from 'next/link';

function getCourseHref(mainCourse: any) {
    if (mainCourse?.liveClassId) {
        return `/dashboard/my-courses/${mainCourse.liveClassId}`;
    }

    return `/courses/${mainCourse?.liveClassId ?? mainCourse?.vodPackageId ?? mainCourse?.courseProfileId ?? mainCourse?.id}/learn`;
}

function AuthenticatedDashboardPage() {
    const { user } = useAppSelector((state) => state.auth);

    const { data: courses, isLoading: coursesLoading } = useAcademyMyCourses();
    const { data: statsData } = useAcademyLearningStats();
    const { data: streak } = useStreak();
    const { data: profile } = useGamificationProfile();
    const { data: achievements } = useAchievements();

    const mainCourse = courses?.[0];
    const totalCourses = statsData?.totalCourses ?? courses?.length ?? 0;
    const totalHours = statsData?.totalLearningHours ?? 0;
    const inProgressCourses = statsData?.inProgressCourses ?? 0;
    const completedCourses = statsData?.completedCourses ?? 0;
    const avgProgress = statsData?.averageProgress ?? 0;
    const currentStreak = streak?.currentStreak ?? 0;
    const streakSavedByFreeze = (streak as any)?.streakSavedByFreeze === true;

    const level = profile?.level ?? 1;
    const currentXpInLevel = profile?.currentXp ?? 0;
    const xpNeededForNextLevel = 100 * (level + 1);
    const xpProgress = Math.min(100, (currentXpInLevel / xpNeededForNextLevel) * 100);
    const achievementCount = achievements?.length ?? 0;
    const completedLessons = mainCourse?.completedLessons ?? 0;
    const totalLessons = mainCourse?.totalLessons ?? 0;
    const remainingLessons = Math.max(0, totalLessons - completedLessons);

    const jlptTarget =
        ((user as any)?.jlptTarget as string | undefined) ||
        ((user?.userMetadata as Record<string, string>)?.jlptTarget as string | undefined) ||
        'N3';
    const firstName = user?.displayName?.split(' ').at(-1) || 'Học viên';

    const statCards = [
        { label: 'Khóa học', value: totalCourses, helper: `${inProgressCourses} đang học`, Icon: BookOpen },
        { label: 'Giờ học', value: `${totalHours}h`, helper: 'Tổng thời lượng tích lũy', Icon: Clock3 },
        {
            label: 'Chuỗi học',
            value: `${currentStreak} ngày`,
            helper: currentStreak > 0 ? 'Đang giữ nhịp ổn định' : 'Bắt đầu lại hôm nay',
            Icon: Flame,
        },
        { label: 'Hoàn thành', value: `${completedCourses}`, helper: `${avgProgress}% tiến độ trung bình`, Icon: CheckCircle2 },
    ];

    const quickLinks = [
        { href: '/dashboard/my-courses', Icon: BookOpen, label: 'Khóa học của tôi' },
        { href: '/dashboard/schedule', Icon: CalendarDays, label: 'Lịch học' },
        { href: '/dashboard/study-sets', Icon: BookMarked, label: 'Thẻ ghi nhớ' },
        { href: '/dashboard/achievements', Icon: Medal, label: 'Thành tựu' },
        { href: '/dashboard/rewards', Icon: Gift, label: 'Quà tặng' },
        { href: '/dashboard/certificates', Icon: Award, label: 'Chứng chỉ' },
    ];

    return (
        <div className="space-y-6 pb-4">
            {streakSavedByFreeze && (
                <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Lá chắn streak đã được kích hoạt</AlertTitle>
                    <AlertDescription>
                        Chuỗi học {currentStreak} ngày của bạn đã được bảo vệ. Chỉ cần hoàn thành một phiên học ngắn hôm nay để giữ nhịp.
                    </AlertDescription>
                </Alert>
            )}

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_340px]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl sm:text-3xl">
                            Chào mừng trở lại, {firstName} <Hand className="inline-block size-5 -translate-y-0.5" />
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Tiếp tục lộ trình học của bạn với khóa học đang diễn ra và các chỉ số tiến độ quan trọng.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {coursesLoading ? (
                            <Card className="h-56 animate-pulse bg-muted/40" />
                        ) : mainCourse ? (
                            <Card>
                                <CardContent className="grid gap-4 p-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                    <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                                        {mainCourse.thumbnailUrl ? (
                                            <img
                                                src={mainCourse.thumbnailUrl}
                                                alt={mainCourse.courseTitle}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <BookOpen className="size-10 text-muted-foreground/40" />
                                            </div>
                                        )}
                                        <Badge className="absolute left-2 top-2">{jlptTarget}</Badge>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Khóa học đang ưu tiên</p>
                                                <h2 className="line-clamp-2 text-xl font-semibold">{mainCourse.courseTitle}</h2>
                                            </div>
                                            <Badge variant="secondary">Đang học</Badge>
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            Giảng viên: {mainCourse.instructorName || 'Đang cập nhật'}
                                        </p>

                                        {!mainCourse.liveClassId && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>Tiến độ khóa học</span>
                                                    <span>{mainCourse.progress}%</span>
                                                </div>
                                                <Progress value={mainCourse.progress} />
                                                <p className="text-xs text-muted-foreground">
                                                    {completedLessons}/{totalLessons} bài hoàn thành · {remainingLessons} bài còn lại
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <Button asChild>
                                                <Link href={getCourseHref(mainCourse)}>
                                                    Tiếp tục học
                                                    <ArrowRight className="size-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="outline" asChild>
                                                <Link href="/dashboard/my-courses">Xem toàn bộ khóa học</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="space-y-4 p-6">
                                    <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                                        <BookOpen className="size-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold">Chưa có khóa học nào được ghi danh</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Hãy bắt đầu một khóa học phù hợp để dashboard có thể theo dõi tiến độ học tập của bạn.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button asChild>
                                            <Link href="/dashboard/available-courses">Khám phá khóa học</Link>
                                        </Button>
                                        <Button variant="outline" asChild>
                                            <Link href="/dashboard/my-courses">Xem khu vực học tập</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Hồ sơ học tập</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Mục tiêu {jlptTarget} · Level {level}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div className="rounded-md border p-2">
                                    <Flame className="mx-auto mb-1 size-4 text-muted-foreground" />
                                    <div className="font-semibold">{currentStreak}</div>
                                    <div className="text-xs text-muted-foreground">streak</div>
                                </div>
                                <div className="rounded-md border p-2">
                                    <Trophy className="mx-auto mb-1 size-4 text-muted-foreground" />
                                    <div className="font-semibold">{achievementCount}</div>
                                    <div className="text-xs text-muted-foreground">thành tựu</div>
                                </div>
                                <div className="rounded-md border p-2">
                                    <Star className="mx-auto mb-1 size-4 text-muted-foreground" />
                                    <div className="font-semibold">{avgProgress}%</div>
                                    <div className="text-xs text-muted-foreground">tiến độ</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>XP tới level tiếp theo</span>
                                    <span>
                                        {currentXpInLevel.toLocaleString('vi-VN')} / {xpNeededForNextLevel.toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <Progress value={xpProgress} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Bot className="size-4" />
                                AI Sensei
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Hỏi ngữ pháp, giải thích bài học hoặc luyện hội thoại ngay trong dashboard.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" asChild>
                                <Link href="/ai-sensei/chat">Mở AI Sensei</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map(({ label, value, helper, Icon }) => (
                    <Card key={label}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                                </div>
                                <Icon className="size-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
                        </CardContent>
                    </Card>
                ))}
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Điều hướng nhanh</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Truy cập nhanh vào các khu vực bạn dùng thường xuyên.
                    </p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {quickLinks.map(({ href, Icon, label }) => (
                        <Button key={href} variant="outline" className="h-auto justify-start gap-3 py-3" asChild>
                            <Link href={href}>
                                <Icon className="size-4" />
                                <span>{label}</span>
                            </Link>
                        </Button>
                    ))}
                </CardContent>
            </Card>

            <RecommendedCoursesSection jlptTarget={jlptTarget} />

            <StreakWelcomeModal />
        </div>
    );
}

export default AuthenticatedDashboardPage;
