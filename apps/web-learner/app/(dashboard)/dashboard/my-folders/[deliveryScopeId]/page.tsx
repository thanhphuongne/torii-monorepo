'use client'

import { useParams, useRouter } from 'next/navigation'
import { AcademyFolderTree } from '@/components/courses/academy-folder-tree'
import { FolderOpen, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'

export default function MyFolderClassPage() {
    const params = useParams<{ deliveryScopeId: string }>()
    const router = useRouter()
    const deliveryScopeId = typeof params?.deliveryScopeId === 'string' ? params.deliveryScopeId : ''

    if (!deliveryScopeId) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 text-muted-foreground"
                    onClick={() => router.push('/dashboard/my-folders')}
                >
                    <ArrowLeft className="mr-1.5 size-4" />
                    Thư mục của tôi
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                        <FolderOpen className="size-8 text-muted-foreground" />
                        <p className="text-sm font-medium">Đường dẫn không hợp lệ</p>
                        <p className="max-w-sm text-xs text-muted-foreground">
                            Vui lòng quay lại danh sách và chọn một lớp để xem tài liệu.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/dashboard/my-folders')}>
                            Về danh sách
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 md:space-y-8">
            <div className="space-y-4 border-b border-border pb-6 md:pb-8">
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 text-muted-foreground"
                    onClick={() => router.push('/dashboard/my-folders')}
                >
                    <ArrowLeft className="mr-1.5 size-4" />
                    Thư mục của tôi
                </Button>
                <div className="space-y-1">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        <FolderOpen className="size-6 shrink-0 text-primary sm:size-7" />
                        Tài liệu lớp học
                    </h1>
                    <p className="max-w-xl text-sm text-muted-foreground">
                        Duyệt thư mục và tệp tin đính kèm theo cấu trúc cây.
                    </p>
                </div>
            </div>

            <AcademyFolderTree deliveryScopeId={deliveryScopeId} />
        </div>
    )
}
