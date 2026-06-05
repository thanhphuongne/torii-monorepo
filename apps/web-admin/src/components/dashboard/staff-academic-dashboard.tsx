import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { BarChart3, ClipboardCheck, School, BookOpen, GraduationCap, ChevronRight, ListTodo } from "lucide-react";
import { useStaffAcademicDashboard } from "@/lib/api/services/dashboard";
import { formatNumber } from "@/lib/format-utils";
import { StatsCard } from "./stats-card";
import { PageLoading } from "@workspace/ui/components/page-loading";
import {
  elevatedPanelClass,
  elevatedPanelContentClass,
  elevatedCardHeaderPrimary,
  emptyStateBoxClass,
} from "@/lib/ui-shell";
import { pendingApprovalTypePieFill } from "@/lib/dashboard-chart-colors";
import { cn } from "@workspace/ui/lib/utils";
import {
  DASHBOARD_CHART_H,
  DashboardChartScroll,
  useNarrowMobile,
} from "@/components/dashboard/dashboard-responsive";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import type { StaffAcademicPendingApprovalItemDTO } from "@workspace/schemas";

function ChartEmpty() {
  return (
    <div className={cn(DASHBOARD_CHART_H, emptyStateBoxClass)}>
      <BarChart3 className="size-8 text-muted-foreground/30" aria-hidden />
      Chưa có dữ liệu
    </div>
  );
}

function pendingApprovalHref(row: StaffAcademicPendingApprovalItemDTO): string {
  if (row.kind === "COURSE_PROFILE") return `/academy/approvals/course-profiles/${row.id}`;
  if (row.kind === "COHORT") return `/academy/approvals/cohorts/${row.id}`;
  return `/academy/approvals/vod-packages/${row.id}`;
}

function pendingApprovalKindLabel(kind: StaffAcademicPendingApprovalItemDTO["kind"]): string {
  if (kind === "COURSE_PROFILE") return "Hồ sơ khóa học";
  if (kind === "COHORT") return "Đợt khai giảng";
  return "Gói tự học";
}

function formatUpdatedAt(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: vi });
  } catch {
    return iso;
  }
}

export default function StaffAcademicDashboard() {
  const narrow = useNarrowMobile();
  const { data, isLoading } = useStaffAcademicDashboard();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  const pending = data?.stats.pendingApprovals ?? 0;
  const preview = data?.pendingApprovalPreview ?? [];
  const pendingApprovalsByType = (data?.pendingApprovalsByType ?? []).map((d) => ({
    label: d.name,
    value: d.value,
    colorKey: d.name,
  }));

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Học thuật &amp; nội dung</h2>
        <p className="text-xs text-muted-foreground">
          Ưu tiên duyệt theo danh sách; tóm tắt số lượng theo loại ở biểu đồ cột bên dưới.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatsCard
          title="Chờ phê duyệt"
          value={formatNumber(pending)}
          sub="Hồ sơ khóa học / Đợt khai giảng / Gói tự học"
          icon={ClipboardCheck}
          tone="warning"
          highlight={pending > 0}
        />
        <StatsCard
          title="Lớp trực tiếp hôm nay"
          value={formatNumber(data?.stats.activeRooms ?? 0)}
          sub="Buổi có phòng, SCHEDULED/RESCHEDULED"
          icon={School}
          tone="info"
        />
        <StatsCard
          title="Khóa (chưa lưu trữ)"
          value={formatNumber(data?.stats.totalCourses ?? 0)}
          sub="Hồ sơ khóa học"
          icon={BookOpen}
          tone="neutral"
        />
        <StatsCard
          title="Học viên đang học"
          value={formatNumber(data?.stats.totalEnrollments ?? 0)}
          sub="Học viên đang hoạt động"
          icon={GraduationCap}
          tone="success"
        />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="size-4 text-muted-foreground" aria-hidden />
            <div>
              <CardTitle className="text-base">Ưu tiên duyệt</CardTitle>
              <CardDescription className="text-xs">
                Tối đa 20 mục gần nhất (PENDING_APPROVAL), sắp xếp theo cập nhật mới nhất
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {preview.length === 0 ? (
            <div className={cn("rounded-lg border border-dashed border-border/60 bg-muted/15 py-10 text-center text-sm text-muted-foreground")}>
              Không có mục nào đang chờ duyệt.
            </div>
          ) : (
            preview.map((row) => (
              <div
                key={`${row.kind}-${row.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {pendingApprovalKindLabel(row.kind)}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">{row.code}</span>
                  </div>
                  <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">Cập nhật: {formatUpdatedAt(row.updatedAt)}</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link to={pendingApprovalHref(row)}>
                    Duyệt
                    <ChevronRight className="ml-1 size-4" />
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className={elevatedPanelClass}>
        <CardHeader className={elevatedCardHeaderPrimary}>
          <CardTitle className="text-base">Hàng chờ duyệt theo loại</CardTitle>
          <CardDescription className="text-xs">So sánh số lượng — cột ngang</CardDescription>
        </CardHeader>
        <CardContent className={elevatedPanelContentClass}>
          {pendingApprovalsByType.length === 0 ? (
            <ChartEmpty />
          ) : (
            <DashboardChartScroll>
              <div className={cn(DASHBOARD_CHART_H, narrow && "min-w-[280px]")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={pendingApprovalsByType}
                    margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={narrow ? 88 : 120}
                      tick={{ fontSize: narrow ? 9 : 11 }}
                    />
                    <Tooltip formatter={(v) => (v != null ? formatNumber(Number(v)) : "")} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {pendingApprovalsByType.map((e, i) => (
                        <Cell key={i} fill={pendingApprovalTypePieFill(e.colorKey)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardChartScroll>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
