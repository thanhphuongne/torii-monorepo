'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAppSelector } from '@/hooks/hooks'
import { certificateApi } from '@/lib/api/services/certificate-api'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Award, Download, Share2, ShieldCheck, ArrowLeft, Check } from 'lucide-react'
import { formatDate } from '@/utils/format-utils'
import Link from 'next/link'
import { Skeleton } from '@workspace/ui/components/skeleton'
import type { CertificateResponseDTO } from '@workspace/schemas'
import { toast } from 'sonner'

export default function VerifyCertificatePage() {
    const { isAuthenticated } = useAppSelector((state) => state.auth)
    const params = useParams()
    const code = params.code as string
    const [cert, setCert] = useState<CertificateResponseDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const fetchCert = async () => {
            try {
                setLoading(true)
                const result = await certificateApi.verifyCertificate(code)
                if (result.valid && result.certificate) {
                    setCert(result.certificate)
                } else {
                    setError('Không tìm thấy chứng chỉ hoặc mã xác thực không hợp lệ.')
                }
            } catch (err) {
                console.error('Failed to verify certificate:', err)
                setError('Đã có lỗi xảy ra khi xác thực chứng chỉ.')
            } finally {
                setLoading(false)
            }
        }

        if (code) {
            fetchCert()
        }
    }, [code])

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        toast.success('Đã sao chép liên kết xác thực!')
        setTimeout(() => setCopied(false), 2000)
    }

    const downloadPdf = async () => {
        try {
            const blob = await certificateApi.downloadCertificatePdfByCode(code)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `certificate-${code}.pdf`
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 space-y-4">
                <Skeleton className="h-12 w-64 rounded-xl" />
                <Skeleton className="h-96 w-full max-w-lg rounded-xl" />
            </div>
        )
    }

    if (error || !cert) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 max-w-sm mx-auto text-center space-y-6">
                <div className="p-4 bg-red-50 rounded-full">
                    <Award className="size-12 text-red-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Xác thực thất bại</h2>
                    <p className="text-muted-foreground">{error || 'Chứng chỉ không tồn tại hoặc đã bị thu hồi.'}</p>
                </div>
                <Button asChild className="w-full">
                    <Link href={isAuthenticated ? "/dashboard/certificates" : "/"}>
                        Quay lại 
                    </Link>
                </Button>
            </div>
        )
    }

    const userName = (cert as any).user?.displayName || 'Thành viên Torii'
    const courseName = (cert as any).class?.name || (cert as any).vodPackage?.title || 'Khóa học tại Torii'
    const issueDate = formatDate(cert.issueDate)

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
            {/* Header Status */}
            <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">Xác thực chứng chỉ hoàn thành</h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Chứng chỉ này được cấp bởi Torii Academy và đã được xác thực chính thức trên hệ thống.
                </p>
            </div>

            {/* Certificate Card */}
            <Card className="overflow-hidden border-2 border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="bg-slate-900 p-6 text-white flex flex-col items-center justify-center relative overflow-hidden">
                    <Award className="size-16 text-amber-400 mb-4 z-10" />
                    <div className="text-center z-10">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Certificate of Completion</p>
                        <h2 className="text-xl font-black italic tracking-wide">Torii Academy Certificate</h2>
                    </div>
                    {/* Subtle decorative background elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full -ml-12 -mb-12" />
                </div>

                <CardContent className="p-8 space-y-8">
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Người nhận</span>
                            <p className="text-2xl font-bold text-foreground">{userName}</p>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nội dung khóa học</span>
                            <p className="text-lg font-semibold text-slate-800 leading-snug">
                                {courseName}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ngày cấp</span>
                                <p className="text-sm font-semibold">{issueDate}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mã xác thực</span>
                                <p className="text-sm font-mono font-medium text-slate-600 truncate">{cert.certificateCode}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-6">
                        <Button
                            onClick={downloadPdf}
                            className="w-full h-12 gap-2 text-base font-bold bg-[#2563EB] hover:bg-blue-700"
                        >
                            <Download className="size-5" />
                            Tải xuống bản in PDF
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={copyLink}
                            className="w-full h-12 gap-2 text-base font-bold"
                        >
                            {copied ? <Check className="size-5 text-emerald-600" /> : <Share2 className="size-5" />}
                            Chia sẻ chứng chỉ
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="text-center pt-8 border-t border-slate-100">
                <Link 
                    href={isAuthenticated ? "/dashboard/certificates" : "/"} 
                    className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-4" />
                    Quay lại trang chính
                </Link>
            </div>
        </div>
    )
}
