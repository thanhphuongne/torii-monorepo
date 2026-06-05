import { Link, useParams } from "react-router-dom"
import { ChevronRight, MessageSquare } from "lucide-react"
import { PageHeader } from "@/components/common/page-header"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ClassDiscussionTab } from "../live-classes/tabs/class-discussion-tab"
import { useMyAssignedAcademyVodPackageDiscussionContext } from "@/lib/api/services/academy-vod-packages"

export default function MyVodDiscussionPage() {
  const { id = "" } = useParams<{ id: string }>()
  const { data: pkg, isLoading } = useMyAssignedAcademyVodPackageDiscussionContext(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    )
  }

  if (!pkg) {
    return <div className="p-8 text-center text-muted-foreground">Không tìm thấy gói tự học được phân công.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Link to="/academy/vod-packages/my" className="text-muted-foreground hover:underline">
              Gói tự học tôi phụ trách
            </Link>
            <ChevronRight className="size-4" />
            <span>Thảo luận</span>
          </div>
        }
        subtitle={pkg.title}
        stats={[
          { label: "Mã gói", value: pkg.code },
          { label: "Vai trò", value: "Phụ trách thảo luận" },
          { label: "Phạm vi", value: "Trả lời và phản hồi học viên" },
        ]}
        actions={null}
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="size-4" />
          Chỉ hiển thị và thao tác tab thảo luận cho giảng viên phụ trách.
        </div>
        <ClassDiscussionTab vodPackageId={id} vodPackageData={pkg} />
      </div>
    </div>
  )
}
