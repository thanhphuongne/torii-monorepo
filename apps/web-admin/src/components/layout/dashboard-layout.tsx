import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/layout/app-sidebar.tsx";
import { DashboardHeader } from "@/components/layout/dashboard-header.tsx";
import { LecturerAcademyRedirect } from "@/lib/guard/lecturer-academy-redirect.tsx";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger
} from "@workspace/ui/components/sidebar"

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden bg-background font-sans">

        <AppSidebar />

        <SidebarInset className="flex min-w-0 flex-col overflow-hidden bg-background">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="h-9 w-9 shrink-0 rounded-md hover:bg-muted" />
            <div className="flex-1 min-w-0">
              <DashboardHeader />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <LecturerAcademyRedirect />
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
