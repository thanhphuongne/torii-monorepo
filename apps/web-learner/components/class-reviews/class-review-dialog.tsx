import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { academyCourseReviewCreateDTOSchema } from "@workspace/schemas"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { StarIcon } from "lucide-react"
import { toast } from "@workspace/ui/components/sonner"
import { academyClassReviewHooks } from "@/lib/api/services/academy-class-reviews"
import { Switch } from "@workspace/ui/components/switch"

export function ClassReviewDialog({
    isOpen,
    setIsOpen,
    targetId,
    enrollmentId,
    courseTitle,
    existingReview,
}: {
    isOpen: boolean
    setIsOpen: (o: boolean) => void
    targetId: string
    enrollmentId: string
    courseTitle: string
    existingReview?: any
}) {
    const createMutation = academyClassReviewHooks.useCreateReview()
    const updateMutation = academyClassReviewHooks.useUpdateReview()
    const deleteMutation = academyClassReviewHooks.useDeleteReview()
    const [hoverRating, setHoverRating] = useState(0)

    const form = useForm({
        resolver: zodResolver(academyCourseReviewCreateDTOSchema),
        defaultValues: {
            enrollmentId: enrollmentId,
            rating: existingReview?.rating || 5,
            title: existingReview?.title || "",
            content: existingReview?.content || "",
            isAnonymous: existingReview?.isAnonymous || false,
        },
    })

    // Update form if existing review changes
    useEffect(() => {
        if (existingReview && isOpen) {
            form.reset({
                enrollmentId: enrollmentId,
                rating: existingReview.rating,
                title: existingReview.title || "",
                content: existingReview.content || "",
                isAnonymous: existingReview.isAnonymous || false,
            })
        } else if (isOpen) {
            form.reset({
                enrollmentId: enrollmentId,
                rating: 5,
                title: "",
                content: "",
                isAnonymous: false,
            })
        }
    }, [existingReview, isOpen, enrollmentId, form])

    const onSubmit = async (data: any) => {
        try {
            if (existingReview) {
                await updateMutation.mutateAsync({ id: existingReview.id, dto: data })
                toast.success("Đã cập nhật đánh giá thành công!")
            } else {
                await createMutation.mutateAsync({ targetId, dto: data })
                toast.success("Cảm ơn bạn đã gửi đánh giá! Bạn nhận được 50 điểm.")
            }
            setIsOpen(false)
        } catch (error: any) {
            toast.error(error?.userMessage || "Có lỗi xảy ra khi gửi đánh giá.")
        }
    }

    const handleDelete = async () => {
        if (!existingReview) return
        if (!window.confirm("Bạn có chắc chắn muốn xóa đánh giá này?")) return

        try {
            await deleteMutation.mutateAsync(existingReview.id)
            toast.success("Đã xóa đánh giá thành công!")
            setIsOpen(false)
        } catch (error: any) {
            toast.error(error?.userMessage || "Có lỗi xảy ra khi xóa đánh giá.")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{existingReview ? "Sửa Đánh giá" : "Đánh giá Khóa học"}</DialogTitle>
                    <DialogDescription>
                        {courseTitle}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-2">
                    <FieldGroup>
                        {/* Rating Field */}
                        <Field className="flex flex-col items-center">
                            <FieldLabel className="text-base text-zinc-600 mb-2">Đánh giá sao</FieldLabel>
                            <Controller
                                control={form.control}
                                name="rating"
                                render={({ field }) => (
                                    <div className="flex text-yellow-500 gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <StarIcon
                                                key={i}
                                                className={`size-8 cursor-pointer transition-colors ${i < (hoverRating || field.value) ? "fill-current" : "text-zinc-200"
                                                    }`}
                                                onMouseEnter={() => setHoverRating(i + 1)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => field.onChange(i + 1)}
                                            />
                                        ))}
                                    </div>
                                )}
                            />
                            {form.formState.errors.rating && (
                                <span className="text-sm font-medium text-destructive mt-2">
                                    {form.formState.errors.rating.message}
                                </span>
                            )}
                        </Field>

                        {/* Title Field */}
                        <Field>
                            <FieldLabel htmlFor="title">Tiêu đề (Tùy chọn)</FieldLabel>
                            <Input
                                id="title"
                                placeholder="Tóm tắt ngắn gọn đánh giá của bạn"
                                {...form.register("title")}
                            />
                            {form.formState.errors.title && (
                                <span className="text-sm font-medium text-destructive">
                                    {form.formState.errors.title.message}
                                </span>
                            )}
                        </Field>

                        {/* Content Field */}
                        <Field>
                            <FieldLabel htmlFor="content">Nhận xét chi tiết</FieldLabel>
                            <Textarea
                                id="content"
                                placeholder="Trải nghiệm của bạn với khóa học này thế nào?"
                                className="resize-none h-28"
                                {...form.register("content")}
                            />
                            {form.formState.errors.content && (
                                <span className="text-sm font-medium text-destructive">
                                    {form.formState.errors.content.message}
                                </span>
                            )}
                        </Field>

                        {/* Switch Field */}
                        <Field className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-zinc-50/50">
                            <div className="space-y-0.5">
                                <FieldLabel>Ẩn danh</FieldLabel>
                                <FieldDescription>
                                    Giấu tên và avatar của bạn khi hiển thị đánh giá công khai.
                                </FieldDescription>
                            </div>
                            <Controller
                                control={form.control}
                                name="isAnonymous"
                                render={({ field }) => (
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </Field>
                    </FieldGroup>

                    <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-between">
                        {existingReview ? (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending || updateMutation.isPending}
                                className="w-full sm:w-auto mt-2 sm:mt-0 order-first"
                            >
                                {deleteMutation.isPending ? "Đang xóa..." : "Xóa đánh giá"}
                            </Button>
                        ) : (
                            <div />
                        )}
                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? "Đang gửi..." : "Gửi đánh giá"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
