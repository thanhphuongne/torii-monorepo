"use client"

import React, { createContext, useCallback, useContext, useState } from "react"

type VoiceTokenPayload = {
    token: string
    wsUrl: string
    roomId: string
    requiresManualStart: boolean
}

type GatewaySuccessResponse = {
    success: true
    data?: VoiceTokenPayload
    message?: string
}

type GatewayErrorResponse = {
    success?: false
    message?: string
    error?: string
}

interface VoiceConnectionDetails {
    wsUrl: string
    token: string
    roomId: string
    shouldConnect: boolean
    sessionKey: number
}

interface VoiceConnectionContextValue {
    wsUrl: string
    token: string
    roomId: string
    shouldConnect: boolean
    sessionKey: number
    connect: (graphName?: string, geminiApiKey?: string) => Promise<VoiceTokenPayload>
    disconnect: () => void
}

const VoiceConnectionContext = createContext<VoiceConnectionContextValue | undefined>(undefined)

export function VoiceConnectionProvider({ children }: { children: React.ReactNode }) {
    const [connectionDetails, setConnectionDetails] = useState<VoiceConnectionDetails>({
        wsUrl: "",
        token: "",
        roomId: "",
        shouldConnect: false,
        sessionKey: 0,
    })

    const fetchVoiceToken = useCallback(
        async (abortController: AbortController, graphName?: string, geminiApiKey?: string) => {
            const payload = JSON.stringify({ graphName, geminiApiKey })
            const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "")

            // Voice-only fix: call gateway directly so browser sends auth cookie for API domain.
            if (apiUrl) {
                const gatewayResponse = await fetch(`${apiUrl}/api/agents/livekit-token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: payload,
                    cache: "no-store",
                    signal: abortController.signal,
                })

                const gatewayPayload = (await gatewayResponse.json().catch(() => null)) as
                    | GatewaySuccessResponse
                    | GatewayErrorResponse
                    | null

                if (!gatewayResponse.ok || !gatewayPayload || gatewayPayload.success !== true || !gatewayPayload.data) {
                    const message =
                        (gatewayPayload && "message" in gatewayPayload && gatewayPayload.message) ||
                        (gatewayPayload && "error" in gatewayPayload && gatewayPayload.error) ||
                        "Failed to get LiveKit token"
                    throw new Error(message)
                }

                return {
                    ...gatewayPayload.data,
                    requiresManualStart: false,
                }
            }

            const localResponse = await fetch("/api/voice-agent/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: payload,
                cache: "no-store",
                signal: abortController.signal,
            })

            if (!localResponse.ok) {
                const message = await localResponse.text().catch(() => "Failed to get LiveKit token")
                throw new Error(message || "Failed to get LiveKit token")
            }

            const localData = (await localResponse.json()) as Omit<VoiceTokenPayload, "requiresManualStart">
            return {
                ...localData,
                requiresManualStart: true,
            }
        },
        [],
    )

    const connect = useCallback(async (graphName?: string, geminiApiKey?: string) => {
        const abortController = new AbortController()
        const timeoutId = window.setTimeout(() => {
            abortController.abort()
        }, 10000)

        try {
            const data = await fetchVoiceToken(abortController, graphName, geminiApiKey)

            setConnectionDetails((prev) => ({
                wsUrl: data.wsUrl,
                token: data.token,
                roomId: data.roomId,
                shouldConnect: true,
                sessionKey: prev.sessionKey + 1,
            }))

            return data
        } catch (error: any) {
            if (error?.name === "AbortError") {
                throw new Error("Timeout khi lấy token voice-agent. Vui lòng thử lại.")
            }
            throw error
        } finally {
            window.clearTimeout(timeoutId)
        }
    }, [fetchVoiceToken])

    const disconnect = useCallback(() => {
        setConnectionDetails((prev) => ({
            ...prev,
            shouldConnect: false,
        }))
    }, [])

    return (
        <VoiceConnectionContext.Provider
            value={{
                wsUrl: connectionDetails.wsUrl,
                token: connectionDetails.token,
                roomId: connectionDetails.roomId,
                shouldConnect: connectionDetails.shouldConnect,
                sessionKey: connectionDetails.sessionKey,
                connect,
                disconnect,
            }}
        >
            {children}
        </VoiceConnectionContext.Provider>
    )
}

export function useVoiceConnection() {
    const context = useContext(VoiceConnectionContext)
    if (!context) {
        throw new Error("useVoiceConnection must be used within VoiceConnectionProvider")
    }
    return context
}
