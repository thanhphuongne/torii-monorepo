'use client';
import { useState } from 'react'
import {
    CheckCircle2,
    Clock,
    XCircle,
    Search,
    Eye,
    Filter,
    RotateCcw,
    CreditCard,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@workspace/ui/components/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@workspace/ui/components/pagination"
import { cn } from '@workspace/ui/lib/utils'
import { useOrders, useOrder, useRepayOrder } from '@/lib/api/services/order-api'
import { ComponentLoading } from '@workspace/ui/components/component-loading'
import { Separator } from '@workspace/ui/components/separator'
import { formatDateTime, isWithinGracePeriod, formatCurrency } from '@/utils/format-utils'
import { toast } from 'sonner'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@workspace/ui/components/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { useWalletTransactions, useWalletBalance } from '@/lib/api/services/wallet-api'
import { Coins, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { useAppSelector } from '@/hooks/hooks'

export default function PaymentHistoryPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    const user = useAppSelector(state => state.auth.user)
    const { data: balanceData } = useWalletBalance()
    const [walletPage, setWalletPage] = useState(1)

    const limit = 10;

    const { data, isLoading } = useOrders({
        limit: limit,
        page: currentPage,
        status: statusFilter === 'all' ? undefined : statusFilter as any
    })

    const { data: walletData, isLoading: isLoadingWallet } = useWalletTransactions({
        page: walletPage,
        limit: limit
    })

    const { data: orderDetails, isLoading: isLoadingDetails } = useOrder(selectedOrderId || '')
    const repayMutation = useRepayOrder()

    const handleRepay = async (orderId: string) => {
        try {
            const result = await repayMutation.mutateAsync(orderId);
            if (result.paymentUrl) {
                window.location.href = result.paymentUrl;
            }
        } catch (error: any) {
            const backendMessage = error?.response?.data?.message || error?.message
            const friendlyMessage =
                typeof backendMessage === 'string' && backendMessage.includes('Đơn hàng không còn hợp lệ')
                    ? `${backendMessage}. Vui lòng tạo đơn mới.`
                    : (backendMessage || 'Không thể thực hiện thanh toán lại');
            toast.error(friendlyMessage);
        }
    };

    const orders = data?.data || []
    const meta = {
        totalPages: data?.totalPages || 1,
        currentPage: data?.page || 1,
        totalItems: data?.total || 0,
    }

    const walletTransactions = walletData?.data || []
    const walletMeta = {
        totalPages: walletData?.totalPages || 1,
        currentPage: walletData?.page || 1,
        totalItems: walletData?.total || 0
    }

    const getStatusInfo = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'paid':
                return {
                    label: 'Thành công',
                    color: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
                    icon: <CheckCircle2 className="w-3 h-3" />
                }
            case 'pending':
            case 'processing':
                return {
                    label: 'Chờ xử lý',
                    color: 'bg-amber-500/5 text-amber-600 border-amber-500/10',
                    icon: <Clock className="w-3 h-3" />
                }
            case 'failed':
            case 'cancelled':
                return {
                    label: 'Thất bại',
                    color: 'bg-red-500/5 text-red-600 border-red-500/10',
                    icon: <XCircle className="w-3 h-3" />
                }
            case 'timed_out':
                return {
                    label: 'Hết thời gian',
                    color: 'bg-slate-500/5 text-slate-600 border-slate-500/10',
                    icon: <Clock className="w-3 h-3" />
                }
            case 'refunded':
                return {
                    label: 'Đã hoàn tiền',
                    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                    icon: <RotateCcw className="w-3 h-3" />
                }
            default:
                return {
                    label: status || 'Không xác định',
                    color: 'bg-muted/5 text-muted-foreground border-border/10',
                    icon: null
                }
        }
    }

    const handleViewDetail = (id: string) => {
        setSelectedOrderId(id)
        setIsDetailOpen(true)
    }

    const handlePageChange = (page: number) => {
        if (page < 1 || page > meta.totalPages) return
        setCurrentPage(page)
    }

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = []
        const totalPages = meta.totalPages
        const current = meta.currentPage

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (current <= 3) {
                pages.push(1, 2, 3, '...', totalPages)
            } else if (current >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, '...', current - 1, current, current + 1, '...', totalPages)
            }
        }
        return pages
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">

            <div className="space-y-4 pb-8 border-b border-border">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2.5 rounded-2xl shrink-0">
                        <CreditCard className="size-6 text-primary fill-primary/20" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Lịch sử thanh toán
                        </h1>
                        <p className="text-sm font-medium text-muted-foreground w-full max-w-xl">
                            Theo dõi các giao dịch, trạng thái thanh toán và số dư Ví Torii.
                        </p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="orders" className="space-y-6">
                <TabsList className="w-full overflow-x-auto whitespace-nowrap">
                    <TabsTrigger value="orders">
                        <span>Đơn hàng</span>
                        <Badge variant="secondary" className="px-1.5 py-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-background border-border text-[10px]">
                            {meta.totalItems}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="wallet">
                        <span>Lịch sử Xu</span>
                        <Badge variant="secondary" className="px-1.5 py-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-background border-border text-[10px]">
                            {walletMeta.totalItems}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
                        <div className="w-full sm:w-[180px]">
                            <Select value={statusFilter} onValueChange={(val) => {
                                setStatusFilter(val)
                                setCurrentPage(1)
                            }}>
                                <SelectTrigger className="h-10 w-full bg-background border-input rounded-xl text-sm font-medium focus:ring-1 focus:ring-primary transition-all shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-muted-foreground" />
                                        <SelectValue placeholder="Trạng thái" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="completed">Thành công</SelectItem>
                                    <SelectItem value="pending">Chờ xử lý</SelectItem>
                                    <SelectItem value="failed">Thất bại</SelectItem>
                                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                                    <SelectItem value="timed_out">Hết thời gian</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 md:flex-initial w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm mã đơn, nội dung..."
                                className="pl-9 h-10 w-full md:w-64 bg-background border-input rounded-xl text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-primary transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setCurrentPage(1) // Reset to page 1 on search
                                }}
                            />
                        </div>
                    </div>

                    {/* Table Content */}
                    {isLoading ? (
                        <ComponentLoading className="h-64" />
                    ) : (
                        <div className="space-y-6">
                            <Card className="rounded-2xl border-border bg-card overflow-hidden p-0 shadow-sm">
                                <div className="relative overflow-x-auto">
                                    <Table className="min-w-[1000px] border-collapse bg-transparent">
                                        <TableHeader className="bg-muted/30 border-b border-border">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 w-[60px]">STT</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 w-[150px]">Mã đơn</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4">Nội dung</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 w-[180px]">Ngày tạo</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 text-right w-[150px]">Tổng tiền</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 text-center w-[150px]">Trạng thái</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 text-right w-[100px]">Thao tác</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orders.length > 0 ? orders.map((order, index) => {
                                                const statusInfo = getStatusInfo(order.status)
                                                return (
                                                    <TableRow key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                                                        <TableCell className="py-3 px-4 text-sm text-foreground/80 whitespace-nowrap font-medium text-center">
                                                            {(currentPage - 1) * limit + index + 1}
                                                        </TableCell>
                                                        <TableCell className="py-3 px-4 text-sm text-foreground/80 whitespace-nowrap font-mono text-muted-foreground">
                                                            #{order.transactionId || order.id.slice(-6).toUpperCase()}
                                                        </TableCell>
                                                        <TableCell className="py-3 px-4 text-sm text-foreground/80 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground truncate max-w-[300px]">{order.description || 'Thanh toán khóa học'}</span>
                                                                    {(order as any).orderType === 'refund' && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-600 border-amber-200 font-bold">Hoàn trả</Badge>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-muted-foreground font-medium">{order.paymentMethod || 'Cổng thanh toán'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3 px-4 text-sm text-foreground/80 whitespace-nowrap text-muted-foreground font-medium text-center">
                                                            {formatDateTime(order.createdAt)}
                                                        </TableCell>
                                                        <TableCell className={cn(
                                                            "py-3 px-4 text-sm whitespace-nowrap text-right font-bold tabular-nums",
                                                            (order as any).orderType === 'refund' ? "text-emerald-600" : "text-foreground"
                                                        )}>
                                                            {(() => {
                                                                const walletDiscount = Number((order.metadata as any)?.walletDiscount ?? 0)
                                                                const cash = order.amount
                                                                if (walletDiscount > 0 && cash === 0) {
                                                                    return <span className="text-amber-600">{walletDiscount.toLocaleString()} Xu</span>
                                                                } else if (walletDiscount > 0 && cash > 0) {
                                                                    return <span><span className="text-amber-600 text-xs">{walletDiscount.toLocaleString()} Xu + </span>{formatCurrency(cash)}</span>
                                                                }
                                                                return <>{(order as any).orderType === 'refund' ? '+' : ''}{formatCurrency(cash)}</>
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="py-3 px-4 text-sm text-foreground/80 whitespace-nowrap">
                                                            <div className="flex justify-center">
                                                                <span className={cn(
                                                                    "px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5",
                                                                    statusInfo.color
                                                                )}>
                                                                    {statusInfo.icon}
                                                                    {statusInfo.label}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-3 px-4 text-sm text-foreground/80 whitespace-nowrap text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {order.status === 'PENDING' && isWithinGracePeriod(order.createdAt, 15) && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 px-2 rounded-lg text-primary hover:text-primary hover:bg-primary/5 border-primary/20 flex items-center gap-2"
                                                                        onClick={() => handleRepay(order.id)}
                                                                        disabled={repayMutation.isPending}
                                                                    >
                                                                        <CreditCard className="w-3.5 h-3.5" />
                                                                        <span className="text-xs font-bold">Thanh toán</span>
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 px-3 rounded-lg text-muted-foreground hover:text-foreground border-border/60 flex items-center gap-1.5"
                                                                    onClick={() => handleViewDetail(order.id)}
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    <span className="text-xs font-medium">Xem</span>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            }) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                        Bạn chưa có đơn hàng nào.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>

                            {/* Orders Pagination */}
                            {orders.length > 0 && meta.totalPages > 1 && (
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                                        </PaginationItem>
                                        {getPageNumbers().map((page, index) => (
                                            <PaginationItem key={index}>
                                                {page === '...' ? <PaginationEllipsis /> : (
                                                    <PaginationLink isActive={page === currentPage} onClick={() => handlePageChange(page as number)}>
                                                        {page}
                                                    </PaginationLink>
                                                )}
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="wallet" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="rounded-2xl border-border bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-sm overflow-hidden border">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-amber-600">Số dư Ví Torii</CardTitle>
                                    <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                        <Wallet className="size-4 text-amber-600" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-foreground">{(balanceData || 0).toLocaleString()}</span>
                                    <span className="text-sm font-bold text-amber-600">Xu</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">Sử dụng để thanh toán các dịch vụ & khóa học.</p>
                            </CardContent>
                        </Card>
                    </div>

                    {isLoadingWallet ? (
                        <ComponentLoading className="h-64" />
                    ) : (
                        <div className="space-y-6">
                            <Card className="rounded-2xl border-border bg-card overflow-hidden p-0 shadow-sm border">
                                <div className="relative overflow-x-auto font-sans">
                                    <Table className="min-w-[1000px] border-collapse bg-transparent">
                                        <TableHeader className="bg-muted/30 border-b border-border">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 w-[60px] text-center">STT</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 w-[180px]">Loại giao dịch</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4">Nội dung</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 w-[200px] text-center">Thời gian</TableHead>
                                                <TableHead className="h-11 text-xs font-semibold text-muted-foreground px-4 text-right w-[150px]">Số lượng (Xu)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {walletTransactions.length > 0 ? walletTransactions.map((tx, index) => (
                                                <TableRow key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                                                    <TableCell className="py-3 px-4 text-xs text-foreground/80 whitespace-nowrap font-medium text-center">
                                                        {(walletPage - 1) * limit + index + 1}
                                                    </TableCell>
                                                    <TableCell className="py-3 px-4 text-xs text-foreground/80 whitespace-nowrap font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {tx.type === 'REFUND' ? (
                                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                                    <div className="p-1 bg-emerald-500/10 rounded-lg">
                                                                        <ArrowUpCircle className="size-3" />
                                                                    </div>
                                                                    <span className="font-bold tracking-normal">Hoàn tiền</span>
                                                                </div>
                                                            ) : tx.type === 'PURCHASE' ? (
                                                                <div className="flex items-center gap-1.5 text-red-600">
                                                                    <div className="p-1 bg-red-500/10 rounded-lg">
                                                                        <ArrowDownCircle className="size-3" />
                                                                    </div>
                                                                    <span className="font-bold tracking-normal">Thanh toán</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-amber-600">
                                                                    <div className="p-1 bg-amber-500/10 rounded-lg">
                                                                        <Coins className="size-3" />
                                                                    </div>
                                                                    <span className="font-bold tracking-normal">Thiết lập</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 px-4 text-xs text-foreground/80 whitespace-nowrap font-medium max-w-[400px] truncate">
                                                        {tx.description}
                                                    </TableCell>
                                                    <TableCell className="py-3 px-4 text-xs text-foreground/80 whitespace-nowrap text-muted-foreground font-mono text-center">
                                                        {formatDateTime(tx.createdAt)}
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "py-3 px-4 text-xs whitespace-nowrap text-right font-bold tabular-nums",
                                                        tx.type === 'REFUND' || tx.type === 'BONUS' ? "text-emerald-600" : "text-red-500"
                                                    )}>
                                                        {tx.type === 'REFUND' || tx.type === 'BONUS' ? "+" : "-"}{tx.amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm font-medium italic">
                                                        Bạn chưa có giao dịch nào trong ví.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>

                            {/* Wallet Pagination */}
                            {walletTransactions.length > 0 && walletMeta.totalPages > 1 && (
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious onClick={() => setWalletPage(Math.max(1, walletPage - 1))} />
                                        </PaginationItem>
                                        {Array.from({ length: walletMeta.totalPages }, (_, i) => i + 1).map((p) => (
                                            <PaginationItem key={p}>
                                                <PaginationLink isActive={p === walletPage} onClick={() => setWalletPage(p)}>
                                                    {p}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext onClick={() => setWalletPage(Math.min(walletMeta.totalPages, walletPage + 1))} />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Order Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-md rounded-2xl p-6 border-border bg-background shadow-lg">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="text-xl font-bold">Chi tiết đơn hàng</DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground">
                            Mã đơn: #{orderDetails?.transactionId || orderDetails?.id.slice(-6).toUpperCase() || selectedOrderId?.slice(-6).toUpperCase()}
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="py-12 flex justify-center">
                            <ComponentLoading />
                        </div>
                    ) : orderDetails ? (
                        <div className="space-y-6 mt-4">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border border-border">
                                    <span className="text-xs font-semibold text-muted-foreground">Trạng thái</span>
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                        getStatusInfo(orderDetails.status).color
                                    )}>
                                        {getStatusInfo(orderDetails.status).label}
                                    </span>
                                </div>

                                <div className="space-y-3 px-1">
                                    <div className="flex justify-between text-sm items-baseline">
                                        <span className="text-muted-foreground font-medium">Nội dung</span>
                                        <span className="font-semibold text-right max-w-[200px] leading-tight text-foreground">{orderDetails.description || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-baseline">
                                        <span className="text-muted-foreground font-medium">Thời gian</span>
                                        <span className="font-mono text-xs text-foreground">{formatDateTime(orderDetails.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm items-baseline">
                                        <span className="text-muted-foreground font-medium">Phương thức</span>
                                        <span className="font-semibold text-xs text-foreground">{orderDetails.paymentMethod || 'Thanh toán trực tuyến'}</span>
                                    </div>
                                    <Separator className="bg-border my-4" />
                                    {(() => {
                                        const walletDiscount = Number((orderDetails.metadata as any)?.walletDiscount ?? 0)
                                        const cash = orderDetails.amount
                                        return (
                                            <div className="space-y-2 pt-2">
                                                {walletDiscount > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground font-medium">Thanh toán bằng Xu</span>
                                                        <span className="font-bold text-amber-600">{walletDiscount.toLocaleString()} Xu</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold text-foreground">Thanh toán tiền mặt</span>
                                                    <span className="text-xl font-bold text-primary">{formatCurrency(cash)}</span>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>

                            {orderDetails.status === 'PENDING' && isWithinGracePeriod(orderDetails.createdAt, 15) && (
                                <Button
                                    className="w-full h-11 rounded-xl font-bold shadow-sm"
                                    onClick={() => handleRepay(orderDetails.id)}
                                    disabled={repayMutation.isPending}
                                >
                                    {repayMutation.isPending ? 'Đang tạo link thanh toán...' : 'Tiếp tục đến trang thanh toán'}
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                className="w-full h-11 rounded-xl border-border font-bold text-muted-foreground hover:bg-muted/50 transition-all"
                                onClick={() => setIsDetailOpen(false)}
                            >
                                Đóng
                            </Button>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-destructive font-medium">
                            Không thể tải chi tiết đơn hàng.
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
