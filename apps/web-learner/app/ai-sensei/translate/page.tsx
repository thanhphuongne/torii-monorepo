"use client"

import { TranslatorView } from "@/components/ai-sensei/translator-view"
import { SenseiPageHeader } from "@/components/ai-sensei/sensei-page-header"
import { Languages } from "lucide-react"

export default function TranslatePage() {
    return (
        <div className="flex min-h-screen flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 pb-12">
            <div className="shrink-0 mb-6 max-w-7xl mx-auto w-full">
                <SenseiPageHeader
                    title="Dịch thuật & Phân tích"
                    description="Công cụ dịch thuật thông minh kết hợp phân tích ngữ pháp chuyên sâu từ AI Sensei"
                    icon={Languages}
                />
            </div>
            <div className="w-full max-w-7xl mx-auto">
                <TranslatorView />
            </div>
        </div>
    )
}
