"use client"

import Link from "next/link"
import {
    Trophy,
    GraduationCap,
    ArrowRight,
    History,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

const LEVELS = [
    { 
        code: "N1", 
        description: "JLPT N1",
        shortDesc: "Cấp độ cao nhất, sử dụng thành thạo như người bản xứ.",
        difficulty: "Cao cấp"
    },
    { 
        code: "N2", 
        description: "JLPT N2",
        shortDesc: "Hiểu biết sâu rộng tiếng Nhật trong nhiều hoàn cảnh.",
        difficulty: "Thượng cấp"
    },
    { 
        code: "N3", 
        description: "JLPT N3",
        shortDesc: "Chuyển tiếp quan trọng lên cấp độ trung cấp.",
        difficulty: "Trung cấp"
    },
    { 
        code: "N4", 
        description: "JLPT N4",
        shortDesc: "Hiểu đàm thoại cơ bản và chữ Hán thông dụng.",
        difficulty: "Sơ cấp 2"
    },
    { 
        code: "N5", 
        description: "JLPT N5",
        shortDesc: "Dành cho người mới bắt đầu, kiến thức căn bản nhất.",
        difficulty: "Sơ cấp 1"
    },
]

const LEVEL_STYLES: Record<
    string,
    { box: string; code: string; difficulty: string; stripe: string; ring: string }
> = {
    N1: {
        box: "bg-rose-500/10 border-rose-500/35",
        code: "text-rose-700 dark:text-rose-300",
        difficulty: "text-rose-600/90 dark:text-rose-300/90",
        stripe: "bg-rose-500",
        ring: "ring-rose-500/20",
    },
    N2: {
        box: "bg-orange-500/10 border-orange-500/35",
        code: "text-orange-700 dark:text-orange-300",
        difficulty: "text-orange-600/90 dark:text-orange-300/90",
        stripe: "bg-orange-500",
        ring: "ring-orange-500/20",
    },
    N3: {
        box: "bg-amber-500/10 border-amber-500/35",
        code: "text-amber-700 dark:text-amber-300",
        difficulty: "text-amber-600/90 dark:text-amber-300/90",
        stripe: "bg-amber-500",
        ring: "ring-amber-500/20",
    },
    N4: {
        box: "bg-emerald-500/10 border-emerald-500/35",
        code: "text-emerald-700 dark:text-emerald-300",
        difficulty: "text-emerald-600/90 dark:text-emerald-300/90",
        stripe: "bg-emerald-500",
        ring: "ring-emerald-500/20",
    },
    N5: {
        box: "bg-sky-500/10 border-sky-500/35",
        code: "text-sky-700 dark:text-sky-300",
        difficulty: "text-sky-600/90 dark:text-sky-300/90",
        stripe: "bg-sky-500",
        ring: "ring-sky-500/20",
    },
}

export default function JlptListExamPage() {
    return (
        <div className="mx-auto max-w-3xl space-y-6 sm:max-w-none sm:space-y-8">
            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary sm:size-12">
                        <Trophy className="size-5 sm:size-6" />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            Luyện thi JLPT Mock
                        </h1>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            Chọn cấp độ (N1–N5) để xem danh sách đề thi thử.
                        </p>
                    </div>
                </div>
                <Link
                    href="/jlpt/attempt/history"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-500/15 dark:text-violet-300 sm:h-9 sm:w-auto sm:shrink-0"
                >
                    <History className="size-4 shrink-0" />
                    Lịch sử làm bài
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                {LEVELS.map((level) => {
                    const levelStyle = LEVEL_STYLES[level.code] ?? {
                        box: "bg-muted border-border",
                        code: "text-foreground",
                        difficulty: "text-muted-foreground",
                        stripe: "bg-muted-foreground",
                        ring: "ring-border",
                    }

                    return (
                        <Link
                            key={level.code}
                            href={`/jlpt/${level.code.toLowerCase()}`}
                            className="group block"
                        >
                            <div
                                className={cn(
                                    "relative flex min-h-[4.5rem] items-stretch overflow-hidden rounded-xl border bg-card shadow-sm transition-all",
                                    "hover:shadow-md hover:ring-2",
                                    levelStyle.ring,
                                )}
                            >
                                <div className={cn("w-1 shrink-0", levelStyle.stripe)} aria-hidden />
                                <div className="flex flex-1 items-center gap-3 p-3 sm:gap-4 sm:p-4">
                                    <div
                                        className={cn(
                                            "flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border sm:size-14",
                                            levelStyle.box,
                                        )}
                                    >
                                        <span className={cn("text-lg font-bold leading-none sm:text-xl", levelStyle.code)}>
                                            {level.code}
                                        </span>
                                        <span className={cn("mt-0.5 text-[9px] font-semibold", levelStyle.difficulty)}>
                                            {level.difficulty}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-0.5 flex items-start justify-between gap-2">
                                            <h3 className="text-sm font-bold text-foreground sm:text-base">
                                                {level.description}
                                            </h3>
                                            <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                        <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                                            {level.shortDesc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>

            <div className="flex justify-center py-2 sm:py-4">
                <div className="flex max-w-md items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-center text-[11px] font-medium text-muted-foreground sm:max-w-none sm:px-4 sm:text-xs">
                    <GraduationCap className="size-4 shrink-0 text-primary" />
                    <span>Mỗi cấp độ có bộ đề riêng — bấm vào thẻ để xem danh sách đề.</span>
                </div>
            </div>
        </div>
    )
}
