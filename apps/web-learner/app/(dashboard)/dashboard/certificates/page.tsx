'use client'

import { Card, CardContent } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from '@workspace/ui/components/item'
import { Award, Download, Share2 } from 'lucide-react'
import { formatDate } from '@/utils/format-utils'
import Link from 'next/link'
import { certificateApi, useCertificates } from '@/lib/api/services/certificate-api'
import { Skeleton } from '@workspace/ui/components/skeleton'
import type { CertificateResponseDTO } from '@workspace/schemas'
import { toast } from 'sonner'


export default function CertificatesPage() {
    const { data: response, isLoading } = useCertificates({ limit: '50' })
    const certificates = response?.data || []

    const handleShare = (cert: CertificateResponseDTO) => {
        const verifyUrl = `${window.location.origin}/verify/${cert.certificateCode}`
        const title = (cert as any)?.class?.name ?? 'Torii Academy'
        if (navigator.share) {
            navigator.share({
                title: 'Chứng chỉ Torii Nihongo',
                text: `Tôi đã hoàn thành khóa học ${title} tại Torii Nihongo!`,
                url: verifyUrl,
            }).catch(console.error)
        } else {
            navigator.clipboard.writeText(verifyUrl)
            toast.success('Đã sao chép link xác thực!')
        }
    }

    const handleDownloadPdf = async (cert: CertificateResponseDTO) => {
        try {
            const blob = await certificateApi.downloadCertificatePdfById(cert.id)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `certificate-${cert.certificateCode}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.success('Đang tải PDF chứng chỉ...')
        } catch (err) {
            console.error('Failed to download certificate PDF:', err)
            toast.error('Không thể tải PDF chứng chỉ. Vui lòng thử lại.')
        }
    }

    return (
        <div className="space-y-6 pb-8">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Chứng chỉ của tôi</h1>
                <p className="text-sm text-muted-foreground">
                    Minh chứng cho sự nỗ lực và quá trình học tập của bạn.
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-md" />
                    ))}
                </div>
            ) : certificates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center space-y-2">
                        <Award className="mx-auto size-6 text-muted-foreground" />
                        <p className="text-sm">Chưa có chứng chỉ nào</p>
                        <p className="text-sm text-muted-foreground">
                            Hoàn thành khóa học để nhận chứng chỉ của bạn.
                        </p>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/dashboard/my-courses">Bắt đầu học</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {certificates.map((cert: CertificateResponseDTO) => {
                        const certClass = (cert as any)?.class as { code?: string; name?: string } | undefined
                        const certName = certClass?.name || 'Chứng chỉ hoàn thành'
                        const certCode = cert.certificateCode

                        return (
                            <Item key={cert.id} variant="outline">
                                <ItemMedia>
                                    <Award className="size-5 text-primary" />
                                </ItemMedia>
                                <ItemContent>
                                    <ItemTitle>{certName}</ItemTitle>
                                    <ItemDescription>
                                        <span className="mr-2">Mã: {certCode.slice(0, 12)}</span>
                                        <span>• {formatDate(cert.issueDate)}</span>
                                    </ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <Badge variant="secondary">Chính thức</Badge>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadPdf(cert)}
                                    >
                                        <Download className="size-4" />
                                        PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleShare(cert)}
                                    >
                                        <Share2 className="size-4" />
                                        Chia sẻ
                                    </Button>
                                    <Button asChild size="sm">
                                        <Link href={`/verify/${cert.certificateCode}`} target="_blank">
                                            Xác thực
                                        </Link>
                                    </Button>
                                </ItemActions>
                            </Item>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
