"use client"

import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@workspace/ui/components/empty"
import { ArrowLeft, HomeIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { useRouter } from "next/navigation"

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-background">
            <Empty className="border-none max-w-sm">
                <EmptyHeader>
                    <div className="text-6xl font-bold text-muted-foreground/20 leading-none mb-4 select-none">
                        404
                    </div>
                    <EmptyTitle className="text-2xl font-bold">Không tìm thấy trang</EmptyTitle>
                    <EmptyDescription>
                        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển khỏi hệ thống.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <Button variant="outline" onClick={() => router.back()} className="gap-2 w-full sm:w-auto">
                            <ArrowLeft className="size-4" />
                            Quay lại
                        </Button>
                        <Button onClick={() => router.push('/')} className="gap-2 w-full sm:w-auto">
                            <HomeIcon className="size-4" />
                            Về trang chủ
                        </Button>
                    </div>
                    <EmptyDescription className="mt-8">
                        Bạn cần hỗ trợ? <a href="#" className="font-medium text-primary hover:underline">Liên hệ bộ phận hỗ trợ</a>
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
