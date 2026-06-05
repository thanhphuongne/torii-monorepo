"use client"

import { Image as ImageIcon } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@workspace/ui/components/hover-card"

interface ImagePreviewProps {
  url?: string
  fileName?: string
}

const ImagePreview = ({
  url = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=225&fit=crop",
  fileName = "hero-banner.jpg"
}: ImagePreviewProps) => (
  <HoverCard>
    <HoverCardTrigger asChild>
      <button
        type="button"
        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
      >
        <ImageIcon className="h-4 w-4" />
        <span>{fileName}</span>
      </button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80 shadow-xl border-2">
      <div className="space-y-3">
        <div className="aspect-video overflow-hidden rounded-md bg-muted border">
          <img
            alt="Preview"
            className="h-full w-full object-cover"
            height={400}
            src={url}
            width={400}
          />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-sm">{fileName}</h4>
          <p className="text-muted-foreground text-xs text-balance">
            Preview của hình ảnh được tải lên. Rê chuột để xem chi tiết.
          </p>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>
)

export default ImagePreview
