"use client"

import { useParams, useRouter } from "next/navigation"
import { useAcademyEnrollmentCheck } from "@/lib/api/services/academy-enrollment-api"
import { LiveClassDashboard } from "@/components/courses/live-class-dashboard"
import { Suspense, useEffect } from "react"
import { PageLoading } from "@workspace/ui/components/page-loading"

/**
 * LiveClass Dashboard Page (Integrated into Dashboard)
 * Redirects VOD students to /courses/[courseId]/learn
 * Renders Live Session dashboard for LIVE students
 */
export default function LiveClassDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    
    // Check permission
    const { data: enrollmentData, isLoading } = useAcademyEnrollmentCheck(courseId);

    useEffect(() => {
        if (!isLoading && enrollmentData) {
            const enrollment = enrollmentData.enrollment as any;
            
            // If NOT enrolled -> Redirect back
            if (!enrollmentData.isEnrolled) {
                router.replace('/dashboard/my-courses');
                return;
            }

            // If VOD enrollment -> Redirect to VOD learning page
            if (enrollment?.type?.toLowerCase() === 'vod') {
                router.replace(`/courses/${courseId}/learn`);
            }
        }
    }, [enrollmentData, isLoading, courseId, router]);

    if (isLoading) {
        return <PageLoading />
    }

    // If LIVE enrollment -> Render Dashboard
    const enrollment = enrollmentData?.enrollment as any;
    if (enrollmentData?.isEnrolled && enrollment?.type?.toLowerCase() === 'live') {
        return (
            <Suspense fallback={<PageLoading />}>
                <LiveClassDashboard />
            </Suspense>
        )
    }

    // Default loading while redirect
    return <PageLoading />
}
