"use client"

import * as React from "react"
import { Check, Zap, Star, Crown, ArrowRight, BadgeCheck, Coins, HelpCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { formatCurrency } from "@/utils/format-utils"
import { useRouter } from "next/navigation"
import { toast } from "@workspace/ui/components/sonner"
import { orderApi } from "@/lib/api/services/order-api"
import { type OrderPreviewResponse } from "@/lib/api/services/order-api"
import { useWalletBalance } from "@/lib/api/services/wallet-api"
import { PaymentMethod } from "@workspace/schemas"
import { useAppSelector } from "@/hooks/hooks"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { agentApi } from "@/lib/api/services/agent-api"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Separator } from "@workspace/ui/components/separator"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@workspace/ui/components/alert-dialog"
import { Skeleton } from "@workspace/ui/components/skeleton"

interface Tier {
    id: string
    code: string
    name: string
    price: number
    quota: string
    description: string
    features: string[]
    icon: React.ReactNode
    popular?: boolean
    color: string
}

export default function SubscriptionsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [loadingTier, setLoadingTier] = React.useState<string | null>(null)
    const [selectedTier, setSelectedTier] = React.useState<{ tier: Tier, method: PaymentMethod, useWallet?: boolean } | null>(null)
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const [previewData, setPreviewData] = React.useState<OrderPreviewResponse | null>(null)
    const [isPreviewLoading, setIsPreviewLoading] = React.useState(false)

    const { data: quota } = useQuery({
        queryKey: ['quota-status'],
        queryFn: () => agentApi.sensei.getQuotaStatus(),
    })

    const { data: walletBalance = 0 } = useWalletBalance()

    const { data: remotePlans, isLoading: isPlansLoading } = useQuery({
        queryKey: ['ai-subscription-plans'],
        queryFn: () => agentApi.sensei.getPlans(),
    })

    const currentTier = quota?.tier?.toLowerCase() || 'free'

    const getTierConfig = (code: string) => {
        switch (code.toLowerCase()) {
            case 'premium':
                return {
                    icon: <Crown />,
                    color: "text-purple-600 bg-purple-500/10 border-purple-500/30",
                    popular: false
                }
            case 'plus':
                return {
                    icon: <Star className="fill-amber-500" />,
                    color: "text-amber-600 bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/20",
                    popular: true
                }
            default:
                return {
                    icon: <Zap />,
                    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
                    popular: false
                }
        }
    }

    const tiers: Tier[] = (remotePlans || []).map(p => {
        const config = getTierConfig(p.code)
        return {
            id: p.id,
            code: p.code,
            name: p.name,
            price: Number(p.price),
            quota: `${p.quotas?.ai_turns || 10} lượt/ngày`,
            description: p.description || "Dành cho người dùng AI Sensei.",
            features: p.features || [],
            icon: config.icon,
            color: config.color,
            popular: config.popular
        }
    })

    const currentTierIndex = tiers.findIndex(t => t.code === currentTier)

    const user = useAppSelector(state => state.auth.user)

    const handleConfirmSubscribe = (tier: Tier, method: PaymentMethod = PaymentMethod.PAYOS, useWallet: boolean = false) => {
        const targetTierIndex = tiers.findIndex(t => t.id === tier.id)

        if (targetTierIndex < currentTierIndex && currentTier !== 'free') {
            toast.info("Bạn không thể mua gói này vì đang dùng gói tiện ích cao hơn.")
            return
        }

        if (tier.code === currentTier) {
            toast.info("Bạn đang sử dụng gói này.")
            return
        }

        if (tier.price === 0) {
            toast.info("Gói Free đã được kích hoạt mặc định cho bạn.")
            return
        }

        setSelectedTier({ tier, method, useWallet })
        setConfirmOpen(true)
    }

    React.useEffect(() => {
        if (confirmOpen && selectedTier) {
            const fetchPreview = async () => {
                setIsPreviewLoading(true)
                try {
                    const data = await orderApi.previewOrder({
                        subscriptionPlanIds: [selectedTier.tier.id],
                        useWalletBalance: selectedTier.useWallet
                    })
                    setPreviewData(data)
                } catch (err: any) {
                    toast.error(err.message || "Lỗi khi tính toán giá gói.")
                } finally {
                    setIsPreviewLoading(false)
                }
            }
            fetchPreview()
        } else {
            setPreviewData(null)
        }
    }, [confirmOpen, selectedTier])

    const processSubscription = async () => {
        if (!selectedTier) return

        const { tier, method } = selectedTier
        setConfirmOpen(false)
        setLoadingTier(tier.id)

        try {
            const response = await orderApi.createOrder({
                subscriptionPlanIds: [tier.id],
                description: `Đăng ký gói ${tier.name} - Torii AI Sensei`,
                couponCode: "",
                paymentMethod: method,
                useWalletBalance: selectedTier.useWallet
            })

            if (response.paymentUrl) {
                toast.success("Đang chuyển hướng đến trang thanh toán...")
                window.location.href = response.paymentUrl
            } else {
                // If paid with Coins, it might be fulfilled immediately
                await queryClient.invalidateQueries({ queryKey: ['quota-status'] })
                await queryClient.invalidateQueries({ queryKey: ['ai-subscription-plans'] })

                router.push(`/dashboard/payment?orderId=${response.id}`)
                toast.success("Đã tạo đơn hàng thành công!")
            }
        } catch (error: any) {
            toast.error(error.message || "Không thể khởi tạo thanh toán. Vui lòng thử lại sau.")
        } finally {
            setLoadingTier(null)
            setSelectedTier(null)
        }
    }

    if (isPlansLoading) {
        return (
            <div className="container max-w-6xl mx-auto py-12 px-4 space-y-12">
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-8 w-64 rounded-full" />
                    <Skeleton className="h-12 w-3/4 sm:w-[500px]" />
                    <Skeleton className="h-6 w-1/2 sm:w-[400px]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="h-[600px] border-border/50">
                            <CardHeader className="space-y-4">
                                <Skeleton className="h-12 w-12 rounded-2xl" />
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-4 w-full" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-32 w-full" />
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-12 w-full rounded-xl" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-8">
            {/* Standard Header */}
            <div className="space-y-4 pb-8 border-b border-border">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Nâng tầm học tập</h1>
                <p className="text-sm font-medium text-muted-foreground w-full max-w-xl">
                    Mở khóa toàn bộ tiềm năng của AI Sensei và đẩy nhanh hành trình học Tiếng Nhật của bạn thông qua các gói dịch vụ cao cấp.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {tiers.map((tier, index) => {
                    const isCurrent = tier.code === currentTier
                    const isDowngrade = index < currentTierIndex && currentTier !== 'free'

                    return (
                        <Card key={tier.id} className={cn(
                            "relative flex flex-col h-full border-border/40 bg-card hover:bg-muted/5 transition-all duration-300 rounded-2xl overflow-hidden shadow-none group",
                            isCurrent && "border-primary/50 bg-primary/[0.02]"
                        )}>

                            {tier.popular && (
                                <div className="absolute top-4 right-4">
                                    <Badge className="bg-amber-500 text-white border-none px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm">
                                        Phổ biến
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className="space-y-3 pt-6 pb-4">
                                <div className="size-10 rounded-xl flex items-center justify-center bg-primary/5 text-primary [&>svg]:size-5 [&>svg]:shrink-0">
                                    {tier.icon}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg font-bold tracking-tight">{tier.name}</CardTitle>
                                            {isCurrent && (
                                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold h-5 text-[9px] px-1.5 flex items-center justify-center">
                                                    Hiện tại
                                                </Badge>
                                            )}
                                        </div>
                                        {isCurrent && quota?.expiresAt && (
                                            <span className="text-[10px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
                                                <BadgeCheck className="size-3" />
                                                Hạn dùng: {format(new Date(quota.expiresAt), "dd/MM/yyyy", { locale: vi })}
                                            </span>
                                        )}
                                    </div>
                                    <CardDescription className="text-[12px] font-medium text-muted-foreground/60 line-clamp-2">
                                        {tier.description}
                                    </CardDescription>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-6 pt-0">
                                <div className="space-y-3">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold tracking-tight">
                                            {tier.price === 0 ? "Miễn phí" : formatCurrency(tier.price)}
                                        </span>
                                        {tier.price > 0 && <span className="text-[10px] font-semibold text-muted-foreground/40 leading-none ml-0.5">/tháng</span>}
                                    </div>

                                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-bold text-[10px] h-6 px-2.5 rounded-lg flex items-center gap-1.5 w-fit">
                                        <Zap className="size-3 fill-primary shrink-0" />
                                        <span className="translate-y-[0.5px]">{tier.quota}</span>
                                    </Badge>
                                </div>

                                <Separator className="bg-border/20" />

                                <ul className="space-y-2.5">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2.5 text-[12px] font-medium leading-tight text-foreground/70">
                                            <div className="size-4 flex items-center justify-center shrink-0 mt-0.5">
                                                <Check className="size-3.5 text-primary" />
                                            </div>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-2 pb-6 pt-2">
                                <Button
                                    className={cn(
                                        "w-full h-9 rounded-xl font-bold text-[11px] transition-all shadow-none",
                                        tier.popular ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-primary hover:bg-primary/95",
                                        (isCurrent || isDowngrade) && "bg-muted text-muted-foreground hover:bg-muted cursor-default border-transparent"
                                    )}
                                    onClick={() => handleConfirmSubscribe(tier, PaymentMethod.PAYOS)}
                                    disabled={loadingTier === tier.id || isCurrent || isDowngrade}
                                >
                                    {loadingTier === tier.id ? (
                                        <Zap className="size-3 animate-spin mr-1.5" />
                                    ) : isCurrent ? (
                                        <BadgeCheck className="size-3.5 mr-1.5" />
                                    ) : null}

                                    {isCurrent ? "Đang sử dụng" : isDowngrade ? "Đã vượt gói" : tier.price === 0 ? "Bắt đầu ngay" : "Nâng cấp gói"}
                                </Button>

                                {walletBalance > 0 && tier.price > 0 && !isCurrent && !isDowngrade && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-[10px] font-bold text-amber-600 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all flex items-center justify-center gap-1.5 h-9 rounded-xl shadow-sm mt-1"
                                        onClick={() => {
                                            const isFull = walletBalance >= tier.price
                                            handleConfirmSubscribe(tier, isFull ? PaymentMethod.COIN : PaymentMethod.PAYOS, true)
                                        }}
                                        disabled={loadingTier === tier.id}
                                    >
                                        <Coins className="size-3.5" />
                                        {walletBalance >= tier.price
                                            ? `Thanh toán bằng ${tier.price.toLocaleString()} Xu`
                                            : `Dùng ${walletBalance.toLocaleString()} Xu để giảm giá`}
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            <Card className="max-w-3xl mx-auto">
                <CardHeader className="space-y-2">
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <HelpCircle className="size-4 text-primary" />
                        Bạn có câu hỏi?
                    </CardTitle>
                    <CardDescription>
                        Mọi thắc mắc về gói đăng ký hoặc yêu cầu hỗ trợ, vui lòng liên hệ{" "}
                        <a className="text-primary underline-offset-2 hover:underline" href="mailto:support@torii.com">
                            support@torii.com
                        </a>
                        .
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">Hủy bất cứ lúc nào</Badge>
                        <Badge variant="secondary">Mã hóa bảo mật</Badge>
                        <Badge variant="secondary">Hỗ trợ 24/7</Badge>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="rounded-2xl max-w-[400px]">
                    <AlertDialogHeader className="space-y-3">
                        <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-1">
                            <Zap className="size-6 text-amber-600 fill-amber-600" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold">Xác nhận nâng cấp gói</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                            {isPreviewLoading ? (
                                <span className="flex items-center gap-2 py-4">
                                    <Zap className="size-4 animate-spin text-amber-600" />
                                    Đang tính toán giá ưu đãi...
                                </span>
                            ) : (
                                <>
                                    Bạn đang chọn nâng cấp lên gói <span className="text-foreground font-bold">{selectedTier?.tier.name}</span>.
                                    <br /><br />
                                    <div className="space-y-1.5 bg-muted/30 p-3 rounded-lg border border-border/50">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Giá niêm yết:</span>
                                            <span className="font-bold">{formatCurrency(selectedTier?.tier.price || 0)}</span>
                                        </div>
                                        {previewData?.prorationDiscount ? (
                                            <div className="flex justify-between text-emerald-600">
                                                <span className="flex items-center gap-1"><BadgeCheck className="size-3" /> Bù trừ gói cũ:</span>
                                                <span className="font-bold">-{formatCurrency(previewData.prorationDiscount)}</span>
                                            </div>
                                        ) : null}
                                        {previewData?.walletDiscount ? (
                                            <div className="flex justify-between text-amber-600">
                                                <span>Sử dụng xu:</span>
                                                <span className="font-bold">-{formatCurrency(previewData.walletDiscount)}</span>
                                            </div>
                                        ) : null}
                                        <div className="flex justify-between pt-1 border-t border-border/50 text-base">
                                            <span className="font-bold text-foreground">Tổng thanh toán:</span>
                                            <span className="font-black text-primary">{formatCurrency(previewData?.grandTotal ?? selectedTier?.tier.price ?? 0)}</span>
                                        </div>
                                    </div>
                                    <br />
                                    Bạn có đồng ý tiến hành kích hoạt gói mới ngay bây giờ không?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4 flex-col sm:flex-row gap-3">
                        <AlertDialogCancel className="rounded-xl font-bold border-none bg-muted text-muted-foreground hover:bg-muted/80 h-10 sm:flex-1">
                            Hủy bỏ
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                processSubscription()
                            }}
                            className="rounded-xl font-bold bg-primary hover:bg-primary/90 h-10 sm:flex-1"
                        >
                            Đồng ý nâng cấp
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
