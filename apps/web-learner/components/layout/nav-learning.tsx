"use client"

import Link from "next/link"
import { PlayCircle } from "lucide-react"
import { Progress } from "@workspace/ui/components/progress"
import { cn } from "@workspace/ui/lib/utils"
import { useState } from "react"
import { CourseExpirationModal } from "@/components/courses/course-expiration-modal"
import { useAcademyMyCourses as useMyCourses } from "@/lib/api/services/academy-learning-progress-api"
import { SidebarGroup, SidebarGroupLabel, useSidebar } from "@workspace/ui/components/sidebar"

export function NavLearning() {
    const { data: courses, isLoading } = useMyCourses()
    const { state, isMobile } = useSidebar()
    const isCollapsed = state === "collapsed"
    const [showExpiredModal, setShowExpiredModal] = useState(false)

    const activeCourse = courses?.find(c => c.status === 'ACTIVE' && (c.progress ?? 0) < 100) || courses?.[0]
    const isExpired = activeCourse?.expiresAt && new Date(activeCourse.expiresAt) < new Date()

    if (isLoading || !activeCourse || (isCollapsed && !isMobile)) return null

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-3 px-4">
                Đang học
            </SidebarGroupLabel>
            <div className="px-4">
                <div
                    onClick={() => {
                        if (isExpired) {
                            setShowExpiredModal(true)
                        } else {
                            // Trang learn dùng `courseId` = liveClassId hoặc vodPackageId (delivery), không phải enrollmentId / courseProfileId.
                            const deliveryTargetId =
                                activeCourse.liveClassId ?? activeCourse.vodPackageId ?? ''
                            if (!deliveryTargetId) {
                                window.location.href = '/dashboard/my-courses'
                                return
                            }
                            const mode = activeCourse.liveClassId ? 'LIVE' : 'VOD'
                            window.location.href = `/courses/${deliveryTargetId}/learn?mode=${encodeURIComponent(mode)}`
                        }
                    }}
                    className={cn(
                        "group block p-4 rounded-lg border transition-all cursor-pointer",
                        isExpired ? "border-destructive/20 bg-destructive/10" : "bg-accent/50 hover:bg-accent border-border/50"
                    )}
                >
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <h4 className="text-xs font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {activeCourse.courseTitle}
                        </h4>
                        <div className={cn(
                            "w-8 h-8 rounded flex items-center justify-center shrink-0 transition-all",
                            isExpired ? "bg-destructive/10 text-destructive" : "bg-primary text-primary-foreground"
                        )}>
                            <PlayCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>{isExpired ? 'Hết hạn' : 'Tiến độ'}</span>
                            <span>{activeCourse.progress}%</span>
                        </div>
                        <Progress value={activeCourse.progress} className="h-1" />
                    </div>
                </div>
            </div>
            <CourseExpirationModal
                isOpen={showExpiredModal}
                onClose={() => setShowExpiredModal(false)}
                courseTitle={activeCourse.courseTitle || ""}
            />
        </SidebarGroup>
    )
}
