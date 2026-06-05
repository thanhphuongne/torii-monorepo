import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Lock, ArrowLeft, LogInIcon } from "lucide-react"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@workspace/ui/components/empty"

export default function UnauthorizedPage() {
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
            <Empty className="border-none max-w-sm">
                <EmptyHeader>
                    <div className="size-12 flex items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                        <Lock className="size-6" />
                    </div>
                    <EmptyTitle className="text-2xl font-black">Yêu cầu đăng nhập</EmptyTitle>
                    <EmptyDescription>
                        Phiên làm việc của bạn đã hết hạn hoặc bạn không có quyền truy cập vào khu vực này.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 w-full sm:w-auto">
                            <ArrowLeft className="size-4" />
                            Quay lại
                        </Button>
                        <Button onClick={() => navigate("/login")} className="gap-2 w-full sm:w-auto">
                            <LogInIcon className="size-4" />
                            Đăng nhập
                        </Button>
                    </div>
                    <EmptyDescription className="mt-8 text-center text-xs text-muted-foreground">
                        Mã lỗi: 401 Unauthorized
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
