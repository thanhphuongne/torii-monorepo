import * as React from "react"
import { ArrowLeft, Home, RefreshCcw } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
    code?: string | number
    title?: string
    description?: string
    actionLabel?: string
    onAction?: () => void
    onBack?: () => void
    onHome?: () => void
    showHome?: boolean
    showBack?: boolean
    variant?: "404" | "403" | "500" | "default"
}

export function ErrorState({
    code = "404",
    title = "Không tìm thấy trang",
    description = "Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển. Vui lòng quay lại trang chủ.",
    actionLabel,
    onAction,
    onBack,
    onHome,
    showHome = true,
    showBack = true,
    variant = "404",
    className,
    ...props
}: ErrorStateProps) {

    const variants = {
        "404": {
            subtitle: "Lỗi 404",
            suggestion: "Trang không tồn tại",
            color: "text-blue-500/10",
            accent: "text-blue-500"
        },
        "403": {
            subtitle: "Từ chối",
            suggestion: "Không có quyền truy cập",
            color: "text-orange-500/10",
            accent: "text-orange-500"
        },
        "500": {
            subtitle: "Lỗi hệ thống",
            suggestion: "Gặp sự cố kỹ thuật",
            color: "text-red-500/10",
            accent: "text-red-500"
        },
        "501": {
            subtitle: "Chưa khả dụng",
            suggestion: "Đang phát triển",
            color: "text-red-500/10",
            accent: "text-red-500"
        },
        "default": {
            subtitle: "Lỗi",
            suggestion: "Vui lòng thử lại",
            color: "text-primary/10",
            accent: "text-primary"
        }
    }

    const activeVariant = variants[variant] || variants.default

    return (
        <div
            className={cn(
                "relative min-h-[75vh] w-full flex flex-col items-center justify-center p-6 text-center bg-background",
                className
            )}
            {...props}
        >
            <div className="max-w-md w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Large Prominent Error Code */}
                <div className="space-y-4">
                    <h1 className={cn("text-[10rem] md:text-[12rem] font-bold tracking-tighter leading-none select-none", activeVariant.color)}>
                        {code}
                    </h1>
                    <div className="space-y-2">
                        <p className={cn("text-xs font-bold tracking-[0.3em] uppercase opacity-60", activeVariant.accent)}>
                            {activeVariant.subtitle}
                        </p>
                        <h2 className="text-4xl font-bold tracking-tight text-foreground">
                            {title}
                        </h2>
                    </div>
                </div>

                {/* Narrative */}
                <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-[320px] mx-auto">
                    {description}
                </p>

                {/* Actions */}
                <div className="flex flex-col items-center gap-4 pt-4">
                    {onAction ? (
                        <Button
                            className="h-12 w-full max-w-[220px] rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                            onClick={onAction}
                        >
                            <RefreshCcw className="mr-2 size-4" />
                            {actionLabel}
                        </Button>
                    ) : (
                        showHome && (
                            <Button
                                className="h-12 w-full max-w-[220px] rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                onClick={onHome}
                            >
                                <Home className="mr-2 size-4" />
                                Về trang chủ
                            </Button>
                        )
                    )}

                    {showBack && (
                        <Button
                            variant="ghost"
                            className="h-11 w-full max-w-[220px] rounded-xl font-semibold text-sm hover:bg-muted transition-all text-muted-foreground"
                            onClick={onBack}
                        >
                            <ArrowLeft className="mr-2 size-4" />
                            Quay lại trang trước
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
