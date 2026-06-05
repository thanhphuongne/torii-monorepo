import { AccessToken } from "livekit-server-sdk"
import { NextResponse } from "next/server"

const SUPPORTED_GRAPHS = new Set(["japanese_tutor", "roleplay", "free_conversation"])

type TokenRequestBody = {
    graphName?: string
    geminiApiKey?: string
}

type QuotaConsumeSuccessPayload = {
    success: true
    data: {
        allowed: boolean
        status?: unknown
    }
}

type QuotaConsumeErrorPayload = {
    success?: false
    message?: string
    error?: string
}

function resolveGeminiApiKey(body: TokenRequestBody): string {
    const allowClientGeminiKey = process.env.LIVEKIT_ALLOW_CLIENT_GEMINI_KEY === "true"
    const clientGeminiKey = typeof body.geminiApiKey === "string" ? body.geminiApiKey.trim() : ""
    const serverGeminiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "").trim()

    if (allowClientGeminiKey && clientGeminiKey) {
        return clientGeminiKey
    }

    return serverGeminiKey
}

export const runtime = "nodejs"

function normalizeGraphName(graphName?: string): string {
    if (!graphName) {
        return "japanese_tutor"
    }

    return SUPPORTED_GRAPHS.has(graphName) ? graphName : "japanese_tutor"
}

function buildRoomId(graphName: string): string {
    const randomId = Math.random().toString(36).slice(2, 10)
    const timestamp = Date.now().toString(36)
    return `voice-${graphName}-${timestamp}-${randomId}`
}

async function consumeVoiceQuota(request: Request): Promise<{ ok: boolean; message?: string }> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
    const endpoint = `${apiUrl}/api/agents/livekit-consume`

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
            Authorization: request.headers.get("authorization") || "",
        },
        cache: "no-store",
    })

    const payload = (await response.json().catch(() => null)) as
        | QuotaConsumeSuccessPayload
        | QuotaConsumeErrorPayload
        | null

    if (!response.ok || !payload || !("success" in payload) || payload.success !== true || !payload.data?.allowed) {
        const message =
            (payload && "message" in payload && payload.message) ||
            (payload && "error" in payload && payload.error) ||
            "Bạn đã hết lượt sử dụng AI hôm nay. Vui lòng nâng cấp gói để tiếp tục."

        return { ok: false, message }
    }

    return { ok: true }
}

export async function POST(request: Request) {
    try {
        const body = (await request.json().catch(() => ({}))) as TokenRequestBody
        const graphName = normalizeGraphName(body.graphName)
        const geminiApiKey = resolveGeminiApiKey(body)

        const quotaResult = await consumeVoiceQuota(request)
        if (!quotaResult.ok) {
            return new NextResponse(quotaResult.message || "Failed to consume voice quota", {
                status: 402,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
        }

        const apiKey = process.env.LIVEKIT_API_KEY
        const apiSecret = process.env.LIVEKIT_API_SECRET
        const wsUrl = process.env.LIVEKIT_URL

        if (!apiKey || !apiSecret || !wsUrl) {
            console.error("[voice-token] Missing LiveKit env for token generation")
            return NextResponse.json(
                { error: "LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL must be set" },
                { status: 500 },
            )
        }

        const roomId = buildRoomId(graphName)
        const agentName = process.env.VOICE_AGENT_NAME || "torii-voice-agent"
        console.log(`[voice-token] issue graph=${graphName} room=${roomId} agent=${agentName}`)

        const metadata = {
            graphName,
            gemini_api_key: geminiApiKey,
        }

        const token = new AccessToken(apiKey, apiSecret, {
            identity: `learner-${Math.random().toString(36).slice(2, 10)}`,
            name: "Learner",
            ttl: 2 * 60 * 60,
            metadata: JSON.stringify(metadata),
        })

        token.addGrant({
            roomJoin: true,
            room: roomId,
            canPublish: true,
            canPublishData: true,
            canSubscribe: true,
            canUpdateOwnMetadata: true,
        })

        return NextResponse.json({
            token: await token.toJwt(),
            wsUrl,
            roomId,
        })
    } catch (error) {
        console.error("[voice-token] Failed to generate token", error)
        return NextResponse.json(
            {
                error: "Failed to generate voice token",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        )
    }
}
