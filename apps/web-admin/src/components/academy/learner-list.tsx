import { Link } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { User, Mail, Calendar, Edit2, ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/format-utils"

interface LearnerListProps {
  enrollments: any[]
  isLoading?: boolean
}

export function LearnerList({ enrollments, isLoading }: LearnerListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse bg-muted rounded-md" />
        ))}
      </div>
    )
  }

  if (!enrollments.length) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
        <p>Lớp học hiện tại chưa có học viên nào tham gia.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[300px]">Học viên</TableHead>
            <TableHead>Ngày ghi danh</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((en) => (
            <TableRow key={en.id} className="group">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate">
                      {en.user?.displayName || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {en.user?.email || en.userId}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(en.enrolledAt)}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={en.status === "ACTIVE" ? "default" : en.status === "EXPIRED" ? "destructive" : "secondary"}
                  className={en.status === "ACTIVE" ? "bg-emerald-500 hover:bg-emerald-600 border-transparent text-white" : ""}
                >
                  {en.status === "ACTIVE"
                    ? "Đang học"
                    : en.status === "COMPLETED"
                    ? "Hoàn thành"
                    : en.status === "EXPIRED"
                    ? "Đã hết hạn"
                    : "Đã hủy"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" asChild title="Chỉnh sửa ghi danh">
                    <Link to={`/academy/enrollments/${en.id}/edit`}>
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" asChild title="Xem chi tiết học viên (Coming Soon)">
                    <Link to={`#`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
