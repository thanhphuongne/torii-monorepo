import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/components/common/page-header"
import { ChevronRight, Calendar } from "lucide-react"
import { useAcademyLiveClass } from "@/lib/api/services/academy-live-classes"
import { ClassAttendanceTab } from "@/components/academy/class-attendance-tab"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function ClassSchedulePage() {
  const { liveClassId } = useParams<{ liveClassId: string }>()
  const { data: academyClass, isLoading } = useAcademyLiveClass(liveClassId)

  if (!liveClassId) {
    return <div className="p-8">Thiếu mã lớp trên URL.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Link
              to="/academy/live-classes"
              className="hover:underline text-muted-foreground transition-colors"
            >
              Lớp học
            </Link>
            <ChevronRight className="size-4" />
            <span>Lịch học &amp; Điểm danh</span>
          </div>
        }
        subtitle="Quản lý buổi học trực tiếp và thực hiện điểm danh cho từng buổi."
        stats={
          isLoading || !academyClass
            ? undefined
            : [
                { label: "Mã lớp", value: academyClass.code },
                { label: "Loại hình", value: "Lớp trực tiếp" },
              ]
        }
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-4" />
            <span>
              Buổi học được lấy từ lịch lớp trực tiếp và hiển thị 14 ngày quanh thời điểm hiện tại.
            </span>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <ClassAttendanceTab liveClassId={liveClassId} />
      )}
    </div>
  )
}

