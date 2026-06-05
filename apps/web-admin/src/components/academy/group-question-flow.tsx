import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { toast } from "@workspace/ui/components/sonner"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
    AcademyQuestionCategoryType,
    academyQuestionCreateDTOSchema,
    academyQuestionUpdateDTOSchema,
    type AcademyQuestionCreateDTO,
    type AcademyQuestionUpdateDTO,
    AcademyQuestionType,
} from "@workspace/schemas"
import {
    academyQuestionsApi,
    useCreateAcademyQuestion,
    useUpdateAcademyQuestion,
    type AcademyQuestion,
} from "@/lib/api/services/academy-questions"
import { QuestionFormLayout } from "@/components/academy/question-form-layout"
import { SingleQuestionFlow } from "@/components/academy/single-question-flow"
import { Plus, Save, BookOpen, Layers, Edit2, Eye } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog"
import { QuestionPreview } from "@/components/academy/question-preview"

interface GroupQuestionFlowProps {
    initialParent?: AcademyQuestion
    onCancel: () => void
}

export function GroupQuestionFlow({
    initialParent,
    onCancel,
}: GroupQuestionFlowProps) {
    const [parent, setParent] = useState<AcademyQuestion | undefined>(initialParent)
    const isParentCreated = !!parent
    const [showPreview, setShowPreview] = useState(false)

    const create = useCreateAcademyQuestion()
    const update = useUpdateAcademyQuestion()

    // Children fetching
    const { data: children = [], refetch: refetchChildren } = useQuery({
        queryKey: ["academy-questions", { parentId: parent?.id }],
        queryFn: () => academyQuestionsApi.findAll({ parentId: parent?.id }),
        enabled: !!parent?.id,
    })

    // Child Form State
    const [editingChild, setEditingChild] = useState<AcademyQuestion | "new" | null>(null)

    const parentForm = useForm<AcademyQuestionUpdateDTO | AcademyQuestionCreateDTO>({
        resolver: zodResolver(
            (isParentCreated ? academyQuestionUpdateDTOSchema : academyQuestionCreateDTOSchema) as any
        ),
        defaultValues: isParentCreated
            ? {
                stem: parent.stem || parent.content || "",
                mediaUrl: parent.mediaUrl ?? undefined,
                questionType: AcademyQuestionType.GROUP_PARENT,
                level: parent.level ?? undefined,
                categoryType: (parent as any).categoryType ?? AcademyQuestionCategoryType.GRAMMAR,
            }
            : {
                stem: "",
                mediaUrl: undefined,
                questionType: AcademyQuestionType.GROUP_PARENT,
                level: "N5",
                categoryType: AcademyQuestionCategoryType.GRAMMAR,
            },
    })

    const onParentSubmit = async (data: any) => {
        try {
            const mappedData = { ...data, stem: data.content }
            if (isParentCreated) {
                const result = await update.mutateAsync({ id: parent.id, dto: mappedData })
                setParent(result)
                toast.success("Đã cập nhật đoạn văn")
            } else {
                const result = await create.mutateAsync({ ...mappedData, questionType: AcademyQuestionType.GROUP_PARENT })
                setParent(result)
                toast.success("Đã tạo câu hỏi cha. Bây giờ hãy thêm câu hỏi con.")
            }
        } catch (e) {
            toast.error("Lưu thất bại")
        }
    }

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    const currentParentValues = parentForm.watch()

    return (
        <div className="grid gap-6 lg:grid-cols-12">
            {/* Cấu hình Parent (Left) */}
            <div className="lg:col-span-12 xl:col-span-7">
                <Card className="shadow-sm border-primary/10">
                    <CardHeader className="bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <BookOpen className="size-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Cấu hình Đoạn văn / Ngữ cảnh</CardTitle>
                                <CardDescription>
                                    Đây là phần nội dung chung (Audio, Passage) cho các câu hỏi con.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={parentForm.handleSubmit(onParentSubmit)} className="space-y-6">
                            <QuestionFormLayout
                                form={parentForm}
                                isEdit={isParentCreated}
                                hideParentPicker
                                hideQuestionTypeField
                                lockQuestionType
                            />
                            <div className="flex justify-between items-center pt-6 border-t font-semibold">
                                <div className="flex gap-2">
                                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline">
                                                <Eye className="mr-2 size-4" />
                                                Xem trước toàn bộ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                                            <DialogHeader>
                                                <DialogTitle>Xem trước Đoạn văn & Câu con</DialogTitle>
                                            </DialogHeader>
                                            <ScrollArea className="max-h-[80vh] pr-4">
                                                <QuestionPreview
                                                    content={currentParentValues.stem || ""}
                                                    questionType={AcademyQuestionType.GROUP_PARENT}
                                                    childrenQuestions={children.map(c => ({
                                                        ...c,
                                                        content: c.stem || c.content || ""
                                                    })) as any}
                                                />
                                            </ScrollArea>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={onCancel}
                                    >
                                        Huỷ
                                    </Button>
                                    <Button type="submit" disabled={create.isPending || update.isPending} className="min-w-[140px]">
                                        <Save className="mr-2 size-4" />
                                        {isParentCreated ? "Lưu thay đổi" : "Lưu & Tiếp tục"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Quản lý Children (Right) */}
            <div className="lg:col-span-12 xl:col-span-5">
                <Card className="h-full shadow-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg">
                                    <Layers className="size-5 text-secondary-foreground" />
                                </div>
                                <div>
                                    <CardTitle>Câu hỏi con</CardTitle>
                                    <CardDescription>
                                        {children.length} câu hỏi đã thêm.
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setEditingChild("new")}
                                disabled={!isParentCreated}
                                className="shadow-sm transition-all hover:scale-105"
                            >
                                <Plus className="mr-2 size-4" />
                                Thêm câu hỏi
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!isParentCreated ? (
                            <div className="py-12 text-center space-y-3 bg-muted/20 rounded-xl border border-dashed">
                                <p className="text-muted-foreground italic">Vui lòng tạo câu hỏi cha trước để quản lý câu hỏi con.</p>
                            </div>
                        ) : children.length === 0 ? (
                            <div className="py-12 text-center space-y-4 bg-muted/20 rounded-xl border border-dashed">
                                <p className="text-muted-foreground italic">Chưa có câu hỏi con nào cho nhóm này.</p>
                                <Button variant="outline" size="sm" onClick={() => setEditingChild("new")}>
                                    Bắt đầu tạo câu hỏi đầu tiên
                                </Button>
                            </div>
                        ) : (
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-3">
                                    {children.map((child, idx) => (
                                        <div
                                            key={child.id}
                                            className="group p-4 rounded-xl border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                            onClick={() => setEditingChild(child)}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-2 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="bg-primary/5 text-[10px] font-bold">CÂU {idx + 1}</Badge>
                                                        <Badge variant="secondary" className="text-[10px]">{child.questionType}</Badge>
                                                    </div>
                                                    <p className="text-sm font-medium line-clamp-2 leading-relaxed">
                                                        {stripHtml(child.stem || child.content || "") || "Trống"}
                                                    </p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="size-8">
                                                        <Edit2 className="size-4 text-muted-foreground" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Child Creation/Edit Sheet */}
            <Sheet open={!!editingChild} onOpenChange={(open) => !open && setEditingChild(null)}>
                <SheetContent side="right" className="!w-full sm:!max-w-[800px] h-full p-0 flex flex-col">
                    <SheetHeader className="p-6 border-b bg-muted/30">
                        <SheetTitle>
                            {editingChild === "new" ? "Thêm câu hỏi con" : "Chỉnh sửa câu hỏi con"}
                        </SheetTitle>
                        <SheetDescription>
                            Thiết lập nội dung và đáp án cho câu con. Kế thừa Level: <b>{parent?.level}</b>.
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-6">
                            {editingChild && (
                                <SingleQuestionFlow
                                    mode={editingChild === "new" ? "create" : "edit"}
                                    initial={editingChild === "new" ? undefined : editingChild}
                                    parentId={parent?.id}
                                    fixedLevel={parent?.level || undefined}
                                    hideQuestionTypeField={true}
                                    onSuccess={() => {
                                        refetchChildren()
                                        setEditingChild(null)
                                    }}
                                    onCancel={() => setEditingChild(null)}
                                />
                            )}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    )
}
