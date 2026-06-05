import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/common/page-header"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { MessageSquare, Search } from "lucide-react"
import { useDebounceValue } from "@workspace/ui/hooks/use-debounce-value"
import { useMyAssignedAcademyVodPackages } from "@/lib/api/services/academy-vod-packages"
import {
  dataTableHeaderClass,
  dataTableShellClass,
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
  listPageToolbarRootClass,
} from "@/lib/ui-shell"

const statusLabelMap: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  PUBLISHED: "Đang hoạt động",
  ARCHIVED: "Đã lưu trữ",
}

export default function MyVodPackagesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounceValue(search, 500)

  const { data: items, isLoading } = useMyAssignedAcademyVodPackages({
    q: debouncedSearch,
  })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gói tự học tôi phụ trách"
        subtitle="Giảng viên chỉ xử lý thảo luận và phản hồi cho các gói tự học được phân công."
      />

      <div className="space-y-4">
        <div className={listPageToolbarRootClass}>
          <div className={listPageSearchWrapClass}>
            <Search className={listPageSearchIconClass} />
            <Input
              placeholder="Tìm theo mã hoặc tên gói tự học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={listPageSearchInputClass}
            />
          </div>
        </div>

        <div className={dataTableShellClass}>
          <Table>
            <TableHeader className={dataTableHeaderClass}>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-[160px]">Mã gói</TableHead>
                <TableHead>Tên gói tự học</TableHead>
                <TableHead className="w-[220px]">Hồ sơ khóa học</TableHead>
                <TableHead className="w-[140px]">Trạng thái</TableHead>
                <TableHead className="text-right pr-6 w-[180px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !items?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    Bạn chưa được phân công gói tự học nào.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.courseProfile?.title || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{statusLabelMap[item.status] ?? item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => navigate(`/academy/vod-packages/my/${item.id}/discussion`)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Vào thảo luận
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
