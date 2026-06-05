import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertCircle, CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Calendar } from "@workspace/ui/components/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import {
  academyLiveScheduleRequestCreateDTOSchema,
  type AcademyLiveScheduleRequestCreateDTO,
  type AcademyLiveScheduleSessionModel,
} from "@workspace/schemas"

import {
  useCreateAcademyLiveScheduleRequest,
  usePreviewAcademyLiveSessionConflict,
} from "@/lib/api/services/academy-live-schedule-requests"
import { formatDate, formatDateTime } from "@/lib/format-utils"

interface ClassRescheduleRequestSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: AcademyLiveScheduleSessionModel
}

export function ClassRescheduleRequestSheet({
  open,
  onOpenChange,
  session,
}: ClassRescheduleRequestSheetProps) {
  const createRequest = useCreateAcademyLiveScheduleRequest()
  const previewConflict = usePreviewAcademyLiveSessionConflict()

  const form = useForm<AcademyLiveScheduleRequestCreateDTO>({
    resolver: zodResolver(
      academyLiveScheduleRequestCreateDTOSchema.refine((data) => {
        if (data.proposedStartTime && data.proposedEndTime) {
          return data.proposedStartTime < data.proposedEndTime;
        }
        return true;
      }, {
        message: "Giờ kết thúc phải sau giờ bắt đầu",
        path: ["proposedEndTime"],
      })
    ),
    defaultValues: {
      sessionId: session.id,
      proposedDate: new Date(session.sessionDate).toISOString().split("T")[0],
      proposedStartTime: session.startTime,
      proposedEndTime: session.endTime,
      reason: "",
    },
  })

  // Reset form when session changes to ensure sessionId and default values are up to date
  useEffect(() => {
    if (session) {
      form.reset({
        sessionId: session.id,
        proposedDate: new Date(session.sessionDate).toISOString().split("T")[0],
        proposedStartTime: session.startTime,
        proposedEndTime: session.endTime,
        reason: "",
      })
    }
  }, [session, form])

  const watchProposedDate = form.watch("proposedDate")
  const watchProposedStartTime = form.watch("proposedStartTime")
  const watchProposedEndTime = form.watch("proposedEndTime")
  const targetLiveClassId = session.liveClassId

  // Preview conflict when inputs change
  useEffect(() => {
    if (
      watchProposedDate &&
      watchProposedStartTime &&
      watchProposedEndTime
    ) {
      previewConflict.mutate({
        liveClassId: targetLiveClassId,
        excludeSessionId: session.id,
        sessionDate: watchProposedDate,
        startTime: watchProposedStartTime,
        endTime: watchProposedEndTime,
      })
    }
  }, [watchProposedDate, watchProposedStartTime, watchProposedEndTime, session.id, targetLiveClassId])

  const onSubmit = (data: AcademyLiveScheduleRequestCreateDTO) => {
    createRequest.mutate(data, {
      onSuccess: () => {
        toast.success("Yêu cầu đã được gửi.")
        onOpenChange(false)
        form.reset()
      },
      onError: (error: any) => {
        toast.error(error.userMessage || "Lỗi khi gửi yêu cầu")
      },
    })
  }

  const hasConflict = previewConflict.data?.hasConflict
  const proposedDateError = form.formState.errors.proposedDate?.message

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="!w-full sm:!max-w-[800px] flex flex-col h-full p-0 text-foreground">
        <SheetHeader className="p-6 border-b shrink-0">
          <SheetTitle>Yêu cầu dời lịch</SheetTitle>
          <SheetDescription>
            Gửi yêu cầu dời lịch học cho buổi học ngày{" "}
            {formatDate(session.sessionDate)}.
          </SheetDescription>
        </SheetHeader>

        <form 
          id="reschedule-form" 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="flex-1 flex flex-col min-h-0 bg-muted/5 overflow-hidden"
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 p-6">
              <FieldGroup>
                <FieldSet className="p-4 border rounded-xl bg-background shadow-sm border-primary/10">
                  <FieldLegend className="flex items-center gap-2 text-primary">
                    <CalendarIcon className="size-4" /> Cấu hình lịch học mới
                  </FieldLegend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div className="space-y-4">
                      <Field>
                          <FieldLabel>Ngày học mới</FieldLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start gap-2 bg-background font-normal",
                                  !watchProposedDate && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="size-4" />
                                {watchProposedDate
                                  ? format(new Date(watchProposedDate), "dd/MM/yyyy", { locale: vi })
                                  : "Chọn ngày (dd/MM/yyyy)"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={watchProposedDate ? new Date(watchProposedDate) : undefined}
                                onSelect={(date) => {
                                  if (!date) return
                                  // Lưu chuẩn yyyy-MM-dd theo schema để validate chính xác
                                  form.setValue("proposedDate", format(date, "yyyy-MM-dd"), {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true,
                                  })
                                }}
                                disabled={(date) => {
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  const d = new Date(date)
                                  d.setHours(0, 0, 0, 0)
                                  return d < today
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FieldDescription>
                            Định dạng hiển thị: <span className="font-mono">dd/MM/yyyy</span>
                            {proposedDateError ? (
                              <span className="block text-destructive">{proposedDateError}</span>
                            ) : null}
                          </FieldDescription>
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                          <Field>
                          <FieldLabel>Giờ bắt đầu</FieldLabel>
                          <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input type="time" className="pl-9 bg-background" {...form.register("proposedStartTime")} />
                          </div>
                          </Field>
                          <Field>
                          <FieldLabel>Giờ kết thúc</FieldLabel>
                          <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input type="time" className="pl-9 bg-background" {...form.register("proposedEndTime")} />
                          </div>
                          </Field>
                      </div>
                      </div>

                      <div className="space-y-4 border-l pl-6 hidden md:block border-muted/30">
                      <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                          <Clock className="size-3" /> Lịch hiện tại
                      </h4>
                      <div className="text-sm space-y-4 text-foreground font-medium">
                          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
                              <CalendarIcon className="size-4 text-primary" />
                              <span>{formatDateTime(session.sessionDate, "EEEE, dd MMMM yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
                              <Clock className="size-4 text-primary" />
                              <span>{session.startTime} - {session.endTime}</span>
                          </div>
                          </div>
                      </div>
                  </div>
                </FieldSet>

                {hasConflict && (
                  <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-xl shadow-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold uppercase tracking-tight text-xs">Phát hiện trùng lịch học</AlertTitle>
                    <AlertDescription className="text-xs opacity-90 leading-relaxed">
                      Thời gian dời sang đang bị trùng với lịch học khác của lớp hoặc của giảng viên. Bạn vẫn có thể gửi yêu cầu, nhưng khả năng được phê duyệt có thể thấp hơn.
                      {previewConflict.data?.teacherConflicts && previewConflict.data.teacherConflicts.length > 0 && (
                        <ul className="list-disc list-inside mt-3 space-y-1.5 font-bold border-t border-destructive/10 pt-2">
                          {previewConflict.data.teacherConflicts.map((c: any) => (
                            <li key={c.id} className="text-destructive">
                              Trùng với lớp <span className="bg-destructive/10 px-1.5 py-0.5 rounded font-mono">{c.classCode}</span> ({c.startTime} - {c.endTime})
                            </li>
                          ))}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Field>
                  <FieldLabel>Lý do yêu cầu</FieldLabel>
                  <Textarea
                    placeholder="Nhập lý do dời lịch (ví dụ: trùng lịch họp quan trọng, điều chỉnh lịch dạy...)"
                    className="bg-background min-h-[120px] shadow-inner focus:ring-primary/20"
                    {...form.register("reason")}
                  />
                  <FieldDescription className="italic">Ghi chú chi tiết sẽ giúp quản trị viên xem xét và phê duyệt nhanh chóng hơn.</FieldDescription>
                </Field>
              </FieldGroup>
            </div>
          </ScrollArea>

          <SheetFooter className="p-6 border-t bg-background shrink-0">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createRequest.isPending || hasConflict}
            >
              {createRequest.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
