import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
    createPointRewardDTOSchema,
    type CreatePointRewardDTO,
} from "@workspace/schemas"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldDescription,
    FieldSet,
    FieldLegend,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { Switch } from "@workspace/ui/components/switch"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { useCreateReward } from "@/lib/api/services/gamification"
import { Star, Gift, Ticket, HelpCircle } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"

interface CreateRewardSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateRewardSheet({ open, onOpenChange }: CreateRewardSheetProps) {
    const createMutation = useCreateReward()

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        control,
        watch,
        formState: { errors, isDirty },
    } = useForm<CreatePointRewardDTO>({
        resolver: zodResolver(createPointRewardDTOSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            costPoints: 100,
            type: "COUPON",
            config: {
                discountType: "PERCENTAGE",
                discountValue: 10,
                maxDiscountAmount: null,
                minOrderValue: null,
                validDays: 30,
            },
            isActive: true,
        },
    })

    const discountType = watch("config.discountType")

    const handleClose = () => {
        if (!createMutation.isPending) {
            onOpenChange(false)
            reset()
        }
    }

    const onSubmit = (data: CreatePointRewardDTO) => {
        try {
            createMutation.mutateAsync(data)
            toast.success("Đã tạo mẫu phần thưởng mới")
            handleClose()
        } catch (error: any) {
            toast.error(error.message || "Không thể tạo phần thưởng")
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="!w-full sm:!max-w-[800px] max-h-screen p-0 flex flex-col overflow-hidden">
                <SheetHeader className="p-6 border-b shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        Tạo mẫu phần thưởng mới
                    </SheetTitle>
                    <div className="flex items-center justify-between gap-4">
                        <SheetDescription>
                            Thiết lập thông tin phần thưởng để người dùng dùng điểm XP quy đổi.
                        </SheetDescription>
                        
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 shrink-0">
                                        <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="end" className="w-80 p-0 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 shadow-xl z-[100] overflow-hidden">
                                    <div className="p-4 flex flex-col items-stretch gap-3 text-left">
                                        <h4 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-400 border-b border-amber-200/50 pb-2">
                                            <Star className="h-4 w-4 fill-amber-500" />
                                            Hướng dẫn quy đổi (Tham khảo)
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-sm text-amber-900/90 dark:text-amber-100">
                                                <span className="font-medium">1,000 Points</span>
                                                <span className="text-amber-600 dark:text-amber-400">≈ 10,000 VND</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-amber-900/90 dark:text-amber-100">
                                                <span className="font-medium">5,000 Points</span>
                                                <span className="text-amber-600 dark:text-amber-400">≈ 50,000 VND</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-amber-900/90 dark:text-amber-100">
                                                <span className="font-medium">10,000 Points</span>
                                                <span className="text-amber-600 dark:text-amber-400">≈ 100,000 VND</span>
                                            </div>
                                        </div>
                                        <div className="mt-1 pt-2 border-t border-amber-200/50">
                                            <p className="text-[11px] leading-relaxed text-amber-700/80 dark:text-amber-500/80 italic">
                                                * Lưu ý: Tỷ lệ 10:1 (1 pt = 10đ) là ngưỡng an toàn để tránh bù lỗ cho hệ thống.
                                            </p>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </SheetHeader>

                <form id="create-reward-form" onSubmit={handleSubmit(onSubmit as any)} className="flex flex-col flex-1 overflow-hidden" noValidate>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="space-y-6 p-6">
                            <FieldGroup>
                                <FieldSet>
                                    <FieldLegend>Thông tin cơ bản</FieldLegend>
                                    <Field>
                                        <FieldLabel>Tên phần thưởng</FieldLabel>
                                        <Input
                                            placeholder="Ví dụ: Giảm giá 50k cho khóa học N3"
                                            {...register("name")}
                                        />
                                        {errors.name && <FieldDescription className="text-destructive">{errors.name.message}</FieldDescription>}
                                    </Field>
                                    <Field>
                                        <FieldLabel>Mô tả (không bắt buộc)</FieldLabel>
                                        <Textarea
                                            placeholder="Chi tiết về phần thưởng..."
                                            className="min-h-[100px]"
                                            {...register("description")}
                                        />
                                    </Field>
                                </FieldSet>

                                <FieldSet>
                                    <FieldLegend>Cấu hình quy đổi</FieldLegend>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel className="flex items-center gap-1.5">
                                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                                Số điểm cần đổi (XP)
                                            </FieldLabel>
                                            <Input
                                                type="number"
                                                {...register("costPoints", { valueAsNumber: true })}
                                            />
                                            {errors.costPoints && <FieldDescription className="text-destructive">{errors.costPoints.message}</FieldDescription>}
                                        </Field>
                                        <Field>
                                            <FieldLabel>Thời hạn sử dụng (ngày)</FieldLabel>
                                            <Input
                                                type="number"
                                                {...register("config.validDays", { valueAsNumber: true })}
                                            />
                                            <FieldDescription>Kể từ lúc người dùng nhấn đổi quà.</FieldDescription>
                                        </Field>
                                    </div>
                                </FieldSet>

                                <FieldSet>
                                    <FieldLegend>Cấu hình Coupon sinh ra</FieldLegend>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel>Loại giảm giá</FieldLabel>
                                            <Controller
                                                name="config.discountType"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="PERCENTAGE">Theo phần trăm (%)</SelectItem>
                                                            <SelectItem value="FIXED_AMOUNT">Số tiền cố định (VND)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel>Giá trị giảm</FieldLabel>
                                            <Input
                                                type="number"
                                                {...register("config.discountValue", { valueAsNumber: true })}
                                            />
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {discountType === "PERCENTAGE" && (
                                            <Field>
                                                <FieldLabel>Giảm tối đa (không bắt buộc)</FieldLabel>
                                                <Input
                                                    type="number"
                                                    placeholder="Ví dụ: 200000"
                                                    {...register("config.maxDiscountAmount", { valueAsNumber: true })}
                                                />
                                                <FieldDescription>Chỉ áp dụng cho loại phần trăm.</FieldDescription>
                                            </Field>
                                        )}
                                        <Field className={discountType === "PERCENTAGE" ? "" : "col-span-2"}>
                                            <FieldLabel>Đơn hàng tối thiểu</FieldLabel>
                                            <Input
                                                type="number"
                                                placeholder="Ví dụ: 500000"
                                                {...register("config.minOrderValue", { valueAsNumber: true })}
                                            />
                                        </Field>
                                    </div>
                                </FieldSet>

                                <FieldSet>
                                    <Field orientation="horizontal" className="justify-between items-center bg-muted/30 p-4 rounded-lg">
                                        <div className="space-y-0.5">
                                            <FieldLabel>Đang hoạt động</FieldLabel>
                                            <FieldDescription>Người dùng có thể nhìn thấy và đổi quà này.</FieldDescription>
                                        </div>
                                        <Switch
                                            defaultChecked
                                            onCheckedChange={(val) => setValue("isActive", val, { shouldDirty: true })}
                                        />
                                    </Field>
                                </FieldSet>
                            </FieldGroup>
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
                                    Tạo phần thưởng
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
