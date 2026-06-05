import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { RichTextRenderer } from "@/components/editor/rich-text-editor"
import { useAcademyLesson } from "@/lib/api/services/academy-lessons"

export function ViewLessonDialog({
  open,
  onOpenChange,
  lesson,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: any | null
}) {
  const { data: fetchedLesson, isLoading } = useAcademyLesson(lesson?.id)
  const lessonData = fetchedLesson ?? lesson

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[800px] flex flex-col h-full p-0 overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Chi tiết bài giảng</SheetTitle>
          <SheetDescription>Xem nội dung bài học ở chế độ chỉ đọc.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 w-full">
          <div className="space-y-6 p-6 w-full max-w-full min-w-0">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}

            {!isLoading && lessonData && (
              <>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">{lessonData.title}</h2>
                  <Badge variant="outline">{lessonData.type}</Badge>
                </div>

                {lessonData.type === "VIDEO" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Video URL</p>
                    {lessonData.videoUrl ? (
                      <div className="aspect-video w-full rounded-md overflow-hidden bg-black flex items-center justify-center">
                        {lessonData.videoUrl.includes("youtube.com") || lessonData.videoUrl.includes("youtu.be") ? (
                          <iframe
                            src={lessonData.videoUrl.includes("watch?v=") 
                              ? lessonData.videoUrl.replace("watch?v=", "embed/").split("&")[0]
                              : lessonData.videoUrl.replace("youtu.be/", "youtube.com/embed/")}
                            title="Video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        ) : (
                          <video 
                            src={lessonData.videoUrl} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Chưa có video
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2 w-full grid grid-cols-1">
                  <p className="text-sm font-medium">Nội dung (Markdown)</p>
                  <div className="w-full min-w-0">
                    <RichTextRenderer
                      content={lessonData.content}
                      className="rounded-md border p-4 w-full max-w-full overflow-x-auto"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

