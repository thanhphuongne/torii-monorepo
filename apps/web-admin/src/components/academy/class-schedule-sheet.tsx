import { useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@workspace/ui/components/sheet"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Plus, Trash2, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  useAcademyLiveSchedules,
  useCreateAcademyLiveSchedule,
  useDeleteAcademyLiveSchedule,
} from "@/lib/api/services/academy-live-schedules"

const scheduleItemSchema = z.object({
  id: z.string().optional(),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().min(1, "Bắt đầu không được để trống"),
  endTime: z.string().min(1, "Kết thúc không được để trống"),
})

const scheduleFormSchema = z.object({
  schedules: z.array(scheduleItemSchema),
})

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>

interface ClassScheduleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  liveClassId: string
}

const WEEKDAYS = [
  { value: "1", label: "Thứ Hai" },
  { value: "2", label: "Thứ Ba" },
  { value: "3", label: "Thứ Tư" },
  { value: "4", label: "Thứ Năm" },
  { value: "5", label: "Thứ Sáu" },
  { value: "6", label: "Thứ Bảy" },
  { value: "0", label: "Chủ Nhật" },
]

export function ClassScheduleSheet({ open, onOpenChange, liveClassId }: ClassScheduleSheetProps) {
  const { data: existingSchedules = [] } = useAcademyLiveSchedules(
    { liveClassId },
    { enabled: open && !!liveClassId }
  )

  const createScheduleMutation = useCreateAcademyLiveSchedule()
  const deleteScheduleMutation = useDeleteAcademyLiveSchedule()

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      schedules: [],
    },
  })

  useEffect(() => {
    if (open && existingSchedules.length > 0) {
      form.reset({
        schedules: existingSchedules.map((s) => ({
          id: s.id,
          weekday: s.weekday,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      })
    } else if (open) {
      form.reset({ schedules: [] })
    }
  }, [existingSchedules, form, open])

  const { fields, append, remove } = useFieldArray({
    name: "schedules",
    control: form.control,
  })

  const onSubmit = async (values: ScheduleFormValues) => {
    try {
        const existingIds = existingSchedules.map(s => s.id)
        const currentIds = values.schedules.map(s => s.id).filter(Boolean) as string[]
        
        const toDelete = existingIds.filter(id => !currentIds.includes(id))
        const toCreate = values.schedules.filter(s => !s.id)

        // Delete removed ones
        for (const id of toDelete) {
            await deleteScheduleMutation.mutateAsync(id)
        }

        // Create new ones
        for (const s of toCreate) {
            await createScheduleMutation.mutateAsync({
                liveClassId,
                weekday: s.weekday,
                startTime: s.startTime,
                endTime: s.endTime,
            })
        }

        toast.success("Cập nhật lịch học thành công")
        onOpenChange(false)
    } catch (error: any) {
        toast.error(error.userMessage || "Lỗi khi cập nhật lịch học")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent className="!w-full sm:!max-w-[800px] flex flex-col h-full p-0 text-foreground">
        <SheetHeader className="p-6 border-b shrink-0 gap-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="size-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">Thiết lập thời khóa biểu tuần</SheetTitle>
              <SheetDescription>
                Quy định các khung giờ học cố định diễn ra hàng tuần.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="flex-1 flex flex-col min-h-0 bg-muted/5 overflow-hidden"
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 p-6">
              {fields.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground bg-background/50">
                  <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Calendar className="size-8 opacity-20" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">Chưa có lịch học</h3>
                  <p className="text-sm max-w-[300px] text-center mb-6">Thiết lập khung giờ học định kỳ để hệ thống tự động tạo các buổi học cho cả khóa.</p>
                  
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button 
                      type="button" 
                      variant="default" 
                      onClick={() => append({ weekday: 1, startTime: "18:00", endTime: "20:00" })}
                    >
                      <Plus className="size-4 mr-2" /> Thêm khung giờ
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        append({ weekday: 1, startTime: "18:00", endTime: "20:00" });
                        append({ weekday: 3, startTime: "18:00", endTime: "20:00" });
                        append({ weekday: 5, startTime: "18:00", endTime: "20:00" });
                      }}
                    >
                      <Calendar className="size-4 mr-2" /> Mẫu 3 buổi/tuần (2-4-6)
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-6">
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative overflow-hidden border-primary/10 shadow-sm">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0 text-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary text-sm font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <CardTitle className="text-base">Lịch học cố định #{index + 1}</CardTitle>
                          <CardDescription className="text-xs">Cấu hình khung giờ hàng tuần</CardDescription>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-4 text-foreground">
                      <FieldGroup>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Field>
                            <FieldLabel>Ngày trong tuần</FieldLabel>
                            <Select
                              onValueChange={(val) => form.setValue(`schedules.${index}.weekday`, parseInt(val, 10))}
                              value={form.watch(`schedules.${index}.weekday`)?.toString()}
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Chọn thứ" />
                              </SelectTrigger>
                              <SelectContent>
                                {WEEKDAYS.map((day) => (
                                  <SelectItem key={day.value} value={day.value}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>

                          <Field>
                            <FieldLabel>Thời gian bắt đầu</FieldLabel>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input 
                                type="time" 
                                className="pl-9 bg-background" 
                                {...form.register(`schedules.${index}.startTime`)} 
                              />
                            </div>
                          </Field>

                          <Field>
                            <FieldLabel>Thời gian kết thúc</FieldLabel>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input 
                                type="time" 
                                className="pl-9 bg-background" 
                                {...form.register(`schedules.${index}.endTime`)} 
                              />
                            </div>
                          </Field>
                        </div>

                      </FieldGroup>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {fields.length > 0 && (
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-dashed py-8 h-auto flex-col gap-2 bg-background hover:bg-muted/10 transition-all"
                    onClick={() => append({ weekday: 1, startTime: "18:00", endTime: "20:00" })}
                  >
                    <Plus className="h-6 w-6 text-primary" />
                    <span className="font-semibold">Thêm khung giờ khác</span>
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="p-6 border-t bg-background shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createScheduleMutation.isPending || deleteScheduleMutation.isPending}>
              Lưu thay đổi
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
