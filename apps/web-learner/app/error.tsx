'use client'

import { useEffect } from 'react'
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@workspace/ui/components/empty"
import { AlertCircle, RotateCcw, ArrowLeft } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { useRouter } from "next/navigation"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-background">
            <Empty className="border-none">
                <EmptyHeader>
                    <div className="size-12 flex items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
                        <AlertCircle className="size-6" />
                    </div>
                    <EmptyTitle className="text-2xl font-bold text-destructive">Đã xảy ra lỗi hệ thống</EmptyTitle>
                    <EmptyDescription>
                        Chúng tôi xin lỗi vì sự bất tiện này. Một lỗi không mong muốn đã xảy ra.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border w-full max-w-sm mb-6">
                        <p className="text-xs font-mono text-muted-foreground break-all">
                            Error ID: {error.digest || 'Internal Server Error'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <Button variant="outline" onClick={() => router.back()} className="gap-2 w-full sm:w-auto">
                            <ArrowLeft className="size-4" />
                            Quay lại
                        </Button>
                        <Button onClick={() => reset()} className="gap-2 w-full sm:w-auto">
                            <RotateCcw className="size-4" />
                            Thử lại
                        </Button>
                    </div>
                    <EmptyDescription className="mt-8">
                        Vẫn gặp sự cố? <a href="#" className="font-medium text-primary hover:underline">Báo cáo lỗi cho chúng tôi</a>
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
