import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { EnrollmentForm } from "@/components/academy/enrollment-form"

interface ClassEnrollmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  liveClassId?: string
  vodPackageId?: string
  submitting?: boolean
  onSubmit: (data: any) => Promise<void>
}

export function ClassEnrollmentSheet({
  open,
  onOpenChange,
  liveClassId,
  vodPackageId,
  submitting,
  onSubmit,
}: ClassEnrollmentSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[700px] max-h-screen p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-6 border-b shrink-0">
          <SheetTitle>Ghi danh học viên vào lớp/gói</SheetTitle>
          <SheetDescription>
            Chọn lớp/gói và học viên để tạo bản ghi danh thủ công. Thường dùng cho trường hợp đăng ký
            offline hoặc ưu đãi đặc biệt.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 p-6">
            <EnrollmentForm
              mode="create"
              defaultLiveClassId={liveClassId}
              defaultVodPackageId={vodPackageId}
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
              submitting={submitting}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}


