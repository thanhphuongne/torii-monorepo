import { useForm, Controller } from 'react-hook-form';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@workspace/ui/components/sheet';
import { ScrollArea } from '@workspace/ui/components/scroll-area';

import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import {
    Field,
    FieldLabel,
    FieldError,
} from '@workspace/ui/components/field';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { Calendar } from '@workspace/ui/components/calendar';
import { cn } from '@workspace/ui/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Ticket, CalendarIcon } from 'lucide-react';
import { toast } from '@workspace/ui/components/sonner';
import { CouponDiscountType, type CouponCreateDTO } from '@workspace/schemas';
import { useCreateCoupon } from "@/lib/api/services/coupons";
import { Spinner } from "@workspace/ui/components/spinner";

interface CreateCouponSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateCouponSheet({ open, onOpenChange }: CreateCouponSheetProps) {
    const createMutation = useCreateCoupon();

    // Default validUntil = 30 days from now
    const defaultValidUntil = new Date();
    defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isDirty },
        reset,
        watch,
        setValue,
    } = useForm<CouponCreateDTO>({
        defaultValues: {
            code: '',
            name: '',
            description: '',
            discountType: CouponDiscountType.PERCENTAGE,
            discountValue: 0,
            maxDiscountAmount: undefined,
            minOrderValue: undefined,
            usageLimit: undefined,
            perUserLimit: 1,
            startDate: new Date(),
            endDate: defaultValidUntil,
        },
    });

    const discountType = watch('discountType');
    const startDate = watch('startDate');
    const today = startOfDay(new Date());

    const handleClose = () => {
        if (!createMutation.isPending) {
            onOpenChange(false);
            reset();
        }
    };

    const onSubmit = async (data: CouponCreateDTO) => {
        try {
            await createMutation.mutateAsync({
                ...data,
                code: String(data.code || '').trim().toUpperCase(),
                discountValue: Number(data.discountValue),
                maxDiscountAmount: (data.maxDiscountAmount && !Number.isNaN(data.maxDiscountAmount)) ? Number(data.maxDiscountAmount) : undefined,
                minOrderValue: (data.minOrderValue !== undefined && data.minOrderValue !== null && !Number.isNaN(data.minOrderValue)) ? Number(data.minOrderValue) : undefined,
                usageLimit: (data.usageLimit && !Number.isNaN(data.usageLimit)) ? Number(data.usageLimit) : undefined,
                perUserLimit: Number(data.perUserLimit || 1),
                startDate: data.startDate ? startOfDay(new Date(data.startDate)) : new Date(),
                endDate: data.endDate ? endOfDay(new Date(data.endDate)) : new Date()
            });

            toast.success('Đã tạo coupon', {
                description: `Mã ${data.code} đã được tạo thành công.`,
            });
            handleClose();
        } catch (error: any) {
            const details = error?.response?.data?.errors
                ?.map((e: any) => e?.message)
                ?.filter(Boolean)
                ?.join(', ');
            toast.error(error?.userMessage || error?.response?.data?.message || 'Tạo thất bại', {
                description: details || 'Đã xảy ra lỗi khi tạo coupon. Vui lòng thử lại.',
            });
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent className="!w-full sm:!max-w-[800px] max-h-screen p-0 flex flex-col overflow-hidden">
                <SheetHeader className="p-6 border-b shrink-0">
                    <SheetTitle>Tạo Coupon Mới</SheetTitle>
                    <SheetDescription>
                        Thiết lập mã giảm giá mới cho hệ thống.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden" noValidate>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="space-y-6 p-6">

                            {/* Basic Info */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <Field>
                                        <FieldLabel htmlFor="code" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                            Mã Coupon <span className="text-destructive">*</span>
                                        </FieldLabel>
                                        <Input
                                            id="code"
                                            {...register('code', { required: 'Mã coupon là bắt buộc' })}
                                            placeholder="VD: SALE50, SUMMER2024"
                                            className="font-mono uppercase tracking-widest font-bold placeholder:normal-case"
                                        />
                                        {errors.code && <FieldError className="text-xs font-medium text-rose-500 pl-2">{errors.code.message}</FieldError>}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="name" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                            Tên Chiến Dịch <span className="text-destructive">*</span>
                                        </FieldLabel>
                                        <Input
                                            id="name"
                                            {...register('name', { required: 'Tên chiến dịch là bắt buộc' })}
                                            placeholder="VD: Siêu sale mùa hè"
                                            className=""
                                        />
                                        {errors.name && <FieldError className="text-xs font-medium text-rose-500 pl-2">{errors.name.message}</FieldError>}
                                    </Field>
                                </div>

                                <Field>
                                    <FieldLabel htmlFor="description" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                        Mô Tả
                                    </FieldLabel>
                                    <Textarea
                                        id="description"
                                        {...register('description')}
                                        placeholder="Mô tả chi tiết về mã giảm giá..."
                                        rows={3}
                                        className="rounded-xl resize-none p-4"
                                    />
                                </Field>
                            </div>

                            {/* Discount Settings */}
                            <div className="space-y-6 pt-6 border-t border-border/40">
                                <h3 className="text-[10px] font-sans font-bold italic uppercase tracking-wider text-muted-foreground/50">
                                    Thiết Lập Giảm Giá
                                </h3>

                                <div className="grid grid-cols-2 gap-6">
                                    <Field>
                                        <FieldLabel htmlFor="discountType" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                            Loại Giảm Giá
                                        </FieldLabel>
                                        <Controller
                                            name="discountType"
                                            control={control}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={CouponDiscountType.PERCENTAGE}>Theo phần trăm (%)</SelectItem>
                                                        <SelectItem value={CouponDiscountType.FIXED_AMOUNT}>Số tiền cố định (VND)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="discountValue" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                            Giá Trị Giảm <span className="text-destructive">*</span>
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input
                                                id="discountValue"
                                                type="number"
                                                min="0"
                                                max={discountType === CouponDiscountType.PERCENTAGE ? 100 : undefined}
                                                {...register('discountValue', { 
                                                    valueAsNumber: true, 
                                                    required: 'Giá trị giảm là bắt buộc', 
                                                    min: { value: 1, message: 'Giá trị giảm phải ít nhất là 1' },
                                                    max: discountType === CouponDiscountType.PERCENTAGE 
                                                        ? { value: 100, message: 'Phần trăm giảm không được vượt quá 100%' } 
                                                        : undefined
                                                })}
                                                className="font-mono font-bold"
                                            />
                                        </div>
                                        {errors.discountValue && <FieldError className="text-xs font-medium text-rose-500 pl-2">{errors.discountValue.message as string}</FieldError>}
                                    </Field>
                                </div>

                                {discountType === CouponDiscountType.PERCENTAGE && (
                                    <Field>
                                        <FieldLabel htmlFor="maxDiscountAmount" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                            Giảm Tối Đa (VND)
                                        </FieldLabel>
                                        <Input
                                            id="maxDiscountAmount"
                                            type="number"
                                            min="0"
                                            {...register('maxDiscountAmount', { valueAsNumber: true })}
                                            placeholder="Không giới hạn"
                                            className="font-mono"
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">Để trống nếu không giới hạn số tiền giảm.</p>
                                    </Field>
                                )}

                                <Field>
                                    <FieldLabel htmlFor="minOrderValue" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                        Đơn Hàng Tối Thiểu (VND)
                                    </FieldLabel>
                                    <Input
                                        id="minOrderValue"
                                        type="number"
                                        min="0"
                                        {...register('minOrderValue', { valueAsNumber: true })}
                                        placeholder="0"
                                        className="font-mono"
                                    />
                                </Field>
                            </div>

                            {/* Usage Limits */}
                            <div className="space-y-6 pt-6 border-t border-border/40">
                                <h3 className="text-[10px] font-sans font-bold italic uppercase tracking-wider text-muted-foreground/50">
                                    Giới Hạn Sử Dụng
                                </h3>

                                <div className="grid grid-cols-2 gap-6">
                                    <Field>
                                        <FieldLabel htmlFor="usageLimit" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                            Tổng Lượt Dùng
                                        </FieldLabel>
                                        <Input
                                            id="usageLimit"
                                            type="number"
                                            min="0"
                                            {...register('usageLimit', { valueAsNumber: true })}
                                            placeholder="Không giới hạn"
                                            className="font-mono"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="userUsageLimit" className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                            Lượt Dùng / User
                                        </FieldLabel>
                                        <Input
                                            id="userUsageLimit"
                                            type="number"
                                            min="1"
                                            {...register('perUserLimit', { valueAsNumber: true, min: 1 })}
                                            defaultValue={1}
                                            className="font-mono"
                                        />
                                    </Field>
                                </div>
                            </div>

                            {/* Validity Period */}
                            <div className="space-y-6 pt-6 border-t border-border/40">
                                <h3 className="text-[10px] font-sans font-bold italic uppercase tracking-wider text-muted-foreground/50">
                                    Thời Gian Hiệu Lực
                                </h3>

                                <div className="grid grid-cols-2 gap-6">
                                    <Controller
                                        control={control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <Field>
                                                <FieldLabel className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                                    Bắt Đầu
                                                </FieldLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, "PPP") : <span>Chọn ngày</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value ? new Date(field.value) : undefined}
                                                            onSelect={(date) => {
                                                                field.onChange(date);
                                                                if (date) {
                                                                    const currentEndDate = watch('endDate');
                                                                    if (currentEndDate && date > currentEndDate) {
                                                                        setValue('endDate', date, { shouldDirty: true, shouldValidate: true });
                                                                    }
                                                                }
                                                            }}
                                                            disabled={{ before: today }}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                {errors.startDate && <FieldError className="text-xs font-medium text-rose-500 pl-2">{errors.startDate.message}</FieldError>}
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        control={control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <Field>
                                                <FieldLabel className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-wide">
                                                    Kết Thúc
                                                </FieldLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, "PPP") : <span>Chọn ngày</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value ? new Date(field.value) : undefined}
                                                            onSelect={field.onChange}
                                                            disabled={{ before: startDate ? startOfDay(new Date(startDate)) : today }}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                {errors.endDate && <FieldError className="text-xs font-medium text-rose-500 pl-2">{errors.endDate.message}</FieldError>}
                                            </Field>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t flex justify-end gap-3 bg-muted/20 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={createMutation.isPending}>
                            Hủy Bỏ
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending || !isDirty}>
                            {createMutation.isPending ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Ticket className="mr-2 h-4 w-4" />
                                    Tạo Coupon
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
