'use client'

import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { CheckCircle2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { orderApi, type OrderFulfillmentSummary } from '@/lib/api/services/order-api'
import { Spinner } from '@workspace/ui/components/spinner'

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams()
    const orderCode = searchParams.get('orderCode')
    const queryClient = useQueryClient()
    const [summary, setSummary] = useState<OrderFulfillmentSummary | null>(null)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!orderCode) return
        setLoading(true)
        orderApi
            .getOrderByCode(orderCode)
            .then((data) => {
                setSummary(data);
                queryClient.invalidateQueries({ queryKey: ['quota-status'] });
            })
            .catch((error: any) =>
                setErrorMessage(error?.response?.data?.message || error?.message || 'Không tải được trạng thái ghi danh'),
            )
            .finally(() => setLoading(false))
    }, [orderCode])

    return (
                <div className="container mx-auto flex items-center justify-center py-20">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Thanh toán thành công</CardTitle>
                    <CardDescription>
                        Cảm ơn bạn đã đăng ký khóa học tại Torii Academy.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(summary?.code || orderCode) && (
                        <div className="text-sm font-medium">
                            Mã đơn hàng: <span className="font-mono">{summary?.code || orderCode}</span>
                        </div>
                    )}
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Spinner className="h-4 w-4" />
                            Đang kiểm tra kết quả ghi danh...
                        </div>
                    ) : null}
                    {!loading && summary ? (
                        <div className="space-y-2 text-left text-sm">
                            {summary.items.map((item) => (
                                <div key={item.productId} className="rounded border p-2">
                                    <div className="font-semibold">{item.productName}</div>
                                    {item.missingLiveClassIds.length === 0 ? (
                                        <>
                                            {item.expectedLiveClassIds.length === 0 ? (
                                                <div className="text-emerald-600">
                                                    Kích hoạt thành công.
                                                </div>
                                            ) : (
                                                <div className="text-emerald-600">
                                                    Ghi danh thành công ({item.enrolledLiveClassIds.length}/{item.expectedLiveClassIds.length} lớp live).
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-amber-600">
                                            Một số lớp chưa ghi danh ({item.enrolledLiveClassIds.length}/{item.expectedLiveClassIds.length} lớp live). Vui lòng liên hệ hỗ trợ.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {!loading && !summary && !errorMessage ? (
                        <p className="text-sm text-muted-foreground">
                            Hệ thống đang kích hoạt khóa học cho bạn. Bạn có thể bắt đầu học ngay bây giờ.
                        </p>
                    ) : null}
                    {errorMessage ? (
                        <p className="text-sm text-amber-600">{errorMessage}</p>
                    ) : null}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                        <Link href="/dashboard/my-courses">Vào học ngay</Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/dashboard/payment">Lịch sử đơn hàng</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
