import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, LineChart, PiggyBank, WalletCards } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { PageHeader } from "@/components/common/page-header";
import { PageLoading } from "@workspace/ui/components/page-loading";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { useRevenueAnalytics } from "@/lib/api/services/revenue-analytics";
import { formatCurrency, formatDateTime, vi } from "@/lib/format-utils";
import {
  elevatedCardHeaderOps,
  elevatedCardHeaderSuccess,
  elevatedPanelClass,
  elevatedPanelContentClass,
  emptyStateBoxClass,
} from "@/lib/ui-shell";
import { DASHBOARD_CHART_H, DashboardChartScroll, useNarrowMobile } from "@/components/dashboard/dashboard-responsive";

function ChartEmpty() {
  return (
    <div className={cn(DASHBOARD_CHART_H, emptyStateBoxClass)}>
      <LineChart className="size-8 text-muted-foreground/30" aria-hidden />
      Chưa có dữ liệu
    </div>
  );
}

function paymentMethodFill(name: string, index: number) {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  const key = name.toLowerCase();
  if (key.includes("momo")) return "hsl(var(--chart-2))";
  if (key.includes("payos")) return "hsl(var(--chart-3))";
  if (key.includes("bank")) return "hsl(var(--chart-1))";
  return colors[index % colors.length];
}

function productTypeLabelVi(type: string) {
  switch (type) {
    case "COHORT":
      return "Lớp trực tiếp (đợt khai giảng)";
    case "VOD_PACKAGE":
      return "Khóa tự học";
    case "LIVE_CLASS":
      return "Lớp trực tiếp";
    case "AI_SUBSCRIPTION":
      return "Gói AI";
    default:
      return "Khác";
  }
}

function productTypeFill(type: string, index: number) {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  const key = type.toLowerCase();
  if (key.includes("vod")) return "hsl(var(--chart-2))";
  if (key.includes("cohort") || key.includes("live")) return "hsl(var(--chart-1))";
  if (key.includes("subscription") || key.includes("ai")) return "hsl(var(--chart-3))";
  return colors[index % colors.length];
}

export default function RevenueAnalyticsPage() {
  const narrow = useNarrowMobile();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);

  const { data, isLoading } = useRevenueAnalytics({ fromDate, toDate });

  const revenueByDay = data?.revenueByDay ?? [];
  const paymentRows = data?.revenueByPaymentMethod ?? [];
  const productRows = (data?.revenueByProductType ?? []).map((r) => ({
    name: productTypeLabelVi(r.type),
    value: r.amount,
    type: r.type,
  }));
  const recent = data?.recentPaidOrders ?? [];

  const quickSetDays = (days: number) => {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  };

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Phân tích doanh thu"
        subtitle="Theo dõi doanh thu theo ngày, phương thức thanh toán và loại sản phẩm."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => quickSetDays(1)}>
              Hôm nay
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSetDays(7)}>
              7 ngày
            </Button>
            <Button variant="outline" size="sm" onClick={() => quickSetDays(30)}>
              30 ngày
            </Button>
            <Button asChild size="sm">
              <Link to="/orders">Mở danh sách đơn</Link>
            </Button>
          </div>
        }
      />

      <Card className={elevatedPanelClass}>
        <CardHeader className={elevatedCardHeaderOps}>
          <CardTitle className="text-base">Bộ lọc ngày</CardTitle>
          <CardDescription className="text-xs">
            Chọn ngày cụ thể (from = to) hoặc khoảng ngày để xem chuỗi doanh thu.
          </CardDescription>
        </CardHeader>
        <CardContent className={elevatedPanelContentClass}>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Từ ngày</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? formatDateTime(fromDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate ? new Date(fromDate) : undefined}
                      onSelect={(date) => setFromDate(date ? formatDateTime(date, "yyyy-MM-dd") : today)}
                      initialFocus
                      locale={vi}
                    />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field>
                <FieldLabel>Đến ngày</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? formatDateTime(toDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate ? new Date(toDate) : undefined}
                      onSelect={(date) => setToDate(date ? formatDateTime(date, "yyyy-MM-dd") : today)}
                      initialFocus
                      locale={vi}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <PageLoading />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <Card className={elevatedPanelClass}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Doanh thu (PAID)</div>
                  <div className="truncate text-lg font-semibold tabular-nums">
                    {formatCurrency(data?.stats.totalRevenue ?? 0)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Trong khoảng ngày đã chọn</div>
                </div>
                <WalletCards className="size-5 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
            <Card className={elevatedPanelClass}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Số đơn PAID</div>
                  <div className="truncate text-lg font-semibold tabular-nums">{data?.stats.paidOrders ?? 0}</div>
                  <div className="text-[11px] text-muted-foreground">Đếm theo order</div>
                </div>
                <PiggyBank className="size-5 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
            <Card className={elevatedPanelClass}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Giá trị TB / đơn</div>
                  <div className="truncate text-lg font-semibold tabular-nums">
                    {formatCurrency(data?.stats.avgOrderValue ?? 0)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">AOV</div>
                </div>
                <LineChart className="size-5 text-muted-foreground" aria-hidden />
              </CardContent>
            </Card>
            <Card className={elevatedPanelClass}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Khoảng ngày</div>
                  <div className="truncate text-sm font-semibold tabular-nums">
                    {data?.fromDate} → {data?.toDate}
                  </div>
                  <div className="text-[11px] text-muted-foreground">UTC date</div>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {revenueByDay.length} ngày
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card className={elevatedPanelClass}>
            <CardHeader className={elevatedCardHeaderSuccess}>
              <CardTitle className="text-base">Doanh thu theo ngày</CardTitle>
              <CardDescription className="text-xs">Chuỗi thời gian — đơn PAID</CardDescription>
            </CardHeader>
            <CardContent className={elevatedPanelContentClass}>
              {revenueByDay.length === 0 ? (
                <ChartEmpty />
              ) : (
                <DashboardChartScroll>
                  <div className={DASHBOARD_CHART_H}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueByDay} margin={{ top: 10, right: 8, left: narrow ? -12 : 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
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
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={narrow ? 40 : 56} />
                        <Tooltip
                          formatter={(value: number | undefined) => (value != null ? formatCurrency(value) : "")}
                          labelFormatter={(label) => `Ngày ${label}`}
                        />
                        <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} fill="url(#revArea)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </DashboardChartScroll>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={elevatedPanelClass}>
              <CardHeader className={elevatedCardHeaderOps}>
                <CardTitle className="text-base">Doanh thu theo phương thức</CardTitle>
                <CardDescription className="text-xs">Tổng theo `payment_method`</CardDescription>
              </CardHeader>
              <CardContent className={elevatedPanelContentClass}>
                {paymentRows.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <DashboardChartScroll>
                    <div className={DASHBOARD_CHART_H}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                          <Tooltip formatter={(v: number | undefined) => (v != null ? formatCurrency(Number(v)) : "")} />
                          <Pie
                            data={paymentRows}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={narrow ? 32 : 44}
                            outerRadius={narrow ? 62 : 78}
                            paddingAngle={2}
                          >
                            {paymentRows.map((entry, index) => (
                              <Cell key={`${entry.name}-${index}`} fill={paymentMethodFill(entry.name, index)} />
                            ))}
                          </Pie>
                          <Legend
                            verticalAlign="bottom"
                            height={narrow ? 56 : 48}
                            formatter={(value: string) => <span className="text-[11px] text-foreground">{value}</span>}
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
                <CardTitle className="text-base">Doanh thu theo loại sản phẩm</CardTitle>
                <CardDescription className="text-xs">Gộp từ `order_items.price`</CardDescription>
              </CardHeader>
              <CardContent className={elevatedPanelContentClass}>
                {productRows.length === 0 ? (
                  <ChartEmpty />
                ) : (
                  <DashboardChartScroll>
                    <div className={DASHBOARD_CHART_H}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                          <Tooltip formatter={(v: number | undefined) => (v != null ? formatCurrency(Number(v)) : "")} />
                          <Pie
                            data={productRows}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={narrow ? 32 : 44}
                            outerRadius={narrow ? 62 : 78}
                            paddingAngle={2}
                          >
                            {productRows.map((entry, index) => (
                              <Cell key={`${entry.type}-${index}`} fill={productTypeFill(entry.type, index)} />
                            ))}
                          </Pie>
                          <Legend
                            verticalAlign="bottom"
                            height={narrow ? 56 : 48}
                            formatter={(value: string) => <span className="text-[11px] text-foreground">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </DashboardChartScroll>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className={elevatedPanelClass}>
            <CardHeader className={elevatedCardHeaderOps}>
              <CardTitle className="text-base">Đơn PAID gần đây</CardTitle>
              <CardDescription className="text-xs">Tối đa 20 đơn trong khoảng đã chọn</CardDescription>
            </CardHeader>
            <CardContent className={elevatedPanelContentClass}>
              {recent.length === 0 ? (
                <div className={cn("py-10 text-center text-xs", emptyStateBoxClass)}>Chưa có dữ liệu.</div>
              ) : (
                <ScrollArea className="h-[min(18rem,40vh)] rounded-md border border-border/60">
                  <div className="space-y-2 p-1 pr-3">
                    {recent.map((o) => (
                      <div
                        key={o.id}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{o.userName || o.userEmail || "—"}</div>
                          <div className="truncate text-xs text-muted-foreground">{o.userEmail}</div>
                          <div className="truncate text-[11px] text-muted-foreground">#{o.code}</div>
                        </div>
                        <div className="flex shrink-0 items-end justify-between gap-2 text-right sm:block sm:text-right">
                          <div className="text-sm font-semibold tabular-nums">{formatCurrency(Number(o.amount) || 0)}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">{o.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

