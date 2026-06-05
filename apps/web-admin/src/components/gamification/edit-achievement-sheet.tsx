import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@workspace/ui/components/sheet";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldDescription,
    FieldSet,
    FieldLegend,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@workspace/ui/components/tooltip";

import { useUpdateAchievement } from "@/lib/api/services/gamification";
import { Trophy, Star, HelpCircle, Upload, Loader2 } from "lucide-react";
import { storageApi } from "@/lib/api/services/storage-api";
import { useState } from "react";
import type { AchievementDTO } from "@workspace/schemas";

const achievementTypes = [
    { value: 'STREAK_DAYS', label: 'Chuỗi ngày học tập' },
    { value: 'LONGEST_STREAK', label: 'Kỷ lục chuỗi ngày' },
    { value: 'LOGIN_DAYS', label: 'Tổng số ngày đăng nhập' },
    { value: 'LESSONS_COMPLETED', label: 'Bài học hoàn thành' },
    { value: 'EXAM_PASSED_COUNT', label: 'Số bài thi đã đỗ' },
    { value: 'EXAM_ATTEMPT_COUNT', label: 'Số lần thi' },
    { value: 'POINTS_EARNED_TOTAL', label: 'Tổng điểm tích lũy' },
    { value: 'LEVEL_REACHED', label: 'Cấp độ đạt được' },
    { value: 'REVIEWS_PUBLISHED', label: 'Số lượt đánh giá khóa học' },
    { value: 'CUSTOM', label: 'Tùy chỉnh / Khác' },
];

const categories = ['STREAK', 'CONSISTENCY', 'LEARNING_PROGRESS', 'MASTERY', 'SOCIAL', 'RECOVERY'];

const formSchema = z.object({
    code: z.string().min(3).max(50),
    title: z.string().min(3).max(100),
    description: z.string().min(5),
    category: z.string(),
    icon: z.string(),
    requirements: z.object({
        type: z.string(),
        value: z.number().min(1).optional().default(1),
    }),
    rewards: z.object({
        points: z.number().min(1, "Phần thưởng (XP) phải lớn hơn 0"),
    }),
    isActive: z.boolean(),
    orderIndex: z.number(),
});

type AchievementFormValues = z.infer<typeof formSchema>;

export function EditAchievementSheet({
    open,
    onOpenChange,
    achievement
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    achievement: AchievementDTO;
}) {
    const { mutate: updateAchievement, isPending } = useUpdateAchievement();
    const [isUploading, setIsUploading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors, isDirty },
    } = useForm<AchievementFormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            code: achievement.code,
            title: achievement.title,
            description: achievement.description,
            category: achievement.category,
            icon: achievement.icon || "",
            requirements: {
                type: (achievement.requirements as any)?.type || "STREAK_DAYS",
                value: (achievement.requirements as any)?.value || 1,
            },
            rewards: {
                points: (achievement.rewards as any)?.points || 0,
            },
            isActive: achievement.isActive,
            orderIndex: achievement.orderIndex || 0,
        },
    });

    // Update form when achievement changes
    useEffect(() => {
        if (achievement && open) {
            reset({
                code: achievement.code,
                title: achievement.title,
                description: achievement.description,
                category: achievement.category,
                icon: achievement.icon || "",
                requirements: {
                    type: (achievement.requirements as any)?.type || "STREAK_DAYS",
                    value: (achievement.requirements as any)?.value || 1,
                },
                rewards: {
                    points: (achievement.rewards as any)?.points || 0,
                },
                isActive: achievement.isActive,
                orderIndex: achievement.orderIndex || 0,
            });
        }
    }, [achievement, open, reset]);

    const category = watch("category");
    const icon = watch("icon");
    const reqType = watch("requirements.type");
    const needsValue = reqType !== 'CUSTOM';

    const onSubmit: SubmitHandler<AchievementFormValues> = (values) => {
        updateAchievement({ id: achievement.id, data: values }, {
            onSuccess: () => {
                toast.success("Đã cập nhật thành tích!");
                onOpenChange(false);
            },
            onError: (error: any) => {
                toast.error("Không thể cập nhật: " + error.message);
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="!w-full sm:!max-w-[800px] max-h-screen p-0 flex flex-col overflow-hidden">
                <SheetHeader className="p-6 border-b shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Chỉnh sửa Thành tích
                    </SheetTitle>
                    <div className="flex items-center justify-between gap-4">
                        <SheetDescription>
                            Cập nhật thông tin và điều kiện cho thành tích này.
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

                <form id="edit-achievement-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden" noValidate>
                    <ScrollArea className="flex-1 min-h-0">
                        <div className="p-6">
                            <FieldGroup className="space-y-6">
                                <FieldSet>
                                    <FieldLegend>Thông tin cơ bản</FieldLegend>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel>Tên thành tích</FieldLabel>
                                            <Input {...register("title")} />
                                            {errors.title && <FieldDescription className="text-destructive">{errors.title.message}</FieldDescription>}
                                        </Field>
                                        <Field>
                                            <FieldLabel>Mã</FieldLabel>
                                            <Input {...register("code")} />
                                            {errors.code && <FieldDescription className="text-destructive">{errors.code.message}</FieldDescription>}
                                        </Field>
                                    </div>

                                    <Field>
                                        <FieldLabel>Mô tả</FieldLabel>
                                        <Textarea {...register("description")} />
                                        {errors.description && <FieldDescription className="text-destructive">{errors.description.message}</FieldDescription>}
                                    </Field>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel>Phân loại</FieldLabel>
                                            <Select value={category} onValueChange={(val) => setValue("category", val, { shouldDirty: true })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field className="col-span-full">
                                            <FieldLabel>Icon thành tích</FieldLabel>
                                            <div className="space-y-4">
                                                {/* Upload Area */}
                                                <div 
                                                    onClick={() => {
                                                        if (isUploading) return;
                                                        const input = document.createElement("input");
                                                        input.type = "file";
                                                        input.accept = "image/*";
                                                        input.onchange = async (e) => {
                                                            const file = (e.target as HTMLInputElement).files?.[0];
                                                            if (file) {
                                                                setIsUploading(true);
                                                                try {
                                                                    const res = await storageApi.uploadFile(file, "gamification");
                                                                    setValue("icon", res.fileUrl, { shouldDirty: true });
                                                                    toast.success("Đã tải lên icon mới!");
                                                                } catch (err: any) {
                                                                    toast.error("Tải lên thất bại: " + err.message);
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                            }
                                                        };
                                                        input.click();
                                                    }}
                                                    className={`
                                                        relative cursor-pointer group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed transition-all
                                                        ${icon ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20 bg-muted/20 hover:border-primary/50 hover:bg-primary/5'}
                                                        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                                >
                                                    {isUploading ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                                            <p className="text-sm font-medium animate-pulse">Đang tải lên...</p>
                                                        </div>
                                                    ) : icon ? (
                                                        <div className="relative w-32 h-32 flex items-center justify-center p-2 bg-background rounded-xl shadow-lg border">
                                                            <img src={icon} alt="Achievement Icon" className="w-full h-full object-contain" />
                                                            <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Upload className="h-6 w-6 text-white" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3 text-center">
                                                            <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                                                <Upload className="h-8 w-8" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-lg">Tải lên icon thành tích</p>
                                                                <p className="text-sm text-muted-foreground">Click để chọn file ảnh (PNG, JPG)...</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Selected URL Input (Hidden or Read-only) */}
                                                {icon && (
                                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-1">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-mono text-muted-foreground truncate">{icon}</p>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="xs" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setValue("icon", "", { shouldDirty: true });
                                                            }}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            Gỡ bỏ
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            {errors.icon && <FieldDescription className="text-destructive mt-1">Vui lòng tải lên icon cho thành tích</FieldDescription>}
                                        </Field>
                                    </div>
                                </FieldSet>

                                <FieldSet className="rounded-lg border p-4 bg-muted/30">
                                    <FieldLegend>Điều kiện đạt được</FieldLegend>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel>Loại chỉ số</FieldLabel>
                                            <Select value={reqType} onValueChange={(val) => setValue("requirements.type", val, { shouldDirty: true })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {achievementTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        {needsValue && (
                                            <Field>
                                                <FieldLabel>Giá trị cần đạt</FieldLabel>
                                                <Input type="number" {...register("requirements.value", { valueAsNumber: true })} />
                                                {errors.requirements?.value && <FieldDescription className="text-destructive">{errors.requirements.value.message}</FieldDescription>}
                                            </Field>
                                        )}
                                    </div>
                                </FieldSet>

                                <FieldSet>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel className="flex items-center gap-1.5">
                                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                                Phần thưởng (XP)
                                            </FieldLabel>
                                            <Input type="number" {...register("rewards.points", { valueAsNumber: true })} />
                                            {errors.rewards?.points && <FieldDescription className="text-destructive">{errors.rewards.points.message}</FieldDescription>}
                                        </Field>
                                        <Field>
                                            <FieldLabel>Thứ tự hiển thị</FieldLabel>
                                            <Input type="number" {...register("orderIndex", { valueAsNumber: true })} />
                                        </Field>
                                    </div>

                                    <Field orientation="horizontal" className="justify-between items-center bg-muted/20 p-4 rounded-lg mt-4">
                                        <div className="space-y-0.5">
                                            <FieldLabel>Đang hoạt động</FieldLabel>
                                            <FieldDescription>Học viên có thể đạt được thành tích này.</FieldDescription>
                                        </div>
                                            <Switch
                                                checked={watch("isActive")}
                                                onCheckedChange={(val) => setValue("isActive", val, { shouldDirty: true })}
                                            />
                                    </Field>
                                </FieldSet>
                            </FieldGroup>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t flex justify-end gap-3 bg-muted/20 shrink-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Hủy</Button>
                        <Button type="submit" disabled={isPending || !isDirty}>
                            {isPending ? "Đang cập nhật..." : "Cập nhật"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
