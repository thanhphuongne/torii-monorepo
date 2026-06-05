import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  academyLiveScheduleCreateDTOSchema,
  academyLiveScheduleUpdateDTOSchema,
  type AcademyLiveScheduleCreateDTO,
  type AcademyLiveScheduleUpdateDTO,
} from "@workspace/schemas"
import type { AcademyLiveSchedule } from "@/lib/api/services/academy-live-schedules"

export function LiveScheduleForm({
  mode,
  initial,
  onSubmit,
  onCancel,
  submitting,
  defaultLiveClassId,
}: {
  mode: "create" | "edit"
  initial?: AcademyLiveSchedule
  onSubmit: (
    data: AcademyLiveScheduleCreateDTO | AcademyLiveScheduleUpdateDTO,
  ) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  defaultLiveClassId?: string
}) {
  const isEdit = mode === "edit"

  const { handleSubmit, control } = useForm<
    AcademyLiveScheduleCreateDTO | AcademyLiveScheduleUpdateDTO
  >({
    resolver: zodResolver(
      (isEdit
        ? academyLiveScheduleUpdateDTOSchema
        : academyLiveScheduleCreateDTOSchema) as any,
    ) as any,
    defaultValues: isEdit
      ? {
        weekday: initial?.weekday ?? 1,
        startTime: initial?.startTime ?? "",
        endTime: initial?.endTime ?? "",
      }
      : {
        liveClassId: defaultLiveClassId ?? "",
        weekday: 1,
        startTime: "19:00",
        endTime: "21:00",
      },
  })

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (data) => onSubmit(data))}
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>Thời gian học</CardTitle>
          <CardDescription>Thiết lập thứ trong tuần và khung giờ học.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {!isEdit && (
              <Controller
                name={"liveClassId" as any}
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>ID lớp trực tiếp</FieldLabel>
                    <Input placeholder="UUID lớp trực tiếp" disabled {...field} />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Controller
                name={"weekday" as any}
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Thứ trong tuần</FieldLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) => field.onChange(Number(val))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thứ..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Thứ 2</SelectItem>
                        <SelectItem value="2">Thứ 3</SelectItem>
                        <SelectItem value="3">Thứ 4</SelectItem>
                        <SelectItem value="4">Thứ 5</SelectItem>
                        <SelectItem value="5">Thứ 6</SelectItem>
                        <SelectItem value="6">Thứ 7</SelectItem>
                        <SelectItem value="0">Chủ Nhật</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />
              <Controller
                name={"startTime" as any}
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Giờ bắt đầu</FieldLabel>
                    <Input type="time" {...field} />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />
              <Controller
                name={"endTime" as any}
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Giờ kết thúc</FieldLabel>
                    <Input type="time" {...field} />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Spinner className="mr-2" /> : null}
          {isEdit ? "Lưu thay đổi" : "Tạo Lịch học"}
        </Button>
      </div>
    </form>
  )
}
