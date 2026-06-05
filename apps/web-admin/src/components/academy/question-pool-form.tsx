import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
    Field,
    FieldError,
    FieldLabel,
    FieldGroup,
    FieldDescription,
    FieldSet,
    FieldLegend,
    FieldSeparator,
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
    academyQuestionPoolCreateDTOSchema,
    academyQuestionPoolUpdateDTOSchema,
    type AcademyQuestionPoolCreateDTO,
    type AcademyQuestionPoolUpdateDTO,
} from "@workspace/schemas"
import type { AcademyQuestionPool } from "@/lib/api/services/academy-question-pools"
import { useAcademyCourseProfiles } from "@/lib/api/services/academy-course-profiles"

export function QuestionPoolForm({
    mode,
    initial,
    onSubmit,
    onCancel,
    submitting,
}: {
    mode: "create" | "edit"
    initial?: AcademyQuestionPool
    onSubmit: (
        data: AcademyQuestionPoolCreateDTO | AcademyQuestionPoolUpdateDTO,
    ) => Promise<void>
    onCancel: () => void
    submitting?: boolean
}) {
    const isEdit = mode === "edit"
    const { data: profiles = [] } = useAcademyCourseProfiles({})

    const { handleSubmit, control } = useForm<
        AcademyQuestionPoolCreateDTO | AcademyQuestionPoolUpdateDTO
    >({
        resolver: zodResolver(
            (isEdit ? academyQuestionPoolUpdateDTOSchema : academyQuestionPoolCreateDTOSchema) as any,
        ) as any,
        defaultValues: isEdit
            ? {
                code: initial?.code ?? "",
                name: initial?.name ?? "",
                description: initial?.description ?? "",
                courseProfileId: initial?.courseProfileId ?? undefined,
                level: initial?.level ?? "",
                category: initial?.category ?? "",
                status: initial?.status ?? "DRAFT",
            }
            : {
                code: "",
                name: "",
                description: "",
                courseProfileId: undefined,
                level: "",
                category: "",
                status: "DRAFT",
            },
    })

    const hSubmit = async (values: any) => {
        // Clean data: convert empty strings to null or undefined
        const cleaned = { ...values };
        if (!cleaned.code?.trim()) cleaned.code = null;
        if (!cleaned.description?.trim()) cleaned.description = null;
        if (!cleaned.level || cleaned.level === "NONE") cleaned.level = null;
        if (!cleaned.category || cleaned.category === "NONE") cleaned.category = null;
        if (!cleaned.courseProfileId || cleaned.courseProfileId === "NONE") cleaned.courseProfileId = null;

        await onSubmit(cleaned);
    }

    return (
        <form
            className="space-y-6 max-w-4xl mx-auto"
            onSubmit={handleSubmit(hSubmit)}
            noValidate
        >
            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-muted/50 pb-6">
                    <CardTitle className="text-xl">Thông tin nhóm câu hỏi</CardTitle>
                    <CardDescription>Nhóm câu hỏi theo trình độ, danh mục hoặc hồ sơ khóa học.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <FieldGroup>
                        <FieldSet>
                            <FieldLegend>Thông tin cơ bản</FieldLegend>
                            <FieldGroup>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <Controller
                                        name={"code" as any}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field>
                                                <FieldLabel>Mã định danh</FieldLabel>
                                                <Input placeholder="Ví dụ: POOL_VOCAB_N5" {...field} className="font-mono uppercase h-10" />
                                                <FieldDescription>Mã duy nhất để phân biệt các nhóm câu hỏi.</FieldDescription>
                                                <FieldError>{fieldState.error?.message}</FieldError>
                                            </Field>
                                        )}
                                    />
                                    <Controller
                                        name={"name" as any}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field>
                                                <FieldLabel>Tên nhóm câu hỏi</FieldLabel>
                                                <Input placeholder="Ví dụ: Nhóm từ vựng N5" {...field} className="h-10" />
                                                <FieldError>{fieldState.error?.message}</FieldError>
                                            </Field>
                                        )}
                                    />
                                </div>

                                <Controller
                                    name={"description" as any}
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field>
                                            <FieldLabel>Mô tả chi tiết</FieldLabel>
                                            <Textarea placeholder="Mô tả mục đích của nhóm câu hỏi này..." {...field} rows={3} className="resize-none" />
                                            <FieldError>{fieldState.error?.message}</FieldError>
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </FieldSet>

                        <FieldSeparator />

                        <FieldSet>
                            <FieldLegend>Phân loại và trạng thái</FieldLegend>
                            <FieldGroup>
                                <div className="grid gap-6 md:grid-cols-3">
                                    <Controller
                                        name={"level" as any}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field>
                                                <FieldLabel>Cấp độ</FieldLabel>
                                                <Select value={field.value || "NONE"} onValueChange={(val) => field.onChange(val === "NONE" ? "" : val)}>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue placeholder="Chọn cấp độ..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NONE">Không chọn</SelectItem>
                                                        <SelectItem value="N1">JLPT N1</SelectItem>
                                                        <SelectItem value="N2">JLPT N2</SelectItem>
                                                        <SelectItem value="N3">JLPT N3</SelectItem>
                                                        <SelectItem value="N4">JLPT N4</SelectItem>
                                                        <SelectItem value="N5">JLPT N5</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FieldError>{fieldState.error?.message}</FieldError>
                                            </Field>
                                        )}
                                    />
                                    <Controller
                                        name={"category" as any}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field>
                                                <FieldLabel>Danh mục</FieldLabel>
                                                <Select value={field.value || "NONE"} onValueChange={(val) => field.onChange(val === "NONE" ? "" : val)}>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue placeholder="Chọn danh mục..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NONE">Không chọn</SelectItem>
                                                        <SelectItem value="VOCABULARY">Từ vựng</SelectItem>
                                                        <SelectItem value="GRAMMAR">Ngữ pháp</SelectItem>
                                                        <SelectItem value="KANJI">Hán tự</SelectItem>
                                                        <SelectItem value="READING">Đọc hiểu</SelectItem>
                                                        <SelectItem value="LISTENING">Nghe hiểu</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FieldError>{fieldState.error?.message}</FieldError>
                                            </Field>
                                        )}
                                    />
                                    <Controller
                                        name={"status" as any}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field>
                                                <FieldLabel>Trạng thái</FieldLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue placeholder="Trạng thái..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="DRAFT">Nháp</SelectItem>
                                                        <SelectItem value="ACTIVE">Công khai</SelectItem>
                                                        <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FieldError>{fieldState.error?.message}</FieldError>
                                            </Field>
                                        )}
                                    />
                                </div>

                                <Controller
                                    name={"courseProfileId" as any}
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field>
                                            <FieldLabel>Gắn với hồ sơ khóa học (tùy chọn)</FieldLabel>
                                            <Select value={field.value || "NONE"} onValueChange={(val) => field.onChange(val === "NONE" ? undefined : val)}>
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Chọn hồ sơ khóa học (tùy chọn)..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NONE">Không liên kết</SelectItem>
                                                    {profiles.map((p: any) => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.code} - {p.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FieldDescription>Nếu chọn, nhóm câu hỏi này chỉ hiển thị cho khóa học đó.</FieldDescription>
                                            <FieldError>{fieldState.error?.message}</FieldError>
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                        </FieldSet>

                    </FieldGroup>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Hủy bỏ
                </Button>
                <Button type="submit" disabled={submitting} className="px-8 h-10 shadow-sm">
                    {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {isEdit ? "Cập nhật nhóm câu hỏi" : "Tạo nhóm câu hỏi"}
                </Button>
            </div>
        </form>
    )
}
