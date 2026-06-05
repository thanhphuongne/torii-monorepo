'use client';

import { 
    Ticket, 
    History, 
    Gift, 
    Copy, 
    Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@workspace/ui/components/table";
import { ComponentLoading } from '@workspace/ui/components/component-loading';
import { formatDateTime, formatDate, formatCurrency } from '@/utils/format-utils';
import { cn } from '@workspace/ui/lib/utils';
import Link from 'next/link';
import { useCoupons } from './use-coupons';
import { SmartPagination } from '@/components/common/smart-pagination';
import { dataTableHeaderClass, dataTableShellClass } from '@/lib/ui-shell';

export default function CouponsPage() {
    const { 
        coupons, 
        couponsLoading, 
        gamificationHistory, 
        historyLoading, 
        historyMeta,
        historyPage,
        setHistoryPage,
        handleCopyCode 
    } = useCoupons();

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-8">
            {/* Standard Header */}
            <div className="space-y-4 pb-2 border-b border-border">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Kho ưu đãi</h1>
                <p className="text-sm font-medium text-muted-foreground w-full max-w-xl">
                    Tiết kiệm hơn với các mã giảm giá từ hệ thống Torii Academy.
                </p>
            </div>

            <Tabs defaultValue="available" className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
                    <TabsList className="w-full overflow-x-auto whitespace-nowrap bg-muted/50 p-1 rounded-lg border border-border/40 h-10 md:w-auto">
                        <TabsTrigger value="available" className="px-6 h-full rounded-md text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap gap-2">
                            <Ticket className="size-4" />
                            Ưu đãi hiện có
                            {coupons && coupons.length > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                                    {coupons.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="history" className="px-6 h-full rounded-md text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap gap-2">
                            <History className="size-4" />
                            Lịch sử Gamification
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="available" className="mt-0 space-y-4">
                    <div className="flex w-full justify-end">
                        <Link href="/dashboard/rewards">
                            <Button className="h-10 gap-2" variant="default">
                                <Gift className="size-4" />
                                Cửa hàng quà
                            </Button>
                        </Link>
                    </div>

                    {couponsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <Card key={i} className="h-32 animate-pulse" />
                            ))}
                        </div>
                    ) : (coupons || []).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {coupons?.map((coupon) => (
                                <Card key={coupon.id} className="overflow-hidden border-border/40 bg-card transition-all duration-300 rounded-2xl shadow-none hover:bg-muted/5 hover:border-primary/20">
                                    <div className="flex flex-col sm:flex-row h-full">
                                        <div className="bg-primary/[0.03] border-b sm:border-b-0 sm:border-r border-border/40 p-5 flex flex-col items-center justify-center min-w-[120px] shrink-0">
                                            <Ticket className="size-6 text-primary mb-2" />
                                            <span className="font-mono font-bold text-primary text-sm bg-primary/10 tracking-widest px-2 py-1 rounded-md">{coupon.code}</span>
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col justify-center space-y-3">
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-sm text-foreground leading-snug line-clamp-2">{coupon.description || 'Ưu đãi nội bộ'}</h4>
                                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                                                    <Clock className="size-3" />
                                                    <span>{coupon.validUntil ? `Hết hạn: ${formatDate(coupon.validUntil)}` : 'Vô thời hạn'}</span>
                                                </div>
                                            </div>
                                            
                                            {coupon.maxDiscountAmount && (
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100 font-semibold shadow-none rounded-md px-1.5 py-0.5">
                                                        Giảm tối đa {formatCurrency(coupon.maxDiscountAmount)}
                                                    </Badge>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 pt-1 border-t border-border/30 mt-auto">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 flex-1 font-semibold text-xs"
                                                    onClick={() => handleCopyCode(coupon.code)}
                                                >
                                                    <Copy className="size-3 mr-1.5" />
                                                    Lưu mã
                                                </Button>
                                                <Button size="sm" variant="secondary" className="h-8 flex-1 font-semibold text-xs shadow-none hover:bg-primary hover:text-white transition-colors" asChild>
                                                    <Link href="/dashboard/available-courses">Sử dụng</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="border-dashed py-12">
                            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-3 bg-muted rounded-full">
                                    <Ticket className="size-8 text-muted-foreground/50" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold">Trống kho ưu đãi</p>
                                    <p className="text-sm text-muted-foreground max-w-xs">
                                        Dùng điểm thưởng đổi voucher để nhận thêm ưu đãi nhé.
                                    </p>
                                </div>
                                <Link href="/dashboard/rewards">
                                    <Button variant="outline">Đi đổi quà ngay</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-muted/30 border-none">
                        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-background rounded-lg shadow-sm">
                                    <Gift className="size-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Muốn nhận thêm voucher?</p>
                                    <p className="text-xs text-muted-foreground">Học tập mỗi ngày để tích lũy thêm điểm thưởng.</p>
                                </div>
                            </div>
                            <Link href="/dashboard/available-courses" className="w-full sm:w-auto">
                                <Button size="sm" className="w-full">Bắt đầu học ngay</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="focus-visible:outline-none">
                    <div className={cn(dataTableShellClass, "rounded-2xl p-0")}>
                        <div className="relative overflow-x-auto">
                            <Table className="min-w-[900px] border-collapse bg-transparent">
                                <TableHeader className={dataTableHeaderClass}>
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="h-11 w-[64px] px-4 text-center text-xs font-semibold text-muted-foreground">STT</TableHead>
                                        <TableHead className="h-11 px-4 text-xs font-semibold text-muted-foreground">Nội dung</TableHead>
                                        <TableHead className="h-11 px-4 text-xs font-semibold text-muted-foreground">Thời gian</TableHead>
                                        <TableHead className="h-11 w-[180px] px-4 text-xs font-semibold text-muted-foreground">Loại</TableHead>
                                        <TableHead className="h-11 w-[160px] px-4 text-right text-xs font-semibold text-muted-foreground">Biến động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center">
                                                <ComponentLoading />
                                            </TableCell>
                                        </TableRow>
                                    ) : gamificationHistory.length > 0 ? (
                                        gamificationHistory.map((item: any, index: number) => (
                                            <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                                                <TableCell className="py-3 px-4 text-center text-xs font-medium text-foreground/70">
                                                    {(historyMeta.page - 1) * historyMeta.limit + index + 1}
                                                </TableCell>
                                                <TableCell className="py-3 px-4">
                                                    <div className="font-semibold text-sm text-foreground/90 group-hover:text-primary transition-colors">
                                                        {item.description?.replace(/Received (points|XP) for LOGIN/i, 'Đăng nhập hằng ngày')
                                                            .replace(/Received (points|XP) for REVIEW/i, 'Đánh giá khóa học')
                                                            .replace(/Received (points|XP) for FLASHCARD_REVIEW/i, 'Ôn tập thẻ từ')
                                                            .replace('Redeemed', 'Đổi quà:') || item.description}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 whitespace-nowrap text-xs font-medium text-muted-foreground">
                                                    {formatDateTime(item.createdAt)}
                                                </TableCell>
                                                <TableCell className="py-3 px-4">
                                                    <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/60 bg-muted/20">
                                                        {item.activityType || item.metadata?.itemName || 'Hệ thống'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-right">
                                                    <span className={cn(
                                                        "font-bold text-sm tabular-nums tracking-tight whitespace-nowrap",
                                                        item.amount > 0 ? "text-emerald-600" : "text-destructive/80"
                                                    )}>
                                                        {item.amount > 0 ? `+${item.amount}` : item.amount.toLocaleString()}
                                                        <span className="ml-1 text-[10px]">
                                                            {String(item.currency || '').toUpperCase() === 'XP' ? 'XP' : 'Điểm'}
                                                        </span>
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={5} className="h-32 text-center">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <History className="mb-2 size-6 text-muted-foreground/30" />
                                                    <p className="text-sm font-medium text-muted-foreground">Chưa có lịch sử điểm thưởng</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="pt-4">
                        <SmartPagination
                            page={historyPage}
                            totalPages={historyMeta.totalPages || 0}
                            totalItems={historyMeta.total || 0}
                            onPageChange={setHistoryPage}
                            itemName="lượt lịch sử"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
