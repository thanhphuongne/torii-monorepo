import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { PageLoading } from "@workspace/ui/components/page-loading";
import { StatsCard } from "./stats-card";
import { useAdminDashboard } from "@/lib/api/services/dashboard";
import type { DashboardRecentOrderRowDTO } from "@workspace/schemas";
import { formatCurrency, formatNumber } from "@/lib/format-utils";
import {
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  BarChart3,
  ClipboardCheck,
  Wallet,
  Ticket,
  HandCoins,
  TrendingUp,
  Activity,
  Receipt,
} from "lucide-react";
import {
  elevatedPanelClass,
  elevatedPanelContentClass,
  elevatedCardHeaderPrimary,
  emptyStateBoxClass,
} from "@/lib/ui-shell";
import { cn } from "@workspace/ui/lib/utils";
import {
  orderStatusBadgeVariant,
  orderStatusLabelVi,
  pendingApprovalTypePieFill,
  revenueLevelPieFill,
} from "@/lib/dashboard-chart-colors";
import {
  DASHBOARD_CHART_H,
  DashboardChartScroll,
  useNarrowMobile,
} from "@/components/dashboard/dashboard-responsive";

function ChartEmpty() {
  return (
    <div className={cn(DASHBOARD_CHART_H, emptyStateBoxClass)}>
      <BarChart3 className="size-8 text-muted-foreground/30" aria-hidden />
      Chưa có dữ liệu
    </div>
  );
}

function DomainSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const PRESENCE_FALLBACK = {
  totalUsers: 0,
  activeToday: 0,
  usersWithActiveSession: 0,
  activeSessionCount: 0,
  usersSignedInLast15Minutes: 0,
  measuredAt: "",
};

export default function AdminDashboardV2() {
  const narrow = useNarrowMobile();
  const [selectedDays, setSelectedDays] = useState<7 | 14 | 30>(30);

  const { data, isLoading } = useAdminDashboard({ refetchInterval: 60_000 });
  const revenueLast30Days = data?.staffOperations?.revenueLast30Days ?? [];
  const revenueSeries = useMemo(
    () => revenueLast30Days.slice(-selectedDays),
    [revenueLast30Days, selectedDays],
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  const staffAcademic = data?.staffAcademic;
  const staffOperations = data?.staffOperations;
  const presence = data?.presence ?? PRESENCE_FALLBACK;

  const pendingApprovalsByType = staffAcademic?.pendingApprovalsByType ?? [];
  const revenueByLevel = (staffOperations?.revenueByLevel ?? []).slice(0, 8).map((r) => ({
    name: r.level,
    value: r.amount,
  }));

  const recentOrders = (staffOperations?.recentOrders ?? []).slice(0, 12);

  const pendingPieData = pendingApprovalsByType.map((d) => ({
    name: d.name,
    value: d.value,
  }));

  const pendingApprovals = staffAcademic?.stats.pendingApprovals ?? 0;
  const pendingTickets = staffOperations?.stats.pendingTickets ?? 0;
  const pendingRefunds = staffOperations?.stats.pendingRefunds ?? 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
      <section aria-label="Chỉ số ưu tiên admin" className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Chỉ số xem ngay</h2>
        <p className="text-[11px] text-muted-foreground sm:text-xs">
          Doanh thu, đơn, rủi ro vận hành, duyệt nội dung và tín hiệu hoạt động người dùng.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatsCard
            title="Doanh thu (PAID)"
            value={formatCurrency(staffOperations?.stats.totalRevenue ?? 0)}
            sub="Tổng đã thanh toán"
            icon={Wallet}
            tone="success"
          />
          <StatsCard
            title="Đơn PAID"
            value={formatNumber(staffOperations?.stats.paidOrders ?? 0)}
            sub="Giao dịch thành công"
            icon={Receipt}
            tone="info"
          />
          <StatsCard
            title="Ticket mở"
            value={formatNumber(pendingTickets)}
            sub="Hỗ trợ / khiếu nại"
            icon={Ticket}
            tone="primary"
            highlight={pendingTickets > 0}
          />
          <StatsCard
            title="Hoàn tiền chờ"
            value={formatNumber(pendingRefunds)}
            sub="Đối soát"
            icon={HandCoins}
            tone="warning"
            highlight={pendingRefunds > 0}
          />
          <StatsCard
            title="Duyệt nội dung"
            value={formatNumber(pendingApprovals)}
            sub="Hồ sơ khóa học / Đợt khai giảng / Gói tự học"
            icon={ClipboardCheck}
            tone="warning"
            highlight={pendingApprovals > 0}
          />
          <StatsCard
            title="Đăng nhập hôm nay"
            value={formatNumber(presence.activeToday)}
            sub="Theo lần đăng nhập gần nhất"
            icon={Activity}
            tone="info"
            highlight={(presence.activeToday ?? 0) > 0}
          />
        </div>
      </section>

      <div className="min-w-0 space-y-6">
        <DomainSection
          title="Thương mại — biểu đồ"
          description="Xu hướng doanh thu 30 ngày; tỷ lệ theo Level và duyệt nội dung theo loại (hai biểu đồ cạnh nhau trên màn hình lớn)."
        >
          <div className="w-full space-y-4">
            <Card className={cn(elevatedPanelClass, "w-full")}>
              <CardHeader className={elevatedCardHeaderPrimary}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <CardTitle className="text-base">Doanh thu theo ngày</CardTitle>
                      <CardDescription className="text-xs">Đơn PAID theo khoảng ngày đã chọn</CardDescription>
                    </div>
                  </div>
                  <Select
                    value={String(selectedDays)}
                    onValueChange={(v) => setSelectedDays(Number(v) as 7 | 14 | 30)}
                  >
                    <SelectTrigger className="h-8 w-[120px] text-xs">
                      <SelectValue placeholder="Chọn ngày" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 ngày</SelectItem>
                      <SelectItem value="14">14 ngày</SelectItem>
                      <SelectItem value="30">30 ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className={elevatedPanelContentClass}>
                {revenueSeries.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <DashboardChartScroll>
                    <div className={DASHBOARD_CHART_H}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueSeries} margin={{ top: 10, right: 8, left: narrow ? -12 : 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="adminRevenueArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: narrow ? 9 : 10 }}
                            tickMargin={6}
                            interval="preserveStartEnd"
                            tickFormatter={(v: string) => {
                              const [, m, d] = v.split("-");
                              return m && d ? `${d}/${m}` : v;
                            }}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: narrow ? 10 : 11 }}
                            width={narrow ? 40 : 52}
                          />
                          <Tooltip
                            formatter={(value: number | undefined) =>
                              value != null ? formatCurrency(value) : ""
                            }
                            labelFormatter={(label) => `Ngày ${label}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#adminRevenueArea)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </DashboardChartScroll>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
              <Card className={cn(elevatedPanelClass, "min-w-0")}>
                <CardHeader className={elevatedCardHeaderPrimary}>
                  <CardTitle className="text-base">Doanh thu theo Level</CardTitle>
                  <CardDescription className="text-xs">Tỷ lệ theo nhóm</CardDescription>
                </CardHeader>
                <CardContent className={elevatedPanelContentClass}>
                  {revenueByLevel.length === 0 ? (
                    <ChartEmpty />
                  ) : (
                    <DashboardChartScroll>
                      <div className={DASHBOARD_CHART_H}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                            <Tooltip
                              formatter={(v: number | undefined) =>
                                v != null ? formatCurrency(Number(v)) : ""
                              }
                            />
                            <Pie
                              data={revenueByLevel}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={narrow ? 32 : 44}
                              outerRadius={narrow ? 62 : 78}
                              paddingAngle={2}
                            >
                              {revenueByLevel.map((entry, index) => (
                                <Cell key={`${entry.name}-${index}`} fill={revenueLevelPieFill(entry.name, index)} />
                              ))}
                            </Pie>
                            <Legend
                              verticalAlign="bottom"
                              height={narrow ? 56 : 48}
                              formatter={(value: string) => (
                                <span className="text-[11px] text-foreground">{value}</span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </DashboardChartScroll>
                  )}
                  {revenueByLevel.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {revenueByLevel.map((item, index) => (
                        <Badge key={item.name} variant="outline" className="gap-1.5 text-[11px]">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: revenueLevelPieFill(item.name, index) }}
                            aria-hidden
                          />
                          {item.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className={cn(elevatedPanelClass, "min-w-0")}>
                <CardHeader className={elevatedCardHeaderPrimary}>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">Học tập & nội dung</p>
                    <CardTitle className="text-base">Duyệt đang chờ</CardTitle>
                    <CardDescription className="text-xs">Theo loại</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className={elevatedPanelContentClass}>
                  {pendingPieData.length === 0 ? (
                    <ChartEmpty />
                  ) : (
                    <DashboardChartScroll>
                      <div className={DASHBOARD_CHART_H}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={pendingPieData}
                            layout="vertical"
                            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={narrow ? 88 : 116}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip formatter={(v: number | undefined) => (v != null ? formatNumber(Number(v)) : "")} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {pendingPieData.map((entry, index) => (
                                <Cell key={`${entry.name}-${index}`} fill={pendingApprovalTypePieFill(entry.name)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </DashboardChartScroll>
                  )}
                  {pendingPieData.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pendingPieData.map((item, index) => (
                        <Badge key={`${item.name}-${index}`} variant="outline" className="gap-1.5 text-[11px]">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: pendingApprovalTypePieFill(item.name) }}
                            aria-hidden
                          />
                          {item.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </DomainSection>
      </div>

      <Card className={elevatedPanelClass}>
        <CardHeader className={elevatedCardHeaderPrimary}>
          <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
          <CardDescription className="text-xs">12 đơn mới nhất — ưu tiên theo dõi vận hành</CardDescription>
        </CardHeader>
        <CardContent className={elevatedPanelContentClass}>
          {recentOrders.length === 0 ? (
            <div className={cn("py-10 text-center text-xs", emptyStateBoxClass)}>Chưa có dữ liệu.</div>
          ) : (
            <div className="max-h-[min(20rem,50vh)] max-w-full overflow-auto rounded-md border border-border/60">
              <Table className="min-w-[520px] w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-10 w-10 bg-card text-center">STT</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Mã đơn</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Khách hàng</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Email</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card text-right">Số tiền</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Trạng thái</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o: DashboardRecentOrderRowDTO, index: number) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">{o.code}</TableCell>
                      <TableCell className="max-w-[140px] truncate font-medium">{o.userName || "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground text-xs">
                        {o.userEmail}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(Number(o.amount) || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={orderStatusBadgeVariant(o.status)} className="text-[10px] font-semibold md:text-xs">
                          {orderStatusLabelVi(o.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-muted-foreground">{o.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
