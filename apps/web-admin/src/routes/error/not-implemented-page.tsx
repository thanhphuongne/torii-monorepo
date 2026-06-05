import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Wrench, ArrowLeft, HomeIcon } from "lucide-react"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@workspace/ui/components/empty"

export default function NotImplementedPage() {
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
            <Empty className="border-none max-w-sm">
                <EmptyHeader>
                    <div className="size-12 flex items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                        <Wrench className="size-6" />
                    </div>
                    <EmptyTitle className="text-2xl font-black">Tính năng chưa hỗ trợ</EmptyTitle>
                    <EmptyDescription>
                        Chức năng này đang trong quá trình phát triển và chưa được triển khai chính thức.
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
                    <EmptyDescription className="mt-8 text-center text-xs text-muted-foreground">
                        Mã lỗi: 501 Not Implemented
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
