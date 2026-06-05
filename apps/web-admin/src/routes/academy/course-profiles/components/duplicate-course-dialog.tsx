import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Copy, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { type AcademyCourseProfile, academyCourseProfilesApi } from '@/lib/api/services/academy-course-profiles';
import { useQueryClient } from '@tanstack/react-query';

const duplicateSchema = z.object({
  newCode: z.string().min(2, "Mã khóa học mới phải có ít nhất 2 ký tự"),
  newTitle: z.string().min(2, "Tên khóa học mới không được để trống"),
});

type DuplicateFormValues = z.infer<typeof duplicateSchema>;

interface DuplicateCourseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profile: AcademyCourseProfile | null;
}

export function DuplicateCourseDialog({ open, onOpenChange, profile }: DuplicateCourseDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const qc = useQueryClient();

    const form = useForm<DuplicateFormValues>({
        resolver: zodResolver(duplicateSchema),
        defaultValues: {
            newCode: '',
            newTitle: '',
        },
    });

    useEffect(() => {
        if (profile) {
            form.reset({
                newCode: `${profile.code}-${new Date().getFullYear()}`,
                newTitle: `${profile.title} (${new Date().getFullYear()})`,
            });
        }
    }, [profile, form]);

    const onSubmit = async (data: DuplicateFormValues) => {
        if (!profile) return;
        
        setIsSubmitting(true);
        try {
            await academyCourseProfilesApi.duplicate(profile.id, data);
            toast.success("Đã nhân bản hồ sơ khóa học thành công.");
            qc.invalidateQueries({ queryKey: ["academy-course-profiles"] });
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Không thể nhân bản khóa học.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Copy className="size-5 text-primary" />
                    </div>
                    <DialogTitle>Nhân bản hồ sơ khóa học</DialogTitle>
                    <DialogDescription>
                        Tạo ra một bản sao toàn bộ mô-đun và bài học của khóa "{profile?.title}". Hữu ích cho việc tạo chương trình năm học mới.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/30 p-4 rounded-lg flex gap-3 text-xs text-muted-foreground border mb-4">
                  <AlertCircle className="size-4 shrink-0 text-primary" />
                  <p>Hành động này sẽ sao chép toàn bộ cấu trúc bài giảng. Các dữ liệu về học viên và lớp học sẽ không bị sao chép.</p>
                </div>

                <FieldGroup>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <Controller
                            name="newCode"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel>Mã khóa học mới</FieldLabel>
                                    <Input placeholder="VD: N5-2025" {...field} className="font-mono uppercase" />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        <Controller
                            name="newTitle"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel>Tên khóa học mới</FieldLabel>
                                    <Input placeholder="VD: Khóa học N5 - Năm 2025" {...field} />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => onOpenChange(false)}
                              className="gap-2 border-slate-500/30 text-slate-700 bg-transparent hover:bg-slate-50 hover:text-slate-700"
                            >
                              <X className="size-4" />
                              Hủy
                            </Button>
                            <Button
                              type="submit"
                              disabled={isSubmitting}
                              variant="outline"
                              className="gap-2 border-blue-500/30 text-blue-700 bg-transparent hover:bg-blue-50 hover:text-blue-700 font-bold"
                            >
                                <Copy className="size-4" />
                                {isSubmitting ? "Đang nhân bản..." : "Bắt đầu nhân bản"}
                            </Button>
                        </DialogFooter>
                    </form>
                </FieldGroup>
            </DialogContent>
        </Dialog>
    );
}
