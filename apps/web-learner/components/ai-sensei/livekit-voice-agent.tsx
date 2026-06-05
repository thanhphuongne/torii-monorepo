"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { Mic, PhoneOff, Loader2, Wifi, Zap, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
    useConnectionState,
    useRoomContext,
    useVoiceAssistant,
    useLocalParticipant,
} from "@livekit/components-react"
import { useQueryClient } from "@tanstack/react-query"
import { ConnectionState as LiveKitConnectionState, RoomEvent } from "livekit-client"
import { VoiceConnectionProvider, useVoiceConnection } from "@/components/ai-sensei/voice-core/use-connection"
import { VoiceRoomWrapper } from "@/components/ai-sensei/voice-core/room-wrapper"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

// Types
type LocalConnectionState = "idle" | "connecting" | "connected" | "disconnecting" | "error"

type GraphName = "japanese_tutor" | "roleplay" | "free_conversation"

const VOICE_AGENT_URL = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://localhost:8082"

const GRAPH_OPTIONS: Array<{ value: GraphName; label: string }> = [
    { value: "japanese_tutor", label: "Japanese Tutor (Sakura)" },
    { value: "roleplay", label: "Roleplay (Yuki)" },
    { value: "free_conversation", label: "Free Conversation" },
]

const GRAPH_RUNTIME_CONFIG: Record<
    GraphName,
    {
        model: string
        voice: string
        temperature: number
        instructions: string
        modalities: string
        maxOutputTokens: string
    }
> = {
    japanese_tutor: {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Aoede",
        temperature: 0.7,
        instructions:
            "You are Sakura, a helpful Japanese tutor. Always answer only in Japanese and guide learners with gentle corrections and encouragement.",
        modalities: "audio_only",
        maxOutputTokens: "inf",
    },
    roleplay: {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Puck",
        temperature: 0.8,
        instructions:
            "You are Yuki, a native Japanese conversation partner. Always speak only Japanese and keep responses concise and natural for voice conversation.",
        modalities: "audio_only",
        maxOutputTokens: "inf",
    },
    free_conversation: {
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        voice: "Charon",
        temperature: 0.7,
        instructions:
            "You are a friendly Japanese speaking partner. Always answer in Japanese, concise and supportive, and ask follow-up questions.",
        modalities: "audio_only",
        maxOutputTokens: "inf",
    },
}

function buildRuntimeConfigPayload(graphName: GraphName, geminiApiKey?: string) {
    const config = GRAPH_RUNTIME_CONFIG[graphName]
    return {
        graphName,
        model: config.model,
        voice: config.voice,
        temperature: config.temperature,
        instructions: config.instructions,
        modalities: config.modalities,
        max_output_tokens: config.maxOutputTokens,
        gemini_api_key: geminiApiKey || "",
    }
}

export function LivekitVoiceAgent() {
    return (
        <VoiceConnectionProvider>
            <LivekitVoiceAgentContent />
        </VoiceConnectionProvider>
    )
}

function LivekitVoiceAgentContent() {
    const queryClient = useQueryClient()
    const [connectionState, setConnectionState] = useState<LocalConnectionState>("idle")
    const [selectedGraph, setSelectedGraph] = useState<GraphName>("japanese_tutor")
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false)
    const [queuedStart, setQueuedStart] = useState(false)
    const [sessionTokens, setSessionTokens] = useState({ prompt: 0, completion: 0, total: 0 })
    const [error, setError] = useState<string | null>(null)
    const pendingStartRef = useRef(false)
    const connectInFlightRef = useRef(false)
    const lastDisconnectedAtRef = useRef(0)
    const disconnectFallbackRef = useRef<number | null>(null)
    const roomIdRef = useRef<string | null>(null)
    const allowClientGeminiKey = process.env.NEXT_PUBLIC_LIVEKIT_ALLOW_CLIENT_GEMINI_KEY === "true"
    const sessionGeminiApiKey = allowClientGeminiKey ? process.env.NEXT_PUBLIC_GEMINI_API_KEY : undefined
    const {
        connect: connectToRoom,
        disconnect: disconnectFromRoom,
        wsUrl,
        token,
        shouldConnect,
    } = useVoiceConnection()

    const startAgentForRoom = useCallback(async (roomId: string, graphName: GraphName) => {
        const payload = {
            channel_name: roomId,
            graph_name: graphName,
            user_id: "Learner",
        }

        let lastError: Error | null = null
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                const resp = await fetch(`${VOICE_AGENT_URL}/start`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })

                if (!resp.ok) {
                    const message = await resp.text().catch(() => "")
                    throw new Error(message || `Voice agent start failed (status ${resp.status})`)
                }

                return
            } catch (err: any) {
                lastError = err instanceof Error ? err : new Error(String(err))
                if (attempt < 3) {
                    await new Promise((resolve) => window.setTimeout(resolve, 400 * attempt))
                }
            }
        }

        if (lastError) {
            throw lastError
        }
    }, [])

    const stopAgentForRoom = useCallback(async (roomId?: string | null) => {
        if (!roomId) {
            return
        }

        try {
            await fetch(`${VOICE_AGENT_URL}/stop`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel_name: roomId }),
            })
        } catch (err) {
            console.error("[VoiceAgent] Failed to send stop signal:", err)
        }
    }, [])

    const connectInternal = useCallback(async () => {
        if (connectInFlightRef.current) {
            console.log("[voice-ui] Ignore connect: request is already in flight")
            return
        }

        connectInFlightRef.current = true
        setConnectionState("connecting")
        setError(null)
        setSessionTokens({ prompt: 0, completion: 0, total: 0 })
        console.log("[voice-ui] Start connect flow")

        try {
            const elapsedSinceDisconnected = Date.now() - lastDisconnectedAtRef.current
            const reconnectCooldownMs = 250
            const waitMs = reconnectCooldownMs - elapsedSinceDisconnected
            if (waitMs > 0) {
                await new Promise((resolve) => window.setTimeout(resolve, waitMs))
            }

            const details = await connectToRoom(selectedGraph, sessionGeminiApiKey)
            // Quota is consumed when token is issued, so refresh UI immediately.
            queryClient.invalidateQueries({ queryKey: ["quota-status"] })
            roomIdRef.current = details.roomId
            if (details.requiresManualStart) {
                await startAgentForRoom(details.roomId, selectedGraph)
            } else {
                console.log("[voice-ui] Agent dispatch is embedded in token; skipping /start call")
            }
            console.log("[voice-ui] Token ready, waiting for LiveKit connection")
        } catch (err: any) {
            console.error("[VoiceAgent] Connection failed:", err)
            void stopAgentForRoom(roomIdRef.current)
            disconnectFromRoom()
            setError(err.message || "Failed to connect")
            setConnectionState("error")
        } finally {
            connectInFlightRef.current = false
        }
    }, [connectToRoom, disconnectFromRoom, queryClient, selectedGraph, sessionGeminiApiKey, startAgentForRoom, stopAgentForRoom])

    // Connect
    const connect = useCallback(async () => {
        if (connectionState === "disconnecting") {
            pendingStartRef.current = true
            setQueuedStart(true)
            return
        }

        pendingStartRef.current = false
        setQueuedStart(false)
        await connectInternal()
    }, [connectionState, connectInternal])

    const disconnect = useCallback(() => {
        console.log("[voice-ui] Start disconnect flow")
        pendingStartRef.current = false
        setQueuedStart(false)
        setConnectionState("disconnecting")
        void stopAgentForRoom(roomIdRef.current)
        roomIdRef.current = null
        disconnectFromRoom()

        if (disconnectFallbackRef.current) {
            window.clearTimeout(disconnectFallbackRef.current)
        }
        disconnectFallbackRef.current = window.setTimeout(() => {
            setConnectionState((prev) => (prev === "disconnecting" ? "idle" : prev))
            lastDisconnectedAtRef.current = Date.now()
        }, 3000)
    }, [disconnectFromRoom, stopAgentForRoom])

    const handleRoomConnected = useCallback(() => {
        setConnectionState((prev) => (prev === "disconnecting" ? prev : "connected"))
        setError(null)
        console.log("[voice-ui] LiveKit connected")
    }, [])

    const handleRoomDisconnected = useCallback(() => {
        if (disconnectFallbackRef.current) {
            window.clearTimeout(disconnectFallbackRef.current)
            disconnectFallbackRef.current = null
        }
        void stopAgentForRoom(roomIdRef.current)
        roomIdRef.current = null
        disconnectFromRoom()
        setConnectionState("idle")
        lastDisconnectedAtRef.current = Date.now()

        if (pendingStartRef.current) {
            pendingStartRef.current = false
            setQueuedStart(false)
            void connectInternal()
        }
    }, [disconnectFromRoom, connectInternal, stopAgentForRoom])

    useEffect(() => {
        return () => {
            if (disconnectFallbackRef.current) {
                window.clearTimeout(disconnectFallbackRef.current)
                disconnectFallbackRef.current = null
            }
        }
    }, [])

    return (
        <div className="relative h-full w-full max-w-5xl mx-auto font-inherit py-2 sm:py-3 px-3 sm:px-4">
            <div className="pointer-events-none absolute inset-x-8 top-8 h-28 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute right-6 bottom-16 size-24 rounded-full bg-emerald-500/10 blur-2xl" />

            {(connectionState === "idle" || connectionState === "error") && (
                <Card className="relative w-full max-w-2xl mx-auto border-border/40 shadow-none rounded-3xl overflow-hidden bg-card/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
                    <CardContent className="p-6 sm:p-7 flex flex-col items-center gap-6">
                        <div className="relative">
                            <div className="absolute -inset-6 rounded-full bg-primary/10 blur-2xl" />
                            <div className="relative size-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center border border-primary/20 shadow-inner">
                                <Mic className="size-8 text-primary" strokeWidth={2.2} />
                            </div>
                        </div>

                        <div className="text-center space-y-3 max-w-md">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary/80">
                                <Sparkles className="size-3" /> Voice Studio
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-2">Roleplay với Sensei</h2>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Luyện tập giao tiếp tiếng Nhật chuyên sâu qua giọng nói trực tiếp cùng AI Sensei.
                            </p>
                        </div>

                        <div className="w-full max-w-sm space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Chế độ hội thoại</label>
                            <select
                                value={selectedGraph}
                                onChange={(e) => setSelectedGraph(e.target.value as GraphName)}
                                className="w-full h-11 rounded-2xl border border-border/50 bg-background/80 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                {GRAPH_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <div className="w-full text-xs text-destructive bg-destructive/5 border border-destructive/10 rounded-2xl px-5 py-4 font-bold flex items-center gap-3">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        <Button
                            onClick={connect}
                            size="lg"
                            className="w-full max-w-sm h-11 font-bold rounded-2xl text-sm shadow-md shadow-primary/20 hover:scale-[1.02] transition-all bg-primary"
                        >
                            <Mic className="mr-2.5 size-4" />
                            Bắt đầu bài học ngay
                        </Button>

                        <div className="flex items-center gap-6 pt-1 text-muted-foreground/50 font-bold text-[10px] uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Wifi className="size-3" /> Đường truyền thấp</span>
                            <span className="flex items-center gap-1.5"><Zap className="size-3" /> Phản hồi tức thì</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {(connectionState === "connecting" || connectionState === "disconnecting") && (
                <Card className="w-full max-w-xl mx-auto border-border/40 rounded-3xl bg-card/85 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
                    <CardContent className="py-14 px-6 flex flex-col items-center justify-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/10 animate-ping rounded-full" />
                            <Loader2 className="relative size-12 text-primary animate-spin" strokeWidth={2.5} />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-base text-foreground font-bold">
                                {connectionState === "disconnecting" ? "Đang đóng phiên trước..." : "Sensei đang chuẩn bị phòng..."}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {connectionState === "disconnecting"
                                    ? queuedStart
                                        ? "Đã ghi nhận yêu cầu bắt đầu lại. Hệ thống sẽ tự nối lại ngay khi phiên cũ đóng xong"
                                        : "Vui lòng chờ một chút trước khi bắt đầu lại để tránh mất âm thanh"
                                    : "Vui lòng chờ trong giây lát khi chúng tôi thiết lập giáo án"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {token && wsUrl && (shouldConnect || connectionState === "disconnecting") && (
                <div className={cn(
                    "w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-700",
                    connectionState === "connected" ? "" : "hidden",
                )}>
                    <Card className="border-border/40 shadow-none rounded-3xl overflow-hidden bg-card/85 backdrop-blur-xl relative max-h-[calc(100dvh-180px)]">
                        <VoiceRoomWrapper
                            onConnected={handleRoomConnected}
                            onDisconnected={handleRoomDisconnected}
                            className="w-full h-full p-3 sm:p-4"
                        >
                            <RuntimeSessionConfigUpdater
                                graphName={selectedGraph}
                                geminiApiKey={sessionGeminiApiKey}
                                onUpdatingChange={setIsUpdatingConfig}
                            />

                            <UsageMonitor onUpdate={(usage: { prompt: number; completion: number; total: number }) => {
                                setSessionTokens(prev => ({
                                    prompt: prev.prompt + usage.prompt,
                                    completion: prev.completion + usage.completion,
                                    total: prev.total + usage.total,
                                }))
                            }} />

                            <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border/50 bg-background/60 p-4 sm:p-5 flex flex-col items-center gap-4 sm:gap-5">
                                <AgentVisualizer />
                                <AgentStatus />

                                <div className="w-full max-w-md space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Đổi chế độ trong phiên</label>
                                    <select
                                        value={selectedGraph}
                                        onChange={(e) => setSelectedGraph(e.target.value as GraphName)}
                                        className="w-full h-11 rounded-2xl border border-border/50 bg-background/80 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    >
                                        {GRAPH_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {isUpdatingConfig && (
                                        <p className="text-[11px] font-semibold text-primary">Đang cập nhật cấu hình AI Sensei...</p>
                                    )}
                                </div>

                                {sessionTokens.total > 0 && (
                                    <div className="bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 animate-in zoom-in duration-500 flex items-center gap-2 shadow-sm">
                                        <Zap className="size-3.5 text-yellow-500 shrink-0" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{sessionTokens.total.toLocaleString()} tokens sử dụng</span>
                                    </div>
                                )}

                                <Button
                                    variant="destructive"
                                    size="lg"
                                    onClick={disconnect}
                                    className="h-10 w-full max-w-md font-bold rounded-2xl text-sm shadow-lg shadow-destructive/10 hover:scale-[1.02] transition-all"
                                >
                                    <PhoneOff className="mr-3 size-4" />
                                    Kết thúc
                                </Button>
                            </div>

                        </VoiceRoomWrapper>
                    </Card>
                </div>
            )}
        </div>
    )
}

function RuntimeSessionConfigUpdater({
    graphName,
    geminiApiKey,
    onUpdatingChange,
}: {
    graphName: GraphName
    geminiApiKey?: string
    onUpdatingChange?: (updating: boolean) => void
}) {
    const room = useRoomContext()
    const { agent } = useVoiceAssistant()
    const connectionState = useConnectionState()
    const previousGraphRef = useRef<GraphName>(graphName)

    useEffect(() => {
        if (connectionState !== LiveKitConnectionState.Connected) {
            previousGraphRef.current = graphName
            return
        }

        if (previousGraphRef.current === graphName) {
            return
        }

        if (!agent?.identity) {
            return
        }

        let cancelled = false
        const updateConfig = async () => {
            onUpdatingChange?.(true)
            try {
                const response = await room.localParticipant.performRpc({
                    destinationIdentity: agent.identity,
                    method: "pg.updateConfig",
                    payload: JSON.stringify(buildRuntimeConfigPayload(graphName, geminiApiKey)),
                })
                console.log("[VoiceAgent] pg.updateConfig", response)
            } catch (error) {
                console.error("[VoiceAgent] Failed to perform pg.updateConfig", error)
            } finally {
                if (!cancelled) {
                    previousGraphRef.current = graphName
                    onUpdatingChange?.(false)
                }
            }
        }

        void updateConfig()

        return () => {
            cancelled = true
        }
    }, [connectionState, graphName, room, geminiApiKey, onUpdatingChange, agent?.identity])

    return null
}

/**
 * Displays the dynamic status of the agent (Connecting, Waiting for Agent, Speaking, Listening)
 */
function AgentStatus() {
    const connState = useConnectionState()
    const { agent } = useVoiceAssistant()
    const { localParticipant } = useLocalParticipant()

    const isAgentSpeaking = agent?.isSpeaking ?? false
    const isUserSpeaking = localParticipant.isSpeaking

    // Multi-phase status logic
    let statusLabel = ""
    let subLabel = ""
    let isConnected = false

    if (connState === LiveKitConnectionState.Connecting || connState === LiveKitConnectionState.Reconnecting) {
        statusLabel = "Đang kết nối phòng..."
        subLabel = "Đang thiết lập đường truyền bảo mật..."
    } else if (!agent) {
        statusLabel = "Đang chờ Sensei vào lớp..."
        subLabel = "Sensei đang chuẩn bị giáo án, đợi một xíu nhé!"
    } else {
        isConnected = true
        if (isAgentSpeaking) {
            statusLabel = "Sensei đang nói..."
            subLabel = "Hãy chú ý lắng nghe Sensei nhé!"
        } else if (isUserSpeaking) {
            statusLabel = "Bạn đang nói..."
            subLabel = "Sensei đang lắng nghe bạn đấy!"
        } else {
            statusLabel = "Sensei đang lắng nghe"
            subLabel = "Sẵn sàng nhé! Hãy gửi lời chào đến Sensei nào!"
        }
    }

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            <div className={cn(
                "px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-tighter shadow-sm transition-all duration-500",
                isConnected
                    ? (isAgentSpeaking
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : (isUserSpeaking
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/50 text-muted-foreground border-border/40"))
                    : "bg-primary/5 text-primary border-primary/10",
            )}>
                {isConnected
                    ? (isAgentSpeaking
                        ? "Sensei đang nói"
                        : (isUserSpeaking
                            ? "Bạn đang nói"
                            : "Trực tuyến • Sẵn sàng"))
                    : "Đang đồng bộ..."}
            </div>

            <div className="space-y-1.5 text-center max-w-xs h-20 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={statusLabel}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                            {statusLabel}
                        </h3>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed mx-auto italic opacity-70">
                            "{subLabel}"
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

/**
 * Visualizer component that listens to tracks in the room
 */
function AgentVisualizer() {
    const { agent } = useVoiceAssistant()
    const { localParticipant } = useLocalParticipant()

    const isAgentSpeaking = agent?.isSpeaking ?? false
    const isUserSpeaking = localParticipant.isSpeaking

    const activeColor = isAgentSpeaking ? "rgb(16, 185, 129)" : "rgb(59, 130, 246)"

    return (
        <div className="w-full flex items-center justify-center py-4">
            <div className="relative size-28 sm:size-32 flex items-center justify-center">
                {/* Ripple Wave Effect - 3 Sequential Rings */}
                <AnimatePresence>
                    {(isAgentSpeaking || isUserSpeaking) && (
                        <>
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={`ripple-${i}`}
                                    className="absolute inset-0 rounded-full border-2 z-0"
                                    initial={{ scale: 1, opacity: 0.6 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: i * 0.6,
                                        ease: "easeOut"
                                    }}
                                    style={{ borderColor: activeColor }}
                                />
                            ))}
                        </>
                    )}
                </AnimatePresence>

                {/* Main Prominent Circle */}
                <motion.div
                    animate={{
                        scale: isAgentSpeaking || isUserSpeaking ? [1, 1.05, 1] : 1,
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className={cn(
                        "size-full rounded-full flex items-center justify-center transition-all duration-500 border-2 shadow-md relative z-10 bg-background",
                        isAgentSpeaking && "border-emerald-500 shadow-emerald-100",
                        isUserSpeaking && "border-primary shadow-blue-100",
                        !isAgentSpeaking && !isUserSpeaking && "border-border shadow-sm"
                    )}
                >
                    <Mic
                        className={cn(
                            "size-12 sm:size-14 transition-colors duration-500",
                            isAgentSpeaking && "text-emerald-500",
                            isUserSpeaking && "text-primary",
                            !isAgentSpeaking && !isUserSpeaking && "text-muted-foreground",
                        )}
                        strokeWidth={2.5}
                    />
                </motion.div>
            </div>
        </div>
    )
}

/**
 * Monitor for billing usage DataPackets from the agent
 */
function UsageMonitor({ onUpdate }: { onUpdate: (usage: { prompt: number; completion: number; total: number }) => void }) {
    const room = useRoomContext()

    useEffect(() => {
        const handleData = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
            if (topic === "billing_update") {
                try {
                    const data = JSON.parse(new TextDecoder().decode(payload))
                    if (data.type === "billing_update") {
                        onUpdate({
                            prompt: data.inputTokens || 0,
                            completion: data.outputTokens || 0,
                            total: data.totalTokens || 0,
                        })
                    }
                } catch (e) {
                    console.error("[UsageMonitor] Failed to parse billing update", e)
                }
            }
        }

        room.on(RoomEvent.DataReceived, handleData)
        return () => {
            room.off(RoomEvent.DataReceived, handleData)
        }
    }, [room, onUpdate])

    return null
}
