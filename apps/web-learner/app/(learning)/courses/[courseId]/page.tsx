"use client"

import { useParams, useRouter } from "next/navigation"
import { useAcademyEnrollmentCheck } from "@/lib/api/services/academy-enrollment-api"
import { LiveClassDashboard } from "@/components/courses/live-class-dashboard"
import { useEffect } from "react"
import { Spinner } from "@workspace/ui/components/spinner"

export default function CoursePortalPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    // Kiểm tra quyền truy cập của user với class này
    const { data: enrollmentData, isLoading } = useAcademyEnrollmentCheck(courseId);

    useEffect(() => {
        if (!isLoading && enrollmentData) {
            const enrollment = enrollmentData.enrollment as any;

            // Nếu KHÔNG có enrollment -> Redirect ra trang danh sách khóa học
            if (!enrollmentData.isEnrolled) {
                router.replace('/dashboard/my-courses');
                return;
            }

            // Nếu là học viên VOD -> Chuyển sang trình học VOD
            if (enrollment?.type?.toLowerCase() === 'vod') {
                router.replace(`/courses/${courseId}/learn`);
            }
        }
    }, [enrollmentData, isLoading, courseId, router]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Spinner className="size-8 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Đang xác thực quyền truy cập...</p>
            </div>
        );
    }

    // Nếu là học viên LIVE -> Chuyển sang Dashboard tích hợp mới
    const enrollment = enrollmentData?.enrollment as any;
    if (enrollmentData?.isEnrolled && enrollment?.type?.toLowerCase() === 'live') {
        router.replace(`/dashboard/my-courses/${courseId}`);
        return null;
    }

    // Default: Hiển thị loading trong lúc đợi redirect
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Spinner className="size-8 text-primary" />
        </div>
    );
}
