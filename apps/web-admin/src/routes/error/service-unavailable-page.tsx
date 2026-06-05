import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { ServerCrash, ArrowLeft, RotateCcw } from "lucide-react"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@workspace/ui/components/empty"

export default function ServiceUnavailablePage() {
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
            <Empty className="border-none max-w-sm">
                <EmptyHeader>
                    <div className="size-12 flex items-center justify-center rounded-full bg-orange-500/10 text-orange-500 mb-4">
                        <ServerCrash className="size-6" />
                    </div>
                    <EmptyTitle className="text-2xl font-black text-orange-600">503 - Dịch vụ tạm ngưng</EmptyTitle>
                    <EmptyDescription>
                        Hệ thống quản trị đang bảo trì hoặc quá tải. Vui lòng thử lại sau ít phút.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 w-full sm:w-auto">
                            <ArrowLeft className="size-4" />
                            Quay lại
                        </Button>
                        <Button onClick={() => window.location.reload()} className="gap-2 w-full sm:w-auto">
                            <RotateCcw className="size-4" />
                            Thử lại
                        </Button>
                    </div>
                    <EmptyDescription className="mt-8 text-center px-4">
                        Đội ngũ kỹ thuật đã được thông báo và đang xử lý sự cố.
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
