import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    academyLiveClassDuplicateDTOSchema,
    type AcademyLiveClassDuplicateDTO,
} from "@workspace/schemas"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "sonner"
import { useDuplicateAcademyClass, type AcademyLiveClass } from "@/lib/api/services/academy-live-classes"
import { useNavigate } from "react-router-dom"

export function DuplicateClassDialog({
    sourceClass,
    open,
    onOpenChange,
}: {
    sourceClass: AcademyLiveClass
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const navigate = useNavigate()
    const duplicateMutation = useDuplicateAcademyClass()

    const {
        handleSubmit,
        control,
        formState: { isSubmitting },
    } = useForm<any>({
        resolver: zodResolver(academyLiveClassDuplicateDTOSchema),
        defaultValues: {
            code: "",
            name: `${sourceClass.name} (Bản sao)`,
            instructorId: sourceClass.instructorId ?? undefined,
        },
    })

    const onSubmit = async (data: AcademyLiveClassDuplicateDTO) => {
        try {
            const result = await duplicateMutation.mutateAsync({
                id: sourceClass.id,
                input: data,
            })
            toast.success("Đã nhân bản lớp học thành công")
            onOpenChange(false)
            navigate(`/academy/live-classes/${result.id}/detail`)
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Không thể nhân bản lớp học")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Nhân bản lớp học</DialogTitle>
                        <DialogDescription>
                            Tạo một lớp học mới từ lớp {sourceClass.code}. Trạng thái sẽ là DRAFT.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        <FieldGroup>
                            <Controller
                                name="code"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel>Mã lớp mới (Tùy chọn)</FieldLabel>
                                        <Input placeholder="Để trống để tự động sinh" {...field} />
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                            <Controller
                                name="name"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel>Tên lớp mới</FieldLabel>
                                        <Input placeholder="Nhập tên lớp học" {...field} />
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                            <Controller
                                name={"instructorId" as any}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel>Giảng viên (tùy chọn)</FieldLabel>
                                        <Input placeholder="UUID giảng viên (nếu cần)" {...field} value={field.value ? String(field.value) : ""} />
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Spinner className="mr-2" />}
                            Xác nhận nhân bản
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
