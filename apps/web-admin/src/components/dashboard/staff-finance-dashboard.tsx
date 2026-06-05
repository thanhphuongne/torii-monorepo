import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { PageLoading } from "@workspace/ui/components/page-loading";
import { StatsCard } from "./stats-card";
import { useStaffOperationsDashboard } from "@/lib/api/services/dashboard";
import { formatCurrency, formatNumber } from "@/lib/format-utils";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { BarChart3, HandCoins, ReceiptText, Wallet, TrendingUp, ListTodo } from "lucide-react";
import {
  elevatedPanelClass,
  elevatedPanelContentClass,
  elevatedCardHeaderOps,
  elevatedCardHeaderSuccess,
  emptyStateBoxClass,
} from "@/lib/ui-shell";
import { orderStatusPieFill, orderStatusLabelVi, revenueLevelPieFill } from "@/lib/dashboard-chart-colors";
import { cn } from "@workspace/ui/lib/utils";
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

export default function StaffFinanceDashboard() {
  const narrow = useNarrowMobile();
  const [selectedDays, setSelectedDays] = useState<7 | 14 | 30>(30);
  const { data, isLoading } = useStaffOperationsDashboard();
  const revenueLast30Days = data?.revenueLast30Days ?? [];
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

  const ordersBarData = (data?.ordersByStatus ?? []).map((d) => ({
    label: orderStatusLabelVi(d.name),
    value: d.value,
    statusKey: d.name,
  }));
  const revenueByLevel = (data?.revenueByLevel ?? []).slice(0, 8).map((r) => ({
    name: r.level,
    value: r.amount,
  }));
  const recentOrders = data?.recentOrders ?? [];
  const tickets = data?.stats.pendingTickets ?? 0;
  const refunds = data?.stats.pendingRefunds ?? 0;
  const hasAttention = tickets > 0 || refunds > 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
      {hasAttention ? (
        <Card className="border-amber-500/35 bg-amber-500/[0.04]">
          <CardContent className="flex flex-wrap items-center gap-2 py-3">
            <ListTodo className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Cần xử lý</span>
            {refunds > 0 ? (
              <Badge variant="secondary" className="font-semibold tabular-nums">
                Hoàn tiền: {formatNumber(refunds)}
              </Badge>
            ) : null}
            {tickets > 0 ? (
              <Badge variant="secondary" className="font-semibold tabular-nums">
                Phiếu hỗ trợ: {formatNumber(tickets)}
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h2 className="text-base font-semibold tracking-tight">Tài chính &amp; vận hành đơn</h2>
        <p className="text-xs text-muted-foreground">
          Theo dõi xu hướng doanh thu, cơ cấu doanh thu theo cấp độ và phân bổ đơn hàng theo trạng thái.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatsCard
          title="Doanh thu (tổng)"
          value={formatCurrency(data?.stats.totalRevenue ?? 0)}
          sub="Tổng doanh thu đã thanh toán"
          icon={Wallet}
          tone="success"
        />
        <StatsCard
          title="Đơn đã thanh toán"
          value={formatNumber(data?.stats.paidOrders ?? 0)}
          sub="Giao dịch thành công"
          icon={ReceiptText}
          tone="info"
        />
        <StatsCard
          title="Hoàn tiền chờ"
          value={formatNumber(refunds)}
          sub="Phiếu hoàn tiền chờ xử lý"
          icon={HandCoins}
          tone="warning"
          highlight={refunds > 0}
        />
        <StatsCard
          title="Phiếu hỗ trợ mở"
          value={formatNumber(tickets)}
          sub="Hỗ trợ thanh toán"
          icon={ReceiptText}
          tone="primary"
          highlight={tickets > 0}
        />
      </div>

      <Card className={elevatedPanelClass}>
        <CardHeader className={elevatedCardHeaderOps}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
              <div>
                <CardTitle className="text-base">Doanh thu theo ngày</CardTitle>
                <CardDescription className="text-xs">Doanh thu từ đơn đã thanh toán theo khoảng thời gian đã chọn</CardDescription>
              </div>
            </div>
            <Select value={String(selectedDays)} onValueChange={(v) => setSelectedDays(Number(v) as 7 | 14 | 30)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Khoảng ngày" />
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
                  <AreaChart
                    data={revenueSeries}
                    margin={{ top: 10, right: 8, left: narrow ? -12 : 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="staffRevenueArea" x1="0" y1="0" x2="0" y2="1">
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
                      tick={{ fontSize: 11 }}
                      width={narrow ? 40 : 52}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => (value != null ? formatCurrency(value) : "")}
                      labelFormatter={(label) => `Ngày ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#staffRevenueArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </DashboardChartScroll>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={elevatedPanelClass}>
          <CardHeader className={elevatedCardHeaderSuccess}>
            <CardTitle className="text-base">Doanh thu theo cấp độ</CardTitle>
            <CardDescription className="text-xs">Tỷ trọng doanh thu theo từng nhóm cấp độ</CardDescription>
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
          </CardContent>
        </Card>

        <Card className={elevatedPanelClass}>
          <CardHeader className={elevatedCardHeaderOps}>
            <CardTitle className="text-base">Đơn hàng theo trạng thái</CardTitle>
            <CardDescription className="text-xs">Số lượng đơn theo từng trạng thái</CardDescription>
          </CardHeader>
          <CardContent className={elevatedPanelContentClass}>
            {ordersBarData.length === 0 ? (
              <ChartEmpty />
            ) : (
              <DashboardChartScroll>
                <div className={cn(DASHBOARD_CHART_H, narrow && "min-w-[300px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={ordersBarData}
                      margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal />
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={narrow ? 92 : 128}
                        tick={{ fontSize: narrow ? 9 : 10 }}
                      />
                      <Tooltip formatter={(v) => (v != null ? formatNumber(Number(v)) : "")} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {ordersBarData.map((e, i) => (
                          <Cell key={i} fill={orderStatusPieFill(e.statusKey)} />
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

      <Card className={elevatedPanelClass}>
        <CardHeader className={elevatedCardHeaderOps}>
          <CardTitle className="text-base">Đơn hàng mới nhất</CardTitle>
          <CardDescription className="text-xs">Danh sách đơn hàng gần đây dạng bảng</CardDescription>
        </CardHeader>
        <CardContent className={elevatedPanelContentClass}>
          {recentOrders.length === 0 ? (
            <div className={cn("py-10 text-center text-xs", emptyStateBoxClass)}>Chưa có dữ liệu.</div>
          ) : (
            <div className="max-h-[min(20rem,50vh)] max-w-full overflow-auto rounded-md border border-border/60">
              <Table className="min-w-[560px] w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-10 w-10 bg-card text-center">STT</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Mã đơn</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Khách hàng</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Email</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card text-right">Số tiền</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Ngày</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o, index) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-medium">{o.code}</TableCell>
                      <TableCell className="max-w-[140px] truncate font-medium">{o.userName || "—"}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground text-xs">{o.userEmail}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(Number(o.amount) || 0)}
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
