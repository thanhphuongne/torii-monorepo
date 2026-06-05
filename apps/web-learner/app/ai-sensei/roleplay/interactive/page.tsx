"use client"

import * as React from "react"
import { InteractiveRoleplay } from "@/components/ai-sensei/interactive-roleplay"
import { SenseiPageHeader } from "@/components/ai-sensei/sensei-page-header"
import { MessageSquareText, Sparkles } from "lucide-react"

export default function InteractiveRoleplayPage() {
    return (
        <div className="flex h-full min-h-0 flex-col px-2 py-2 sm:px-4 sm:py-2 lg:px-6">
            <SenseiPageHeader
                title="Hội thoại chủ đề"
                description="Luyện tập giao tiếp tiếng Nhật theo chủ đề cùng AI Sensei"
                icon={Sparkles}
            />
            <div className="flex-1 min-h-0 relative mt-2">
                <InteractiveRoleplay />
            </div>
        </div>
    )
}
