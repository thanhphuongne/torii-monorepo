"use client"

import React from "react"
import { LiveKitRoom, RoomAudioRenderer, StartAudio } from "@livekit/components-react"
import { useVoiceConnection } from "@/components/ai-sensei/voice-core/use-connection"

export function VoiceRoomWrapper({
    children,
    onConnected,
    onDisconnected,
    className,
}: {
    children: React.ReactNode
    onConnected?: () => void
    onDisconnected?: () => void
    className?: string
}) {
    const { shouldConnect, wsUrl, token, roomId, sessionKey } = useVoiceConnection()

    return (
        <LiveKitRoom
            key={`${sessionKey}:${roomId || "idle"}`}
            serverUrl={wsUrl}
            token={token}
            connect={shouldConnect}
            audio={true}
            video={false}
            onConnected={onConnected}
            onDisconnected={onDisconnected}
            className={className}
            options={{
                publishDefaults: {
                    stopMicTrackOnMute: true,
                },
            }}
        >
            {children}
            <RoomAudioRenderer />
            <StartAudio label="Bam de cho phep phat am thanh" />
        </LiveKitRoom>
    )
}
