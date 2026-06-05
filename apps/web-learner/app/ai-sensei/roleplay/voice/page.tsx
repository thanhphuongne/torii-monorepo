"use client"

import * as React from "react"
import { LivekitVoiceAgent } from "@/components/ai-sensei/livekit-voice-agent"
import { SenseiPageHeader } from "@/components/ai-sensei/sensei-page-header"
import { MonitorPlay, Sparkles } from "lucide-react"

export default function VoiceRoleplayPage() {
    return (
        <div className="flex h-full min-h-0 flex-col px-2 py-2 sm:px-4 sm:py-2 lg:px-6">
            <SenseiPageHeader
                title="Luyện hội thoại giọng nói trực tiếp"
                description="Luyện tập hội thoại trực tiếp cùng AI Sensei"
                icon={Sparkles}
            />
            <div className="flex-1 min-h-0 relative mt-2 overflow-y-auto">
                <LivekitVoiceAgent />
            </div>
        </div>
    )
}
