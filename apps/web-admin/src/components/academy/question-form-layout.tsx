import { Controller, type UseFormReturn } from "react-hook-form"
import {
    Field,
    FieldError,
    FieldLabel,
    FieldDescription,
    FieldGroup,
    FieldSet,
    FieldLegend,
} from "@workspace/ui/components/field"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"
import { RichTextEditor } from "@/components/editor/rich-text-editor"
import { QuestionPicker } from "./question-picker"
import { StringListEditor } from "./string-list-editor"
import { QuestionOptionsEditor } from "./question-options-editor"
import { LessonMediaUploader } from "./lesson-media-uploader"
import {
    AcademyQuestionCategoryType,
    AcademyQuestionType,
    type AcademyQuestionCreateDTO,
    type AcademyQuestionUpdateDTO,
} from "@workspace/schemas"

interface QuestionFormLayoutProps {
    form: UseFormReturn<AcademyQuestionCreateDTO | AcademyQuestionUpdateDTO | any>
    isEdit: boolean
    hideParentPicker?: boolean
    hideQuestionTypeField?: boolean
    lockQuestionType?: boolean
    hideMediaField?: boolean
    hideLevelField?: boolean
    lockLevel?: boolean
}

export function QuestionFormLayout({
    form,
    isEdit,
    hideParentPicker,
    hideQuestionTypeField,
    lockQuestionType,
    hideMediaField,
    hideLevelField,
    lockLevel,
}: QuestionFormLayoutProps) {
    const { control, watch, setValue } = form
    const questionType = watch("questionType")
    const isGroupParent = questionType === AcademyQuestionType.GROUP_PARENT

    return (
        <div className="space-y-12">
            {/* 1. Phân loại & Ngữ cảnh */}
            <FieldSet>
                <FieldLegend>Thông tin chung</FieldLegend>
                <FieldGroup>
                    {!isEdit && !hideParentPicker && !isGroupParent && (
                        <Controller
                            name="parentId"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel>Thuộc đoạn văn cha</FieldLabel>
                                    <QuestionPicker
                                        value={field.value}
                                        onSelect={(id) => field.onChange(id || undefined)}
                                        placeholder="Chọn GROUP_PARENT nếu đây là câu hỏi con..."
                                        questionTypeFilter={AcademyQuestionType.GROUP_PARENT}
                                        allowClear
                                    />
                                    <FieldDescription>Nếu để trống, đây sẽ là câu hỏi đơn lập.</FieldDescription>
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        {!hideQuestionTypeField && (
                            <Controller
                                name="questionType"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel>Loại câu hỏi</FieldLabel>
                                        <Select value={field.value} onValueChange={(val) => {
                                            field.onChange(val)
                                            // Clear answers if switching to GROUP_PARENT
                                            if (val === AcademyQuestionType.GROUP_PARENT) {
                                                setValue("options", undefined)
                                                setValue("correctAnswer", undefined)
                                                setValue("parentId", undefined)
                                            }
                                        }}>
                                            <SelectTrigger className="h-11 shadow-sm" disabled={lockQuestionType}>
                                                <SelectValue placeholder="Chọn loại..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={AcademyQuestionType.SINGLE_CHOICE}>Một đáp án</SelectItem>
                                                <SelectItem value={AcademyQuestionType.MULTIPLE_CHOICE}>Nhiều đáp án</SelectItem>
                                                <SelectItem value={AcademyQuestionType.SHORT_ANSWER}>Trả lời ngắn</SelectItem>
                                                <SelectItem value={AcademyQuestionType.TRUE_FALSE}>Đúng/Sai</SelectItem>
                                                <SelectItem value={AcademyQuestionType.GROUP_PARENT}>Đoạn văn (Câu cha)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                        )}

                        {!hideMediaField && (
                            <Controller
                                name="mediaUrl"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <LessonMediaUploader
                                        label="Tệp đính kèm (Ảnh/Audio/Video)"
                                        value={field.value || null}
                                        onChange={(url) => field.onChange(url ?? undefined)}
                                        errorMessage={fieldState.error?.message}
                                    />
                                )}
                            />
                        )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {!hideLevelField && (
                            <Controller
                                name="level"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel>Trình độ</FieldLabel>
                                        <Select value={field.value} onValueChange={field.onChange} disabled={lockLevel}>
                                            <SelectTrigger className="h-11 shadow-sm">
                                                <SelectValue placeholder="Chọn trình độ..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["N1", "N2", "N3", "N4", "N5", "OTHER"].map((l) => (
                                                    <SelectItem key={l} value={l}>{l}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                        )}
                        <Controller
                            name="categoryType"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel>Nhóm câu hỏi</FieldLabel>
                                    <Select
                                        value={field.value || AcademyQuestionCategoryType.GRAMMAR}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger className="h-11 shadow-sm">
                                            <SelectValue placeholder="Chọn nhóm..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={AcademyQuestionCategoryType.VOCABULARY}>Từ vựng</SelectItem>
                                            <SelectItem value={AcademyQuestionCategoryType.GRAMMAR}>Ngữ pháp</SelectItem>
                                            <SelectItem value={AcademyQuestionCategoryType.KANJI}>Kanji</SelectItem>
                                            <SelectItem value={AcademyQuestionCategoryType.READING}>Đọc hiểu</SelectItem>
                                            <SelectItem value={AcademyQuestionCategoryType.LISTENING}>Nghe hiểu</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                    </div>
                </FieldGroup>
            </FieldSet>

            {/* 2. Nội dung */}
            <FieldSet>
                <FieldLegend>Nội dung</FieldLegend>
                <FieldGroup>
                    <Controller
                        name="stem"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field>
                                <FieldLabel>{isGroupParent ? "Văn bản/Ngữ cảnh" : "Câu hỏi"}</FieldLabel>
                                <RichTextEditor
                                    initialContent={field.value || ""}
                                    onUpdate={field.onChange}
                                    minHeight={isGroupParent ? 300 : 150}
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />
                </FieldGroup>
            </FieldSet>

            {/* 3. Đáp án (chỉ khi không phải GROUP_PARENT) */}
            {!isGroupParent && (
                <FieldSet>
                    <FieldLegend>Đáp án & Giải thích</FieldLegend>
                    <FieldGroup>
                        {["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].includes(questionType) ? (
                            <div className="space-y-4">
                                <QuestionOptionsEditor
                                    type={questionType}
                                    options={watch("options")}
                                    correctAnswer={watch("correctAnswer")}
                                    onChange={(opts, correct) => {
                                        setValue("options", opts)
                                        setValue("correctAnswer", correct)
                                    }}
                                />
                            </div>
                        ) : questionType === "SHORT_ANSWER" ? (
                            <Controller
                                name="correctAnswer"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel>Các đáp án đúng chấp nhận</FieldLabel>
                                        <StringListEditor
                                            value={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Nhập đáp án..."
                                        />
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                        ) : null}

                        <Controller
                            name="explanation"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field className="mt-6">
                                    <FieldLabel>Giải thích</FieldLabel>
                                    <RichTextEditor
                                        initialContent={field.value || ""}
                                        onUpdate={field.onChange}
                                        minHeight={150}
                                    />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </FieldSet>
            )}

        </div>
    )
}
