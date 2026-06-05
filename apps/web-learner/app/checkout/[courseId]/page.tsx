'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAppSelector } from '@/hooks/hooks'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Switch } from '@workspace/ui/components/switch'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import { Textarea } from '@workspace/ui/components/textarea'
import { Separator } from '@workspace/ui/components/separator'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"
import { formatNumber } from '@/utils/format-utils'
import { ShieldCheck, ArrowLeft, CheckCircle2, Gift, TicketPercent, BookOpen, Users, Clock, Coins } from 'lucide-react'
import { toast } from '@workspace/ui/components/sonner'
import { useAcademyProduct } from '@/lib/api/services/academy-course-api'
import { academyEnrollmentApi as enrollmentApi } from '@/lib/api/services/academy-enrollment-api'
import { PaymentMethod } from '@workspace/schemas'
import { PageLoading } from '@workspace/ui/components/page-loading'
import { orderApi, OrderPreviewResponse } from '@/lib/api/services/order-api'
import Image from 'next/image'
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@workspace/ui/components/field"
import {
    Item,
    ItemContent,
    ItemMedia,
    ItemTitle,
    ItemGroup,
} from "@workspace/ui/components/item"

function isLiveClassFull(cls: { liveEnrollment?: { isFull?: boolean } } | null | undefined): boolean {
    return !!cls?.liveEnrollment?.isFull
}

function liveCapacityLabel(cls: any): string | null {
    if (!cls) return null
    const le = cls.liveEnrollment
    const count = le?.activeEnrollmentCount ?? cls._count?.enrollments ?? 0

    // For VOD or classes without max students
    const max = le?.maxStudents ?? cls.maxStudents
    if (max == null) return `${formatNumber(count)} học viên`

    return `${count}/${max} học viên`
}

export default function CheckoutPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const rawCourseId = params.courseId as string
    const courseId = rawCourseId && rawCourseId !== 'undefined' ? rawCourseId : undefined
    const user = useAppSelector((state) => state.auth.user)
    const type = (searchParams.get('type') as 'LIVE' | 'VOD') || 'LIVE'

    const { data: product, isLoading: isLoadingProduct } = useAcademyProduct(courseId, type)
    const [isProcessing, setIsProcessing] = useState(false)
    const isLIVE = product?.type === 'LIVE'

    // Selection state
    const [selectedLiveClassId, setSelectedLiveClassId] = useState<string | null>(null)

    const selectedClass = (product?.classes || []).find((c: any) => c.id === selectedLiveClassId) || product?.class || null
    // Determine class and lesson counts for both LIVE and VOD products
    const classCount = isLIVE ? (product?.classes?.length ?? (selectedClass ? 1 : 0)) : 1
    const lessonCount = isLIVE
        ? (Array.isArray(selectedClass?.curriculum?.chapters)
            ? selectedClass?.curriculum?.chapters?.reduce((acc: number, chapter: any) => {
                const chapterItems = Array.isArray(chapter?.items) ? chapter.items : []
                return acc + chapterItems.length
              }, 0)
            : 0)
        : (product?.courseProfile?.modules?.reduce((acc: number, mod: any) => {
            const lessons = Array.isArray(mod?.lessons) ? mod.lessons : []
            return acc + lessons.length
          }, 0) ?? 0)

    // Gift State
    const giftForced = searchParams.get('gift') === 'true'
    const [isGift, setIsGift] = useState(giftForced)
    const [recipientEmail, setRecipientEmail] = useState('')
    const [giftMessage, setGiftMessage] = useState('')

    // Preview State
    const [couponInput, setCouponInput] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState('')
    const [preview, setPreview] = useState<OrderPreviewResponse | null>(null)
    const [isPreviewing, setIsPreviewing] = useState(false)

    // UI/Dialog State
    const [recipientStatus, setRecipientStatus] = useState<'idle' | 'checking' | 'enrolled' | 'not_found' | 'available'>('idle')
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)

    // Preselect từ URL (?liveClassId=) khi vào từ catalog / chi tiết lớp
    useEffect(() => {
        const fromQuery = searchParams.get('liveClassId')
        if (!fromQuery || !product || product.type !== 'LIVE') return
        const inList = (product.classes || []).some((c: { id: string }) => c.id === fromQuery)
        if (inList) setSelectedLiveClassId(fromQuery)
    }, [searchParams, product])

    // If gift is forced from URL, lock the toggle on
    useEffect(() => {
        if (giftForced) {
            setIsGift(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [giftForced])

    // LIVE: chọn mặc định từ defaultLiveClassId hoặc lớp đơn (siblingClasses)
    useEffect(() => {
        if (!product || selectedLiveClassId) return
        const defaultId = (product as { defaultLiveClassId?: string | null }).defaultLiveClassId
        if (defaultId) {
            const c =
                (product.classes || []).find((x: { id: string }) => x.id === defaultId) ??
                product.class
            if (c && !isLiveClassFull(c)) {
                setSelectedLiveClassId(defaultId)
            }
            return
        }
        if (
            product.type === 'LIVE' &&
            Array.isArray(product.classes) &&
            product.classes.length === 1
        ) {
            const c = product.classes[0]
            if (!isLiveClassFull(c)) {
                setSelectedLiveClassId(c.id)
            }
        }
    }, [product, selectedLiveClassId])

    // Debounced Recipient Check
    useEffect(() => {
        if (!courseId) return
        if (!isGift || !recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
            setRecipientStatus('idle')
            return
        }

        const checkRecipient = async () => {
            try {
                setRecipientStatus('checking')
                const result = await enrollmentApi.checkGiftRecipient(recipientEmail, courseId)
                if (result.isEnrolled) setRecipientStatus('enrolled')
                else if (!result.isRegistered) setRecipientStatus('not_found')
                else setRecipientStatus('available')
            } catch (error) {
                setRecipientStatus('idle')
            }
        }

        const timer = setTimeout(checkRecipient, 600)
        return () => clearTimeout(timer)
    }, [isGift, recipientEmail, courseId])

    useEffect(() => {
        if (product?.id) {
            handlePreview()
        }
    }, [product?.id, appliedCoupon, selectedLiveClassId, isGift])

    const handlePreview = async () => {
        if (!product?.id) return
        if (product.type === 'LIVE') {
            if (!selectedLiveClassId) {
                setPreview(null)
                return
            }
            const picked = (product.classes || []).find((x: { id: string }) => x.id === selectedLiveClassId)
            if (picked && isLiveClassFull(picked)) {
                setPreview(null)
                return
            }
        }
        try {
            setIsPreviewing(true)
            const isLiveProduct = product.type === 'LIVE'
            const checkoutPayload = isLiveProduct
                ? {
                    cohortIds: [product.id],
                    liveClassIds: selectedLiveClassId ? [selectedLiveClassId] : undefined,
                    liveClassIdByCohort: selectedLiveClassId ? { [product.id]: selectedLiveClassId } : undefined,
                }
                : {
                    vodPackageIds: [product.id],
                }
            const result = await orderApi.previewOrder({
                ...checkoutPayload,
                couponCode: appliedCoupon.trim() || undefined,
                isGift,
                recipientEmail: isGift && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) ? recipientEmail : undefined,
            })
            setPreview(result)
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string }
            const msg =
                err?.response?.data?.message ??
                err?.message ??
                'Không thể tính tạm tính đơn hàng.'
            toast.error(msg)
            setPreview(null)
        } finally {
            setIsPreviewing(false)
        }
    }

    const handlePayment = async (method: PaymentMethod = PaymentMethod.PAYOS) => {
        if (!product || !user) return

        if (isGift) {
            if (!recipientEmail) return toast.error('Vui lòng nhập email người nhận')
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return toast.error('Email người nhận không hợp lệ')
            if (recipientStatus === 'enrolled') return toast.error('Người nhận đã sở hữu khóa học này')
            if (recipientStatus === 'not_found') return toast.error('Email người nhận chưa đăng ký trong hệ thống')
            if (recipientStatus === 'checking') return toast.error('Đang kiểm tra email người nhận, vui lòng đợi…')
            if (recipientEmail === user.email) return toast.error('Bạn không thể tự mua tặng chính mình')
        }

        if (isLIVE && !selectedLiveClassId) {
            toast.error('Vui lòng chọn một lớp học để tham gia.')
            return
        }
        if (isLIVE && selectedClass && isLiveClassFull(selectedClass)) {
            toast.error('Lớp đã đầy. Vui lòng chọn lớp khác hoặc kỳ sau quay lại.')
            return
        }

        try {
            setIsProcessing(true)
            const isLiveProduct = product.type === 'LIVE'
            const checkoutPayload = isLiveProduct
                ? {
                    cohortIds: [product.id],
                    liveClassIds: selectedLiveClassId ? [selectedLiveClassId] : undefined,
                    liveClassIdByCohort: selectedLiveClassId ? { [product.id]: selectedLiveClassId } : undefined,
                }
                : {
                    vodPackageIds: [product.id],
                }
            const result = await orderApi.createOrder({
                ...checkoutPayload,
                paymentMethod: method,
                couponCode: appliedCoupon.trim() || undefined,
                isGift,
                recipientEmail: isGift ? recipientEmail : undefined,
                giftMessage: isGift ? giftMessage : undefined,
            })

            if (result.paymentUrl) {
                window.location.href = result.paymentUrl
            } else {
                toast.success('Thanh toán thành công!')
                setShowSuccessDialog(true)
            }
        } catch (error: any) {
            const backendMessage = error?.response?.data?.message || error?.message
            const friendlyMessage =
                typeof backendMessage === 'string' &&
                (
                    backendMessage.includes('Đơn hàng không còn hợp lệ') ||
                    backendMessage.includes('Coupon') ||
                    backendMessage.includes('mã giảm giá')
                )
                    ? `${backendMessage}. Vui lòng tạo đơn mới để tiếp tục thanh toán.`
                    : (backendMessage || 'Giao dịch thất bại')
            toast.error(friendlyMessage)
        } finally {
            setIsProcessing(false)
        }
    }

    if (isLoadingProduct) return <PageLoading />
    if (!courseId || !product) return null

    const displaySubtotal = preview?.subTotal ?? preview?.subtotal ?? Number(product.price ?? 0)
    const displayTotal = preview?.grandTotal ?? preview?.total ?? displaySubtotal

    return (
        <div className="pb-10">
            <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link
                        href={
                            searchParams.get('liveClassId')
                                ? `/dashboard/available-courses/class/${searchParams.get('liveClassId')}`
                                : '/dashboard/available-courses'
                        }
                    >
                        <ArrowLeft className="mr-2 size-4" />
                        Quay lại trang khóa học
                    </Link>
                </Button>

                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Thanh toán</h1>
                    <p className="text-sm text-muted-foreground">Hoàn tất đơn hàng để bắt đầu hành trình học tập.</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Thông tin khóa học</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-5">
                                    <div className="relative w-full overflow-hidden rounded-xl border bg-muted">
                                        <div className="relative h-40 w-full sm:h-48 md:h-56">
                                            <Image
                                                src={
                                                    selectedClass?.thumbnailUrl ||
                                                    product.thumbnailUrl ||
                                                    selectedClass?.courseProfile?.thumbnailUrl ||
                                                    '/default-thumbnail.jpg'
                                                }
                                                alt={product.learnerDisplayTitle || product.name}
                                                fill
                                                className="object-cover"
                                                priority
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">
                                                {product.jlptLevel || selectedClass?.courseProfile?.level || 'N/A'}
                                            </Badge>
                                            {isLIVE ? (
                                                <Badge variant="outline">Trực tiếp</Badge>
                                            ) : (
                                                <Badge variant="outline">Tự học</Badge>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-xl font-semibold tracking-tight">
                                                {selectedClass?.name || product.learnerDisplayTitle || product.name}
                                            </h3>
                                            {product.liveContextLine && (
                                                <p className="text-sm text-muted-foreground">
                                                    {product.liveContextLine}
                                                </p>
                                            )}
                                            {product.learnerMarketingSubtitle && (
                                                <p className="text-sm text-muted-foreground">
                                                    {product.learnerMarketingSubtitle}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            <Item size="sm" className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-none">
                                                <ItemMedia variant="icon"><Users /></ItemMedia>
                                                <ItemContent>
                                                    <ItemTitle>{formatNumber(classCount)} lớp</ItemTitle>
                                                </ItemContent>
                                            </Item>
                                            <Item size="sm" className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-none">
                                                <ItemMedia variant="icon"><BookOpen /></ItemMedia>
                                                <ItemContent>
                                                    <ItemTitle>{formatNumber(lessonCount)} bài học</ItemTitle>
                                                </ItemContent>
                                            </Item>
                                            <Item size="sm" className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-none">
                                                <ItemMedia variant="icon"><Users /></ItemMedia>
                                                <ItemContent>
                                                    <ItemTitle className="text-sm">
                                                        {liveCapacityLabel(selectedClass || product) || '0 học viên'}
                                                    </ItemTitle>
                                                </ItemContent>
                                            </Item>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {isLIVE && product.classes && product.classes.length === 1 && isLiveClassFull(product.classes[0]) && (
                            <Card className="border-destructive/50">
                                <CardContent className="pt-6 text-sm text-destructive">
                                    Lớp trực tiếp hiện tại đã đủ học viên. Bạn chưa thể thanh toán cho đến khi có chỗ trống.
                                </CardContent>
                            </Card>
                        )}



                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Gift className="h-5 w-5 text-primary" />
                                        Mua làm quà tặng
                                    </CardTitle>
                                    <Switch
                                        checked={isGift}
                                        onCheckedChange={setIsGift}
                                        disabled={giftForced}
                                    />
                                </div>
                            </CardHeader>
                            {isGift && (
                                <CardContent className="space-y-4 pt-0">
                                    <FieldGroup>
                                        <Field>
                                            <FieldLabel>Email người nhận</FieldLabel>
                                            <Input placeholder="email@vi-du.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
                                            {recipientStatus === 'checking' && <FieldDescription>Đang kiểm tra...</FieldDescription>}
                                            {recipientStatus === 'enrolled' && <FieldDescription className="text-destructive">Người nhận đã sở hữu khóa học này.</FieldDescription>}
                                            {recipientStatus === 'not_found' && <FieldDescription className="text-destructive">Email này chưa đăng ký tài khoản trong hệ thống.</FieldDescription>}
                                        </Field>
                                        <Field>
                                            <FieldLabel>Lời nhắn (tùy chọn)</FieldLabel>
                                            <Textarea placeholder="Chúc bạn học tốt!" value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
                                        </Field>
                                    </FieldGroup>
                                </CardContent>
                            )}
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Chi tiết đơn hàng</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tạm tính</span>
                                    <span>{formatNumber(displaySubtotal)} đ</span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <TicketPercent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-9"
                                                placeholder="Mã giảm giá"
                                                value={couponInput}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setCouponInput(val)
                                                    if (!val) setAppliedCoupon('')
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        setAppliedCoupon(couponInput)
                                                    }
                                                }}
                                            />
                                        </div>
                                        <Button
                                            variant="secondary"
                                            type="button"
                                            disabled={isPreviewing || !couponInput.trim() || couponInput === appliedCoupon}
                                            onClick={() => setAppliedCoupon(couponInput)}
                                        >
                                            Áp dụng
                                        </Button>
                                    </div>
                                    {appliedCoupon && !isPreviewing && !preview?.discount && (
                                        <p className="text-xs text-destructive">Mã giảm giá không hợp lệ hoặc đã hết hạn.</p>
                                    )}
                                    {preview?.discount ? (
                                        <div className="flex justify-between text-green-600 font-medium">
                                            <span>Giảm giá</span>
                                            <span>-{formatNumber(preview.discount)} đ</span>
                                        </div>
                                    ) : null}
                                </div>

                                <Separator />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Tổng cộng</span>
                                    <span className="text-primary">{formatNumber(displayTotal)} đ</span>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <Button
                                        className="w-full"
                                        onClick={() => handlePayment(PaymentMethod.PAYOS)}
                                        disabled={
                                            isProcessing ||
                                            isPreviewing ||
                                            (isGift && recipientStatus === 'enrolled') ||
                                            (isGift && recipientStatus === 'not_found') ||
                                            (isGift && recipientStatus === 'checking') ||
                                            (isLIVE && (!selectedClass || isLiveClassFull(selectedClass)))
                                        }
                                    >
                                        {isProcessing ? 'Đang xử lý...' : 'Thanh toán ngay'}
                                    </Button>

                                    {/* Coin Payment Option */}
                                    {user?.walletBalance !== undefined && user.walletBalance > 0 && (
                                        <Card>
                                            <CardContent className="pt-6 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <Coins className="size-5 text-amber-600" />
                                                    <div>
                                                        <p className="text-sm font-medium">Ví Xu Torii</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Bạn có {formatNumber(user.walletBalance)} xu
                                                        </p>
                                                    </div>
                                                </div>
                                                {user.walletBalance >= displayTotal && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handlePayment(PaymentMethod.COIN)}
                                                        disabled={isProcessing}
                                                    >
                                                        Thanh toán bằng xu
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 flex items-center gap-3">
                                <ShieldCheck className="size-5 text-primary shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                    Thanh toán an toàn và bảo mật qua hệ thống PayOS.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            Thanh toán thành công!
                        </DialogTitle>
                        <DialogDescription>
                            {isGift ? `Khóa học đã được gửi tặng tới ${recipientEmail}.` : 'Cảm ơn bạn đã tin tưởng Torii Academy.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => router.push(isGift ? '/dashboard/payment' : '/dashboard/my-courses')}>
                            {isGift ? 'Xem đơn hàng' : 'Vào học ngay'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
