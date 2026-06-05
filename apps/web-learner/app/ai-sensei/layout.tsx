import { SenseiLayout } from "@/components/ai-sensei/sensei-layout"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "AI Sensei",
    description: "Trợ lý AI giúp luyện hội thoại, dịch thuật và thực hành tiếng Nhật theo ngữ cảnh.",
}

export default function AISenseiLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <SenseiLayout>{children}</SenseiLayout>
}
