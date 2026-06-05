'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@workspace/ui/components/button"
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { useEffect } from "react"
import { Spinner } from "@workspace/ui/components/spinner"

const profileFormSchema = z.object({
    displayName: z.string().min(2, {
        message: "Tên hiển thị phải có ít nhất 2 ký tự.",
    }),
    phone: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
    dateOfBirth: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface EditProfileDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData: {
        displayName: string
        phone: string
        bio: string
        location: string
        dateOfBirth: string
    }
    onSubmit: (data: ProfileFormValues) => void
    isSubmitting: boolean
}

export function EditProfileDialog({
    open,
    onOpenChange,
    initialData,
    onSubmit,
    isSubmitting,
}: EditProfileDialogProps) {
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: initialData,
    })

    useEffect(() => {
        if (open) {
            form.reset(initialData)
        }
    }, [open, initialData, form])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin cá nhân của bạn.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh]">
                    <div className="p-6 space-y-8">
                        <form id="profile-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FieldGroup>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <FieldLabel>Tên hiển thị</FieldLabel>
                                        <Input {...form.register("displayName")} />
                                        {form.formState.errors.displayName && (
                                            <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <FieldLabel>Số điện thoại</FieldLabel>
                                            <Input {...form.register("phone")} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel>Ngày sinh</FieldLabel>
                                            <Input type="date" className="w-full min-w-0 appearance-none h-10" {...form.register("dateOfBirth")} />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel>Địa chỉ</FieldLabel>
                                        <Input {...form.register("location")} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel>Tiểu sử</FieldLabel>
                                        <Textarea {...form.register("bio")} className="min-h-[100px] resize-none" />
                                    </div>
                                </div>
                            </FieldGroup>
                        </form>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 border-t bg-muted/20">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button type="submit" form="profile-form" disabled={isSubmitting}>
                        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                        Lưu thay đổi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
