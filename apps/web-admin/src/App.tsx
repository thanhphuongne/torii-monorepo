import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'

function NavigateToClassTab({ tab }: { tab: string }) {
  const { liveClassId } = useParams<{ liveClassId: string }>()
  return <Navigate to={`/academy/live-classes/${liveClassId}/detail?tab=${tab}`} replace />
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './store'
import { Toaster } from '@workspace/ui/components/sonner'
import { AuthGuard, ADMIN_PANEL_ENTRY_PERMISSIONS } from './lib/guard/auth-guard.tsx'
import { RoutePermissionGuard } from './lib/guard/route-permission-guard.tsx'
import { ThemeProvider } from "@/lib/providers/theme-provider.tsx"
import { TooltipProvider } from '@workspace/ui/components/tooltip';
// Component imports
import DashboardLayout from "@/components/layout/dashboard-layout.tsx";
// Feature imports
import DashboardPage from '@/routes/dashboard/dashboard-page.tsx'

import UsersManagementPage from '@/routes/users/users-management-page.tsx'
import CouponsPage from '@/routes/coupons/coupons-page.tsx'

import OrdersPage from '@/routes/finance/orders-page.tsx'
import RevenueAnalyticsPage from '@/routes/finance/revenue-analytics-page.tsx'

import NotificationsPage from '@/routes/notification/notifications-page.tsx'
import SettingsPage from '@/routes/settings/settings-page.tsx'
import ProfilePage from '@/routes/profile/profile-page.tsx'
import { BlogPage } from '@/routes/blog/blog-page.tsx'
import CreateBlogPage from '@/routes/blog/create-blog-page.tsx'
import EditBlogPage from '@/routes/blog/edit-blog-page.tsx'

import LoginPage from '@/routes/auth/login-page.tsx'
import ForgotPasswordPage from '@/routes/auth/forgot-password-page.tsx'
import ResetPasswordPage from '@/routes/auth/reset-password-page.tsx'

import TwoFactorVerifyPage from '@/routes/auth/two-factor-verify-page.tsx'
import { AuditLogsPage } from "@/routes/audit/audit-logs-page.tsx";
import { PermissionsPage } from "@/routes/permissions/permissions-page.tsx";
import TicketsPage from '@/routes/tickets/tickets-page.tsx'
import NotFoundPage from '@/routes/error/not-found-page.tsx'
import AccessDeniedPage from '@/routes/error/access-denied-page.tsx'
import ServiceUnavailablePage from '@/routes/error/service-unavailable-page.tsx'
import NotImplementedPage from '@/routes/error/not-implemented-page.tsx'
import UnauthorizedPage from '@/routes/error/unauthorized-page.tsx'
import CourseProfilesPage from '@/routes/academy/course-profiles/course-profiles-page.tsx'
import CourseProfileDetailPage from '@/routes/academy/course-profiles/course-profile-detail-page.tsx'
import LiveClassesPage from '@/routes/academy/live-classes/live-classes-page'
import LiveRescheduleRequestsPage from '@/routes/academy/live-classes/live-reschedule-requests-page'
import LiveClassStudentsPage from '@/routes/academy/live-classes/live-class-students-page'
import CohortsPage from '@/routes/academy/cohorts/cohorts-page'
import CohortDetailPage from '@/routes/academy/cohorts/cohort-detail-page'
import VodPackagesPage from '@/routes/academy/vod-packages/vod-packages-page'
import VodPackageDetailPage from '@/routes/academy/vod-packages/vod-package-detail-page'
import MyVodPackagesPage from '@/routes/academy/vod-packages/my-vod-packages-page'
import MyVodDiscussionPage from '@/routes/academy/vod-packages/my-vod-discussion-page'
import AssignmentGradingPage from '@/routes/academy/live-classes/assignment-grading-page'
import ApprovalsPage from '@/routes/academy/approvals/approvals-page'
import CohortApprovalPreviewPage from '@/routes/academy/approvals/cohort-preview-page'
import VodPackageApprovalPreviewPage from '@/routes/academy/approvals/vod-package-preview-page'
import CourseProfileApprovalPreviewPage from '@/routes/academy/approvals/course-profile-preview-page'
import RewardsPage from '@/routes/gamification/rewards-page.tsx'
import AchievementsPage from '@/routes/gamification/achievements-page.tsx'
import AiSubscriptionsPage from '@/routes/academy/ai-subscriptions/ai-subscriptions-page.tsx'

import { LMS_ASSESSMENT_CONTENT_MANAGE_ANY } from '@/config/navigation'
import JlptTemplatesPage from '@/routes/academy/jlpt/templates/page.tsx'
import JlptQuestionsPage from '@/routes/academy/jlpt/questions/page.tsx'
import JlptQuestionDetailPage from '@/routes/academy/jlpt/questions/[id]/page.tsx'
import JlptTemplateDetailPage from '@/routes/academy/jlpt/templates/[id]/page.tsx'
import JlptMondaiMasterPage from '@/routes/academy/jlpt/mondai/page.tsx'
import JlptConfigPage from '@/routes/academy/jlpt/config/page.tsx'
import StudySetCatalogsPage from '@/routes/academy/study-set-catalogs/page.tsx'
import StudySetCatalogDetailPage from '@/routes/academy/study-set-catalogs/detail-page.tsx'

import AcademyExamsPage from '@/routes/academy/assessment/exams/exams-page'
import AcademyExamEditorPage from '@/routes/academy/assessment/exams/exam-editor-page'
import AcademyQuestionsPage from '@/routes/academy/assessment/questions/questions-page'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1, // Reduced for easier debugging
      refetchOnWindowFocus: false, // Avoid unexpected reloads during dev
    },
  },
})


function App() {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route path="/auth/verify-2fa" element={<TwoFactorVerifyPage />} />
                <Route element={
                  <AuthGuard>
                    <DashboardLayout />
                  </AuthGuard>
                }>
                  <Route element={<RoutePermissionGuard anyPermission={ADMIN_PANEL_ENTRY_PERMISSIONS} />}>
                    <Route index element={<DashboardPage />} />
                  </Route>


                  <Route element={<RoutePermissionGuard anyPermission={["ops.user.manage", "ops.user.view"]} />}>
                    <Route path="users" element={<UsersManagementPage />} />
                  </Route>
                  <Route element={<RoutePermissionGuard permission="ops.user.manage" />}>
                    <Route path="permissions" element={<PermissionsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard permission="ops.blog.manage" />}>
                    <Route path="blogs" element={<BlogPage />} />
                    <Route path="blogs/create" element={<CreateBlogPage />} />
                    <Route path="blogs/:id/edit" element={<EditBlogPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard anyPermission={["lms.catalog.read", "lms.catalog.update", "lms.assessment.grade"]} />}>
                    <Route path="academy/course-profiles" element={<CourseProfilesPage />} />
                    <Route path="academy/course-profiles/:profileId/detail" element={<CourseProfileDetailPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard anyPermission={["lms.delivery.read", "lms.delivery.update", "lms.assessment.grade"]} />}>
                    <Route path="academy/live-classes" element={<LiveClassesPage />} />
                    <Route path="academy/live-classes/:liveClassId/detail" element={<LiveClassStudentsPage />} />
                    <Route path="academy/live-classes/:liveClassId/schedule" element={<NavigateToClassTab tab="schedule" />} />
                    <Route path="academy/live-classes/:liveClassId/assessments" element={<NavigateToClassTab tab="assignments" />} />
                    <Route path="academy/live-classes/:liveClassId/assignments/:assessmentId/submissions" element={<AssignmentGradingPage />} />
                    <Route path="academy/vod-packages/my" element={<MyVodPackagesPage />} />
                    <Route path="academy/vod-packages/my/:id/discussion" element={<MyVodDiscussionPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard anyPermission={["lms.delivery.approve"]} />}>
                    <Route path="academy/live-classes/reschedule-requests" element={<LiveRescheduleRequestsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard anyPermission={["lms.commerce.read", "lms.commerce.update"]} />}>
                    <Route path="academy/cohorts" element={<CohortsPage />} />
                    <Route path="academy/cohorts/:cohortId/detail" element={<CohortDetailPage />} />
                    <Route path="academy/vod-packages" element={<VodPackagesPage />} />
                    <Route path="academy/vod-packages/:id/detail" element={<VodPackageDetailPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard permission="ops.subscription.manage" />}>
                    <Route path="academy/ai-subscriptions" element={<AiSubscriptionsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard anyPermission={[...LMS_ASSESSMENT_CONTENT_MANAGE_ANY]} />}>
                    <Route path="academy/jlpt/config" element={<JlptConfigPage />} />
                    <Route path="academy/jlpt/templates" element={<JlptTemplatesPage />} />
                    <Route path="academy/jlpt/templates/:id" element={<JlptTemplateDetailPage />} />
                    <Route path="academy/jlpt/questions" element={<JlptQuestionsPage />} />
                    <Route path="academy/jlpt/questions/:id" element={<JlptQuestionDetailPage />} />
                    <Route path="academy/jlpt/mondai" element={<JlptMondaiMasterPage />} />
                    <Route path="academy/study-set-catalogs" element={<StudySetCatalogsPage />} />
                    <Route path="academy/study-set-catalogs/:id" element={<StudySetCatalogDetailPage />} />
                    <Route path="academy/assessment/exams" element={<AcademyExamsPage />} />
                    <Route path="academy/assessment/exams/new" element={<AcademyExamEditorPage />} />
                    <Route path="academy/assessment/exams/:id" element={<AcademyExamEditorPage />} />
                    <Route path="academy/assessment/questions" element={<AcademyQuestionsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard anyPermission={["lms.catalog.approve", "lms.commerce.approve"]} />}>
                    <Route path="academy/approvals" element={<ApprovalsPage />} />
                    <Route path="academy/approvals/cohorts/:id" element={<CohortApprovalPreviewPage />} />
                    <Route path="academy/approvals/vod-packages/:id" element={<VodPackageApprovalPreviewPage />} />
                    <Route
                      path="academy/approvals/course-profiles/:id"
                      element={<CourseProfileApprovalPreviewPage />}
                    />
                  </Route>

                  <Route element={<RoutePermissionGuard permission="ops.coupon.manage" />}>
                    <Route path="coupons" element={<CouponsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard permission="ops.order.manage" />}>
                    <Route path="orders" element={<OrdersPage />} />
                  </Route>

                  <Route
                    element={
                      <RoutePermissionGuard
                        anyPermission={["ops.order.manage", "lms.approval.manage"]}
                      />
                    }
                  >
                    <Route path="finance/revenue-analytics" element={<RevenueAnalyticsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard permission="ops.gamification.manage" />}>
                    <Route path="rewards" element={<RewardsPage />} />
                    <Route path="achievements" element={<AchievementsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard permission="ops.audit.view" />}>
                    <Route path="audit-logs" element={<AuditLogsPage />} />
                  </Route>

                  <Route element={<RoutePermissionGuard anyPermission={[...ADMIN_PANEL_ENTRY_PERMISSIONS]} />}>
                    <Route path="notifications" element={<NotificationsPage />} />
                  </Route>

                  <Route path="settings" element={<SettingsPage />} />

                  <Route path="profile" element={<ProfilePage />} />

                  <Route element={<RoutePermissionGuard permission="ops.support.handle" />}>
                    <Route path="tickets" element={<TicketsPage />} />
                  </Route>

                  <Route path="access-denied" element={<AccessDeniedPage />} />
                  <Route path="unauthorized" element={<UnauthorizedPage />} />
                  <Route path="503" element={<ServiceUnavailablePage />} />
                  <Route path="501" element={<NotImplementedPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster position="top-center" />
          </TooltipProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </ReduxProvider>
  )
}

export default App
