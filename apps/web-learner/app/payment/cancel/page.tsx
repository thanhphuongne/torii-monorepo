'use client'

import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { XCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function PaymentCancelPage() {
    const searchParams = useSearchParams()
    const orderCode = searchParams.get('orderCode')

    return (
        <div className="container flex items-center justify-center py-20">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <XCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl">Thanh toán thất bại</CardTitle>
                    <CardDescription>
                        Thanh toán của bạn đã bị hủy hoặc không thể hoàn tất.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {orderCode && (
                        <div className="text-sm font-medium">
                            Mã đơn hàng: <span className="font-mono">{orderCode}</span>
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                        Tiền của bạn chưa bị trừ. Vui lòng kiểm tra lại phương thức thanh toán hoặc thử lại sau.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                        <Link href="/dashboard/available-courses">Quay lại khóa học</Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                        <Link href="/">Về trang chủ</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
