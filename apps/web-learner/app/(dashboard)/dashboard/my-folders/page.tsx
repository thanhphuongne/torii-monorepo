'use client'

import { useAcademyFolders } from '@/lib/api/services/academy-resource-api'
import { dataTableHeaderClass } from '@/lib/ui-shell'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@workspace/ui/components/table'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Folder, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent } from '@workspace/ui/components/card'

export default function MyFoldersPage() {
    const router = useRouter()
    const { data: allFolders, isLoading } = useAcademyFolders()

    const classesWithFolders = allFolders?.reduce((acc, folder) => {
        const scopeKey = folder.liveClass?.id || folder.vodPackage?.id || 'other'
        if (!acc[scopeKey]) {
            acc[scopeKey] = {
                id: scopeKey,
                className: folder.liveClass?.name || folder.vodPackage?.title || 'Tài liệu khác',
                classCode: folder.liveClass?.code || folder.vodPackage?.code || '',
                foldersCount: 0,
            }
        }
        acc[scopeKey].foldersCount += 1
        return acc
    }, {} as Record<string, { id: string; className: string; classCode: string; foldersCount: number }>)

    const classList = Object.values(classesWithFolders || {})

    return (
        <div className="space-y-6 animate-in fade-in duration-500 md:space-y-8">
            <div className="space-y-4 border-b border-border pb-6 md:pb-8">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    <Folder className="size-6 shrink-0 text-primary sm:size-7" />
                    Thư mục của tôi
                </h1>
                <p className="max-w-xl text-sm font-medium text-muted-foreground">
                    Quản lý và truy cập tài liệu học tập theo từng lớp.
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-2 rounded-md border">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
                            <Skeleton className="h-4 flex-1 max-w-md" />
                            <Skeleton className="h-4 w-24 hidden sm:block" />
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                    ))}
                </div>
            ) : classList.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                    <Table>
                        <TableHeader className={dataTableHeaderClass}>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[60px] text-center">STT</TableHead>
                                <TableHead className="min-w-[200px] pl-4">Lớp học</TableHead>
                                <TableHead className="hidden w-[140px] sm:table-cell">Mã lớp</TableHead>
                                <TableHead className="w-[120px] text-right">Thư mục</TableHead>
                                <TableHead className="w-[100px] pr-4 text-right">
                                    <span className="sr-only">Thao tác</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classList.map((cls, index) => (
                                <TableRow key={cls.id}>
                                    <TableCell className="text-center tabular-nums font-medium text-muted-foreground/60 text-xs">
                                        {String(index + 1).padStart(2, '0')}
                                    </TableCell>
                                    <TableCell className="pl-4 font-medium">{cls.className}</TableCell>
                                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                                        {cls.classCode || '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary" className="font-normal tabular-nums">
                                            {cls.foldersCount}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="pr-4 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-primary/40 text-primary hover:bg-primary/5 font-medium"
                                            onClick={() =>
                                                router.push(
                                                    `/dashboard/my-folders/${encodeURIComponent(cls.id)}`
                                                )
                                            }
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                        <FileText className="size-8 text-muted-foreground" />
                        <p className="text-sm font-medium">Chưa có tài liệu nào</p>
                        <p className="max-w-sm text-xs text-muted-foreground">
                            Tài liệu lớp học sẽ xuất hiện tại đây khi được gán cho bạn.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
