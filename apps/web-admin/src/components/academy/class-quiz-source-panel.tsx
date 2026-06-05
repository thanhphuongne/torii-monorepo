import { Controller, type Control } from "react-hook-form"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Link } from "react-router-dom"
import type { AcademyExam } from "@/lib/api/services/academy-exams"
import type { AcademyQuestionPool } from "@/lib/api/services/academy-question-pools"

type QuizSourcePanelProps = {
    control: Control<any>
    isVodClass: boolean
    isEdit: boolean
    exams: AcademyExam[]
    pools: AcademyQuestionPool[]
}

export function ClassQuizSourcePanel({
    control,
    isVodClass,
    isEdit,
    exams,
    pools,
}: QuizSourcePanelProps) {
    const publishedExams = exams.filter((exam) => exam.status === "PUBLISHED")

    if (isVodClass) {
        return (
            <FieldGroup>
                <Field>
                    <FieldLabel>Nguồn đề thi</FieldLabel>
                    <Input disabled value="Tự học: dùng đề mặc định của mẫu bài kiểm tra, không cho ghi đè" />
                    <FieldDescription>
                        Lớp tự học không cho phép giảng viên ghi đè đề thi. Hệ thống luôn dùng đề mặc định của chương trình học.
                    </FieldDescription>
                </Field>
            </FieldGroup>
        )
    }

    return (
        <FieldGroup>
            <FieldDescription>
                Luồng thiết lập cho lớp trực tiếp: chọn mẫu bài kiểm tra, sau đó chọn nguồn đề rồi lưu cấu hình.
            </FieldDescription>
            <Controller
                name={"settings.liveOverrideMode" as any}
                control={control}
                render={({ field, fieldState }) => (
                    <Field>
                        <FieldLabel>Chế độ đề thi cho lớp trực tiếp</FieldLabel>
                        <Select value={field.value ?? "USE_TEMPLATE_DEFAULT"} onValueChange={field.onChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn chế độ..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USE_TEMPLATE_DEFAULT">Nhanh nhất: dùng đề mặc định từ mẫu bài kiểm tra</SelectItem>
                                <SelectItem value="USE_EXISTING_EXAM">Chủ động: chọn đề đã tạo sẵn</SelectItem>
                                <SelectItem value="GENERATE_FROM_POOL">Tạo nhanh: tự sinh đề mới từ nhóm câu hỏi</SelectItem>
                            </SelectContent>
                        </Select>
                        <FieldDescription>
                            Gợi ý: nếu chưa có yêu cầu đặc biệt cho từng lớp trực tiếp, hãy chọn chế độ nhanh nhất.
                        </FieldDescription>
                        <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                )}
            />

            <Controller
                name={"settings.liveOverrideMode" as any}
                control={control}
                render={({ field }) => (
                    <>
                        {field.value === "USE_EXISTING_EXAM" ? (
                        <Controller
                            name={"settings.overrideExamId" as any}
                            control={control}
                            render={({ field: examField, fieldState }) => (
                                <Field>
                                    <FieldLabel>Đề thi thay thế</FieldLabel>
                                    <Select value={examField.value} onValueChange={examField.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn đề thi đã công khai..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {publishedExams.map((exam) => (
                                                <SelectItem key={exam.id} value={exam.id}>
                                                    {exam.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        Dùng đề này thay cho đề mặc định của mẫu bài kiểm tra.
                                    </FieldDescription>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link to="/academy/exams/new">Tạo đề mới</Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link to="/academy/exams">Xem danh sách đề</Link>
                                        </Button>
                                    </div>
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        ) : null}
                    </>
                )}
            />

            <Controller
                name={"settings.liveOverrideMode" as any}
                control={control}
                render={({ field }) => (
                    <>
                        {field.value === "GENERATE_FROM_POOL" ? (
                        <>
                            <Controller
                                name={"settings.overridePoolId" as any}
                                control={control}
                                render={({ field: poolField, fieldState }) => (
                                    <Field>
                                    <FieldLabel>Nhóm câu hỏi cho lớp trực tiếp</FieldLabel>
                                        <Select value={poolField.value} onValueChange={poolField.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn nhóm câu hỏi..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {pools.map((pool) => (
                                                    <SelectItem key={pool.id} value={pool.id}>
                                                        {pool.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                            <div className="grid gap-4 md:grid-cols-2">
                                <Controller
                                    name={"settings.overrideQuestionCount" as any}
                                    control={control}
                                    render={({ field: countField, fieldState }) => (
                                        <Field>
                                            <FieldLabel>Số câu hỏi cần lấy</FieldLabel>
                                            <Input
                                                type="number"
                                                min={1}
                                                value={countField.value ?? 10}
                                                onChange={(event) =>
                                                    countField.onChange(
                                                        event.target.value === ""
                                                            ? undefined
                                                            : Number(event.target.value),
                                                    )
                                                }
                                            />
                                            <FieldError>{fieldState.error?.message}</FieldError>
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name={"settings.overrideShuffleQuestions" as any}
                                    control={control}
                                    render={({ field: shuffleField, fieldState }) => (
                                        <Field>
                                            <FieldLabel>Trộn thứ tự câu hỏi</FieldLabel>
                                            <Select
                                                value={String(shuffleField.value ?? true)}
                                                onValueChange={(value) => shuffleField.onChange(value === "true")}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Có trộn</SelectItem>
                                                    <SelectItem value="false">Giữ thứ tự nhóm câu hỏi</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FieldError>{fieldState.error?.message}</FieldError>
                                        </Field>
                                    )}
                                />
                            </div>
                            <FieldDescription>
                                Khi lưu, hệ thống sẽ tự tạo một đề thi mới từ nhóm câu hỏi này và gắn vào bài kiểm tra của lớp trực tiếp.
                            </FieldDescription>
                            <FieldDescription>
                                Cách này phù hợp khi giảng viên cần thao tác nhanh và không muốn tự tạo đề thi thủ công.
                            </FieldDescription>
                        </>
                        ) : null}
                    </>
                )}
            />

            {!isEdit ? (
                <FieldDescription>
                    Chưa có đề thi? Bạn có thể tạo nhanh tại{" "}
                    <Link to="/academy/exams/new" className="text-primary hover:underline">
                        màn hình Đề thi
                    </Link>
                    .
                </FieldDescription>
            ) : null}
        </FieldGroup>
    )
}
