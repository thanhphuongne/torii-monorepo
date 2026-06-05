"use client"

import { AiChatBot } from "@/components/ai-sensei/ai-chat-bot"
import { SenseiPageHeader } from "@/components/ai-sensei/sensei-page-header"
import { MessageSquare } from "lucide-react"

export default function ChatPage() {
    return (
        <div className="flex h-[calc(100dvh-80px)] min-h-0 flex-col px-3 py-3 sm:px-6 sm:py-6 lg:px-8 overflow-hidden bg-background">
            <div className="shrink-0 mb-3 sm:mb-4">
                <SenseiPageHeader
                    title="AI Sensei Chat"
                    description="Hỏi đáp và giải thích tiếng Nhật cùng Sensei"
                    icon={MessageSquare}
                />
            </div>
            <div className="flex-1 min-h-0 border border-border rounded-xl sm:rounded-2xl overflow-hidden bg-background shadow-inner">
                <AiChatBot />
            </div>
        </div>
    )
}
