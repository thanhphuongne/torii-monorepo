import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft, HomeIcon } from "lucide-react"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@workspace/ui/components/empty"

export default function NotFoundPage() {
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
            <Empty className="border-none max-w-sm">
                <EmptyHeader>
                    <div className="text-6xl font-black text-muted-foreground/20 leading-none mb-4 select-none">
                        404
                    </div>
                    <EmptyTitle className="text-2xl font-black">Không tìm thấy trang</EmptyTitle>
                    <EmptyDescription>
                        Đường dẫn quản trị bạn yêu cầu không tồn tại hoặc đã bị di chuyển.
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
                    <EmptyDescription className="mt-8">
                        Bạn cần hỗ trợ? <a href="#" className="font-medium text-primary hover:underline">Liên hệ bộ phận kỹ thuật</a>
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
