'use client'

import { useState } from 'react'
import {
    FileIcon,
    ExternalLink,
    Download,
    FileText,
    FileArchive,
    FileImage,
    Globe,
    Folder,
    ArrowLeft,
    ChevronRight,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Spinner } from '@workspace/ui/components/spinner'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useAcademyFolders, useAcademyResources } from '@/lib/api/services/academy-resource-api'

interface AcademyResourceListProps {
    deliveryScopeId: string
    className?: string
}

function fileIcon(resource: { resourceType: string; title: string }) {
    const type = resource.resourceType
    const title = resource.title.toLowerCase()
    const cls = 'size-4 text-muted-foreground shrink-0'

    if (type === 'LINK') return <Globe className={cls} />
    if (title.endsWith('.pdf')) return <FileText className={cls} />
    if (title.endsWith('.zip') || title.endsWith('.rar')) return <FileArchive className={cls} />
    if (title.endsWith('.jpg') || title.endsWith('.png') || title.endsWith('.jpeg')) return <FileImage className={cls} />
    if (title.endsWith('.doc') || title.endsWith('.docx')) return <FileIcon className={cls} />
    if (title.endsWith('.xls') || title.endsWith('.xlsx')) return <FileIcon className={cls} />

    return <FileIcon className={cls} />
}

export function AcademyResourceList({ deliveryScopeId, className }: AcademyResourceListProps) {
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)

    const { data: folders, isLoading: isLoadingFolders } = useAcademyFolders(deliveryScopeId)
    const { data: resources, isLoading: isLoadingResources } = useAcademyResources(activeFolderId || undefined)

    const activeFolder = folders?.find((f) => f.folderId === activeFolderId)

    const initialLoading = isLoadingFolders && !folders

    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Spinner className="size-8 text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải tài liệu…</p>
            </div>
        )
    }

    const handleOpenResource = (resource: { downloadUrl?: string; externalUrl?: string }) => {
        const url = resource.downloadUrl || resource.externalUrl
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className={className ? className : 'space-y-6'}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    {activeFolderId ? (
                        <Button variant="outline" size="icon" onClick={() => setActiveFolderId(null)} aria-label="Quay lại danh sách thư mục">
                            <ArrowLeft className="size-4" />
                        </Button>
                    ) : null}
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                            {activeFolder ? activeFolder.folderName : 'Thư mục tài liệu'}
                        </p>
                        {activeFolderId ? (
                            <p className="text-sm text-muted-foreground">
                                {resources?.length ?? 0} tệp
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Chọn thư mục để xem tài liệu.</p>
                        )}
                    </div>
                </div>

            </div>

            {!activeFolderId ? (
                folders && folders.length > 0 ? (
                    <div className="space-y-2">
                        {folders.map((f) => (
                            <Card
                                key={f.folderId}
                                className="cursor-pointer transition-colors hover:bg-muted/50"
                                onClick={() => setActiveFolderId(f.folderId)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-9 rounded-lg border bg-muted/20 flex items-center justify-center">
                                            <Folder className="size-4 shrink-0 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <CardTitle className="text-sm leading-snug truncate">{f.folderName}</CardTitle>
                                            <CardDescription className="text-xs">
                                                {f.resourceCount ?? 0} tài liệu
                                            </CardDescription>
                                        </div>
                                        <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                            <Folder className="size-10 text-muted-foreground/50" />
                            <p className="text-sm font-medium">Chưa có thư mục</p>
                            <p className="text-sm text-muted-foreground">Lớp chưa chia sẻ thư mục tài liệu.</p>
                        </CardContent>
                    </Card>
                )
            ) : isLoadingResources ? (
                <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : resources && resources.length > 0 ? (
                <div className="space-y-2">
                    {resources.map((resource) => (
                        <Card
                            key={resource.id}
                            className="cursor-pointer hover:bg-muted/40 transition-colors"
                            onClick={() => handleOpenResource(resource)}
                        >
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-start gap-3">
                                    <div className="size-8 rounded-md border bg-muted/20 flex items-center justify-center shrink-0">
                                        {fileIcon(resource)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{resource.title}</p>
                                        {resource.description ? (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{resource.description}</p>
                                        ) : null}
                                        <p className="text-[11px] text-muted-foreground mt-1.5">
                                            {resource.resourceType === 'LINK' ? 'Liên kết ngoài' : 'Tệp đính kèm'}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleOpenResource(resource)
                                        }}
                                    >
                                        {resource.resourceType === 'LINK' ? (
                                            <>
                                                <ExternalLink className="size-4" />
                                                <span className="sr-only">Mở liên kết</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="size-4" />
                                                <span className="sr-only">Tải xuống</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                        <FileText className="size-10 text-muted-foreground/50" />
                        <p className="text-sm font-medium">Thư mục trống</p>
                        <p className="text-sm text-muted-foreground">Chưa có tài liệu trong thư mục này.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
