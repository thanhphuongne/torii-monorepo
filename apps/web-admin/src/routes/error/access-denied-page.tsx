import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { ShieldAlert, ArrowLeft, HomeIcon } from "lucide-react"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@workspace/ui/components/empty"

export default function AccessDeniedPage() {
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
            <Empty className="border-none max-w-sm">
                <EmptyHeader>
                    <div className="size-12 flex items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                        <ShieldAlert className="size-6" />
                    </div>
                    <EmptyTitle className="text-2xl font-black text-destructive">403 - Truy cập bị từ chối</EmptyTitle>
                    <EmptyDescription>
                        Tài khoản quản trị của bạn không có đủ quyền hạn để truy cập vào vùng dữ liệu này.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 w-full sm:w-auto">
                            <ArrowLeft className="size-4" />
                            Quay lại
                        </Button>
                        <Button onClick={() => navigate("/")} className="gap-2 w-full sm:w-auto">
                            <HomeIcon className="size-4" />
                            Trang chủ
                        </Button>
                    </div>
                    <EmptyDescription className="mt-8 text-center">
                        Vui lòng liên hệ Admin nếu bạn tin rằng đây là một nhầm lẫn.
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
