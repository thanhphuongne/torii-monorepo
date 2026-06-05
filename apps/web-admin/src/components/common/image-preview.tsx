import { Image as ImageIcon, ExternalLink } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@workspace/ui/components/hover-card"
import { Button } from "@workspace/ui/components/button"

interface ImagePreviewProps {
    url: string
    fileName?: string
}

export function ImagePreview({ url, fileName }: ImagePreviewProps) {
    // Extract filename from URL if not provided
    const displayFileName = fileName || url.split('/').pop() || "image.png"

    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-accent cursor-default transition-colors w-full group">
                    <div className="flex size-8 items-center justify-center rounded bg-muted shrink-0 group-hover:bg-background">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{displayFileName}</span>
                        <span className="text-xs text-muted-foreground truncate italic">Ảnh preview (Rê chuột để xem)</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                    >
                        <a href={url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 shadow-xl border-2" side="top" align="start">
                <div className="space-y-3">
                    <div className="aspect-video overflow-hidden rounded-md bg-muted border">
                        <img
                            alt="Xem trước"
                            className="h-full w-full object-cover"
                            src={url}
                        />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-semibold text-sm truncate">{displayFileName}</h4>
                        <p className="text-muted-foreground text-xs">Ảnh định dạng WebP/PNG/JPG</p>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}
