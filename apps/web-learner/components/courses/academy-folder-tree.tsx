"use client"

import * as React from "react"
import {
    Folder,
    FileText,
    ChevronRight,
    ChevronDown,
    Download,
    ExternalLink,
    Globe,
    FileArchive,
    FileImage,
    Loader2,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { useAcademyFolders, useAcademyResources } from "@/lib/api/services/academy-resource-api"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

interface AcademyFolderTreeProps {
    deliveryScopeId: string
}

export function AcademyFolderTree({ deliveryScopeId }: AcademyFolderTreeProps) {
    const { data: folders, isLoading: isLoadingFolders } = useAcademyFolders(deliveryScopeId)
    const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({})

    const toggleFolder = (folderId: string) => {
        setExpandedFolders((prev) => ({
            ...prev,
            [folderId]: !prev[folderId],
        }))
    }

    return (
        <Card className="overflow-hidden shadow-none">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-base font-semibold">Danh mục tài liệu</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Chạm vào thư mục để mở và xem tệp hoặc liên kết.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[min(70vh,720px)]">
                    <div className="space-y-0.5 p-3 sm:p-4">
                        {isLoadingFolders ? (
                            <div className="flex flex-col gap-2 py-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="h-9 w-full animate-pulse rounded-md bg-muted/60" />
                                ))}
                            </div>
                        ) : folders && folders.length > 0 ? (
                            folders.map((folder) => (
                                <FolderNode
                                    key={folder.folderId}
                                    folder={folder}
                                    isExpanded={!!expandedFolders[folder.folderId]}
                                    onToggle={() => toggleFolder(folder.folderId)}
                                />
                            ))
                        ) : (
                            <p className="py-8 text-center text-sm text-muted-foreground">Không có thư mục nào trong lớp này.</p>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

function FolderNode({
    folder,
    isExpanded,
    onToggle,
}: {
    folder: {
        folderId: string
        folderName: string
        resourceCount?: number
    }
    isExpanded: boolean
    onToggle: () => void
}) {
    const { data: resources, isLoading } = useAcademyResources(isExpanded ? folder.folderId : undefined)

    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    isExpanded
                        ? "bg-muted/80 text-foreground"
                        : "text-foreground hover:bg-muted/50"
                )}
            >
                {isExpanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                <Folder className={cn("size-4 shrink-0", isExpanded ? "text-primary" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1 truncate font-medium">{folder.folderName}</span>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {folder.resourceCount ?? 0}
                </span>
            </button>

            {isExpanded && (
                <div className="ml-6 space-y-1 border-l border-border pl-3 sm:ml-8 sm:pl-4">
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            Đang tải…
                        </div>
                    ) : resources && resources.length > 0 ? (
                        resources.map((resource: { id: string; title: string; resourceType: string; description?: string; downloadUrl?: string; externalUrl?: string }) => (
                            <ResourceNode key={resource.id} resource={resource} />
                        ))
                    ) : (
                        <p className="py-2 text-xs text-muted-foreground">Thư mục trống.</p>
                    )}
                </div>
            )}
        </div>
    )
}

function ResourceNode({
    resource,
}: {
    resource: {
        title: string
        resourceType: string
        description?: string
        downloadUrl?: string
        externalUrl?: string
    }
}) {
    const handleOpen = () => {
        const url = resource.downloadUrl || resource.externalUrl
        if (url) {
            window.open(url, "_blank", "noopener,noreferrer")
        }
    }

    const getFileIcon = () => {
        const type = resource.resourceType
        const title = resource.title.toLowerCase()
        if (type === "LINK") return <Globe className="size-4 text-blue-600 dark:text-blue-400" />
        if (title.endsWith(".pdf")) return <FileText className="size-4 text-red-600 dark:text-red-400" />
        if (title.endsWith(".zip") || title.endsWith(".rar")) {
            return <FileArchive className="size-4 text-orange-600 dark:text-orange-400" />
        }
        if (title.endsWith(".jpg") || title.endsWith(".png") || title.endsWith(".jpeg")) {
            return <FileImage className="size-4 text-emerald-600 dark:text-emerald-400" />
        }
        return <FileText className="size-4 text-muted-foreground" />
    }

    const isLink = resource.resourceType === "LINK"

    return (
        <div className="flex items-center gap-2 rounded-md border border-transparent py-1.5 pl-1 pr-1 transition-colors hover:bg-muted/40 hover:border-border/50 sm:gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/60">{getFileIcon()}</div>
            <button
                type="button"
                onClick={handleOpen}
                className="min-w-0 flex-1 text-left text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                <span className="line-clamp-2">{resource.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-normal text-muted-foreground">
                    <span>{isLink ? "Liên kết" : "Tệp tin"}</span>
                    {resource.description && (
                        <span className="line-clamp-1 max-w-[200px] sm:max-w-xs">· {resource.description}</span>
                    )}
                </span>
            </button>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                aria-label={isLink ? "Mở liên kết" : "Tải hoặc mở tệp"}
                onClick={handleOpen}
            >
                {isLink ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
            </Button>
        </div>
    )
}
