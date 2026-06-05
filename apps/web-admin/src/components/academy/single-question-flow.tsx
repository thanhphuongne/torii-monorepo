import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { toast } from "@workspace/ui/components/sonner"
import { Button } from "@workspace/ui/components/button"
import {
    AcademyQuestionCategoryType,
    academyQuestionCreateDTOSchema,
    academyQuestionUpdateDTOSchema,
    type AcademyQuestionCreateDTO,
    type AcademyQuestionUpdateDTO,
    AcademyQuestionType,
} from "@workspace/schemas"
import {
    useCreateAcademyQuestion,
    useUpdateAcademyQuestion,
    type AcademyQuestion,
} from "@/lib/api/services/academy-questions"
import { QuestionFormLayout } from "@/components/academy/question-form-layout"
import { Save, X, Eye } from "lucide-react"
import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog"
import { QuestionPreview } from "@/components/academy/question-preview"
import { ScrollArea } from "@workspace/ui/components/scroll-area"

interface SingleQuestionFlowProps {
    mode: "create" | "edit"
    initial?: AcademyQuestion
    parentId?: string
    fixedLevel?: string
    hideQuestionTypeField?: boolean
    onSuccess?: (id: string) => void
    onCancel?: () => void
}

export function SingleQuestionFlow({
    mode,
    initial,
    parentId,
    fixedLevel,
    hideQuestionTypeField = false,
    onSuccess,
    onCancel,
}: SingleQuestionFlowProps) {
    const nav = useNavigate()
    const create = useCreateAcademyQuestion()
    const update = useUpdateAcademyQuestion()
    const isEdit = mode === "edit"
    const [showPreview, setShowPreview] = useState(false)

    const form = useForm<AcademyQuestionCreateDTO | AcademyQuestionUpdateDTO>({
        resolver: zodResolver(
            (isEdit ? academyQuestionUpdateDTOSchema : academyQuestionCreateDTOSchema) as any
        ),
        defaultValues: isEdit
            ? {
                stem: initial?.stem || initial?.content || "",
                mediaUrl: initial?.mediaUrl ?? undefined,
                questionType: initial?.questionType ?? AcademyQuestionType.SINGLE_CHOICE,
                options: initial?.options ?? undefined,
                correctAnswer: initial?.correctAnswer ?? undefined,
                explanation: initial?.explanation ?? undefined,
                level: fixedLevel ?? initial?.level ?? undefined,
                categoryType: (initial as any)?.categoryType ?? AcademyQuestionCategoryType.GRAMMAR,
            }
            : {
                parentId: parentId ?? undefined,
                stem: "",
                mediaUrl: undefined,
                questionType: AcademyQuestionType.SINGLE_CHOICE,
                options: undefined,
                correctAnswer: undefined,
                explanation: undefined,
                level: fixedLevel ?? "N5",
                categoryType: AcademyQuestionCategoryType.GRAMMAR,
            },
    })

    const onSubmit = async (data: AcademyQuestionCreateDTO | AcademyQuestionUpdateDTO) => {
        try {
            if (isEdit && initial) {
                await update.mutateAsync({
                    id: initial.id,
                    dto: data as AcademyQuestionUpdateDTO,
                })
                toast.success("Đã cập nhật câu hỏi")
                onSuccess?.(initial.id)
            } else {
                const result = await create.mutateAsync(data as AcademyQuestionCreateDTO)
                toast.success("Đã tạo câu hỏi")
                onSuccess?.(result.id)
            }
        } catch (error) {
            console.error(error)
            toast.error("Thao tác thất bại")
        }
    }

    const isSubmitting = create.isPending || update.isPending
    const currentValues = form.watch()

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <QuestionFormLayout
                form={form as any}
                isEdit={isEdit}
                hideQuestionTypeField={hideQuestionTypeField}
                lockQuestionType={isEdit && initial?.questionType === AcademyQuestionType.GROUP_PARENT}
                hideParentPicker={!!parentId}
                hideLevelField={!!fixedLevel}
            />

            <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex gap-2">
                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline">
                                <Eye className="mr-2 size-4" />
                                Xem trước
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Xem trước nội dung hiển thị</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[70vh] pr-4">
                                <QuestionPreview
                                    content={(currentValues as any).stem || ""}
                                    questionType={(currentValues as any).questionType || AcademyQuestionType.SINGLE_CHOICE}
                                    options={(currentValues as any).options}
                                    correctAnswer={(currentValues as any).correctAnswer}
                                    explanation={currentValues.explanation}
                                />
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex gap-3 font-semibold">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel || (() => nav("/academy/questions"))}
                        disabled={isSubmitting}
                    >
                        <X className="mr-2 size-4" />
                        Hủy bỏ
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                        <Save className="mr-2 size-4" />
                        {isEdit ? "Lưu thay đổi" : "Tạo câu hỏi"}
                    </Button>
                </div>
            </div>
        </form>
    )
}
