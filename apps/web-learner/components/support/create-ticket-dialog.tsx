'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import {
    Field,
    FieldLabel,
} from '@workspace/ui/components/field';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import { TicketType } from '@workspace/schemas';
import { useCreateTicket } from '@/lib/api/services/ticket-api';
import { useMyEnrollments } from '@/lib/api/services/academy-enrollment-api';
import { toast } from 'sonner';
import { Spinner } from '@workspace/ui/components/spinner';

const createTicketSchema = z.object({
    type: z.nativeEnum(TicketType),
    subject: z.string().min(5, 'Tiêu đề phải ít nhất 5 ký tự'),
    description: z.string().min(10, 'Nội dung phải ít nhất 10 ký tự'),
    /** UUID enrollment (bảng Enrollment), không phải course profile. */
    enrollmentId: z.string().optional(),
}).refine((data) => {
    if (data.type === TicketType.REFUND && !data.enrollmentId) {
        return false;
    }
    return true;
}, {
    message: "Vui lòng chọn khóa học cần hoàn tiền",
    path: ["enrollmentId"],
});

type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

interface CreateTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
    const createTicketMutation = useCreateTicket();
    const { data: enrollmentsData, isLoading: isLoadingEnrollments } = useMyEnrollments({ page: 1, limit: 100 });
    const enrollments = enrollmentsData?.data || [];

    const form = useForm<CreateTicketFormValues>({
        resolver: zodResolver(createTicketSchema),
        defaultValues: {
            type: TicketType.SUPPORT,
            subject: '',
            description: '',
            enrollmentId: '',
        },
    });

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = form;

    const selectedType = watch('type');

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open, reset]);

    const onSubmit = async (values: CreateTicketFormValues) => {
        try {
            const selectedEnrollment = (enrollments as any[]).find(
                (en: any) => en.id === values.enrollmentId,
            );
            const selectedLiveClassId = selectedEnrollment?.liveClassId ?? undefined;
            const selectedVodPackageId = selectedEnrollment?.vodPackageId ?? undefined;

            await createTicketMutation.mutateAsync({
                type: values.type,
                subject: values.subject,
                description: values.description,
                liveClassId: selectedLiveClassId,
                vodPackageId: selectedVodPackageId,
                // OrderId is now auto-resolved by backend, so we don't strictly need to pass it
                metadata: {
                    courseTitle: selectedEnrollment?.class?.name || selectedEnrollment?.courseTitle,
                    enrolledAt: selectedEnrollment?.enrolledAt,
                },
            });
            toast.success('Yêu cầu của bạn đã được gửi thành công.');
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-full max-h-[600px] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle>Gửi yêu cầu hỗ trợ</DialogTitle>
                    <DialogDescription>
                        Vui lòng điền thông tin để chúng tôi có thể hỗ trợ bạn tốt nhất.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-6 space-y-4">
                            <Field>
                                <FieldLabel>Loại yêu cầu</FieldLabel>
                                <Select
                                    value={selectedType}
                                    onValueChange={(val) => setValue('type', val as TicketType)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại yêu cầu" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={TicketType.SUPPORT}>Hỗ trợ hệ thống</SelectItem>
                                        <SelectItem value={TicketType.REFUND}>Yêu cầu hoàn tiền</SelectItem>
                                        <SelectItem value={TicketType.ERROR_REPORT}>Báo lỗi ứng dụng</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                            </Field>

                            <Field>
                                <FieldLabel>Tiêu đề</FieldLabel>
                                <Input
                                    {...register('subject')}
                                    placeholder="VD: Không vào được bài học..."
                                />
                                {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
                            </Field>

                            {selectedType === TicketType.REFUND && (
                                <Field>
                                    <FieldLabel>Khóa học hoàn tiền</FieldLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            setValue('enrollmentId', val);
                                            const en = (enrollments as any[]).find(
                                                (e: any) => e.id === val,
                                            );
                                            if (en) {
                                                setValue('subject', `Hoàn tiền khóa học: ${en.class?.name || en.courseTitle}`);
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={isLoadingEnrollments ? "Đang tải..." : "Chọn khóa học"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {enrollments.map((en: any) => (
                                                <SelectItem
                                                    key={en.id}
                                                    value={en.id}
                                                >
                                                    {en.class?.name || en.courseTitle || 'Khóa học không tên'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.enrollmentId && <p className="text-xs text-destructive">{errors.enrollmentId.message}</p>}
                                </Field>
                            )}

                            <Field>
                                <FieldLabel>Mô tả chi tiết</FieldLabel>
                                <Textarea
                                    {...register('description')}
                                    placeholder="Nội dung yêu cầu của bạn..."
                                    className="h-[150px] field-sizing-fixed overflow-y-auto resize-none"
                                />
                                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                            </Field>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="m-0 p-6 border-t bg-muted/20 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={createTicketMutation.isPending}>
                            {createTicketMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
                            Gửi yêu cầu
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
