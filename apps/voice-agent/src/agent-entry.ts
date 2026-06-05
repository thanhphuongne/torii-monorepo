import { AutoSubscribe, JobContext, voice, defineAgent } from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import { EndSensitivity, StartSensitivity } from '@google/genai';
import { getGraph } from './graphs';

type SessionMetadata = {
    graphName?: string;
    instructions?: string;
    model?: string;
    voice?: string;
    temperature?: number;
    maxOutputTokens?: number | 'inf';
    modalities?: string[];
    geminiApiKey?: string;
};

type SessionConfig = {
    graphName: string;
    instructions: string;
    model: string;
    voice: string;
    temperature: number;
    maxOutputTokens?: number | 'inf';
    modalities?: string[];
    geminiApiKey?: string;
};

function parseModalities(input: unknown): string[] | undefined {
    if (Array.isArray(input)) {
        const values = input
            .filter((v): v is string => typeof v === 'string')
            .map(v => v.toUpperCase())
            .filter(v => v === 'TEXT' || v === 'AUDIO');
        return values.length > 0 ? values : undefined;
    }

    if (typeof input !== 'string') {
        return undefined;
    }

    const value = input.toLowerCase();
    if (value === 'text_and_audio') return ['TEXT', 'AUDIO'];
    if (value === 'text_only') return ['TEXT'];
    if (value === 'audio_only') return ['AUDIO'];
    return undefined;
}

function parseSessionConfigObject(data: Record<string, unknown>): SessionMetadata {
    const temperature = Number(data.temperature);
    const maxOutputRaw = data.max_output_tokens ?? data.maxOutputTokens;
    const maxOutputTokens =
        maxOutputRaw === 'inf'
            ? 'inf'
            : typeof maxOutputRaw === 'string' && maxOutputRaw.trim().length === 0
                ? undefined
                : Number.isFinite(Number(maxOutputRaw))
                    ? Number(maxOutputRaw)
                    : undefined;

    const graphName =
        typeof data.graphName === 'string'
            ? data.graphName
            : typeof data.graph_name === 'string'
                ? data.graph_name
                : undefined;

    const geminiKeyRaw = data.gemini_api_key ?? data.geminiApiKey;
    const geminiApiKey =
        typeof geminiKeyRaw === 'string' && geminiKeyRaw.trim().length > 0
            ? geminiKeyRaw.trim()
            : undefined;

    return {
        graphName,
        instructions: typeof data.instructions === 'string' ? data.instructions : undefined,
        model: typeof data.model === 'string' ? data.model : undefined,
        voice: typeof data.voice === 'string' ? data.voice : undefined,
        temperature: Number.isFinite(temperature) ? temperature : undefined,
        maxOutputTokens,
        modalities: parseModalities(data.modalities),
        geminiApiKey,
    };
}

function parseSessionMetadata(raw: string | undefined): SessionMetadata {
    if (!raw) {
        return {};
    }

    try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        return parseSessionConfigObject(data);
    } catch (error) {
        console.warn('[Agent] Failed to parse participant metadata config, using defaults.', error);
        return {};
    }
}

function buildSessionConfig(graphName: string, overrides: SessionMetadata): SessionConfig {
    const graph = getGraph(graphName);
    return {
        graphName: graph.name,
        instructions: overrides.instructions || graph.systemPrompt,
        model: overrides.model || graph.model,
        voice: overrides.voice || graph.voice,
        temperature: overrides.temperature ?? graph.temperature ?? 0.8,
        maxOutputTokens: overrides.maxOutputTokens,
        modalities: overrides.modalities,
        geminiApiKey: overrides.geminiApiKey,
    };
}

function mergeSessionConfig(current: SessionConfig, patch: SessionMetadata): SessionConfig {
    const base =
        patch.graphName && patch.graphName !== current.graphName
            ? buildSessionConfig(patch.graphName, { geminiApiKey: current.geminiApiKey })
            : { ...current };

    return {
        ...base,
        graphName: patch.graphName ? getGraph(patch.graphName).name : base.graphName,
        instructions: patch.instructions ?? base.instructions,
        model: patch.model ?? base.model,
        voice: patch.voice ?? base.voice,
        temperature: patch.temperature ?? base.temperature,
        maxOutputTokens: patch.maxOutputTokens ?? base.maxOutputTokens,
        modalities: patch.modalities ?? base.modalities,
        geminiApiKey: patch.geminiApiKey ?? base.geminiApiKey,
    };
}

function sameStringArray(a?: string[], b?: string[]): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((value, idx) => value === b[idx]);
}

function areConfigsEqual(a: SessionConfig, b: SessionConfig): boolean {
    return (
        a.graphName === b.graphName &&
        a.instructions === b.instructions &&
        a.model === b.model &&
        a.voice === b.voice &&
        a.temperature === b.temperature &&
        a.maxOutputTokens === b.maxOutputTokens &&
        a.geminiApiKey === b.geminiApiKey &&
        sameStringArray(a.modalities, b.modalities)
    );
}

class SessionManager {
    private activeConfig: SessionConfig;
    private activeSession: voice.AgentSession | null = null;
    private replaceQueue: Promise<void> = Promise.resolve();
    private userSpeechStartedAt = 0;
    private userSpeechEndedAt = 0;

    constructor(
        private readonly ctx: JobContext,
        private readonly roomName: string,
        private readonly participantIdentity: string,
        initialConfig: SessionConfig,
    ) {
        this.activeConfig = initialConfig;
    }

    private createModel(config: SessionConfig) {
        return new google.beta.realtime.RealtimeModel({
            model: config.model,
            voice: config.voice as any,
            temperature: config.temperature,
            instructions: config.instructions,
            apiKey: config.geminiApiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
            maxOutputTokens: config.maxOutputTokens === 'inf' ? undefined : config.maxOutputTokens,
            modalities: config.modalities as any,
            // Speed up end-of-turn detection for snappier voice replies.
            realtimeInputConfig: {
                automaticActivityDetection: {
                    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
                    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
                    silenceDurationMs: 220,
                    prefixPaddingMs: 120,
                },
            },
            // Disable explicit reasoning budget for lower first-token latency.
            thinkingConfig: {
                thinkingBudget: 0,
            },
        });
    }

    private createSession(config: SessionConfig) {
        return new voice.AgentSession({
            llm: this.createModel(config),
            voiceOptions: {
                preemptiveGeneration: true,
                minEndpointingDelay: 120,
                maxEndpointingDelay: 1200,
            },
        });
    }

    private createAgent(config: SessionConfig, chatCtx?: any) {
        return new voice.Agent({
            instructions: config.instructions,
            ...(chatCtx ? { chatCtx } : {}),
        });
    }

    private attachLatencyTracking(session: voice.AgentSession) {
        session.on(voice.AgentSessionEventTypes.UserStateChanged, (ev: any) => {
            if (ev?.newState === 'speaking') {
                this.userSpeechStartedAt = Date.now();
                this.userSpeechEndedAt = 0;
            }
            if (ev?.oldState === 'speaking' && ev?.newState === 'listening') {
                this.userSpeechEndedAt = Date.now();
                console.log(`[Agent] User speech ended at ${this.userSpeechEndedAt}`);
            }
        });

        session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev: any) => {
            if (ev?.newState === 'speaking') {
                const now = Date.now();
                const hasValidEndMarker =
                    this.userSpeechEndedAt > 0 && this.userSpeechEndedAt >= this.userSpeechStartedAt;
                const fromUserEnd = hasValidEndMarker ? now - this.userSpeechEndedAt : -1;
                const fromUserStart = this.userSpeechStartedAt > 0 ? now - this.userSpeechStartedAt : -1;
                if (fromUserEnd >= 0) {
                    console.log(
                        `[Agent] Latency stop-speaking->agent-speaking: ${fromUserEnd}ms (start->speak: ${fromUserStart}ms)`,
                    );
                } else {
                    console.log(`[Agent] Agent speaking (no user end marker yet, start->speak: ${fromUserStart}ms)`);
                }
            }
        });
    }

    private async startSession(config: SessionConfig, chatCtx?: any, announceUpdate = false) {
        const session = this.createSession(config);
        const agent = this.createAgent(config, chatCtx);

        this.attachLatencyTracking(session);
        await (session as any).start({ agent, room: this.ctx.room });

        this.activeConfig = config;
        this.activeSession = session;

        console.log(`[Agent] Session started for room: ${this.roomName} using model: ${config.model}`);

        if (announceUpdate) {
            try {
                await session.generateReply({
                    instructions:
                        'Briefly acknowledge that your configuration has been updated and you are ready to continue speaking Japanese.',
                });
            } catch (error) {
                console.warn('[Agent] Failed to send post-update acknowledgement.', error);
            }
        }
    }

    private async replaceSession(nextConfig: SessionConfig) {
        if (!this.activeSession) {
            return;
        }

        const previousSession = this.activeSession;
        const preservedChatCtx = previousSession.history;

        console.log(`[Agent] Replacing session with updated config for participant ${this.participantIdentity}`);
        try {
            await previousSession.close();
        } catch (error) {
            console.warn('[Agent] Failed to close previous session cleanly, continuing replacement.', error);
        }

        await this.startSession(nextConfig, preservedChatCtx, true);
    }

    private async queueSessionReplacement(nextConfig: SessionConfig) {
        this.replaceQueue = this.replaceQueue
            .then(async () => {
                await this.replaceSession(nextConfig);
            })
            .catch((error) => {
                console.error('[Agent] Session replacement queue failed.', error);
            });
        await this.replaceQueue;
    }

    async startInitialSession() {
        await this.startSession(this.activeConfig);

        try {
            await this.activeSession?.generateReply({
                instructions: 'Please begin the interaction with the user in a manner consistent with your instructions.',
            });
        } catch (error) {
            console.warn('[Agent] Failed to send initial greeting.', error);
        }
    }

    registerConfigUpdateRpc() {
        this.ctx.room.localParticipant.registerRpcMethod('pg.updateConfig', async (data: any) => {
            try {
                if (!this.activeSession || data?.callerIdentity !== this.participantIdentity) {
                    return JSON.stringify({ changed: false });
                }

                const incomingPatch = parseSessionMetadata(
                    typeof data?.payload === 'string' ? data.payload : undefined,
                );
                const nextConfig = mergeSessionConfig(this.activeConfig, incomingPatch);

                if (areConfigsEqual(this.activeConfig, nextConfig)) {
                    return JSON.stringify({ changed: false });
                }

                await this.queueSessionReplacement(nextConfig);
                return JSON.stringify({ changed: true });
            } catch (error) {
                console.error('[Agent] pg.updateConfig failed.', error);
                return JSON.stringify({ changed: false, error: 'update_failed' });
            }
        });
    }

    ensureParticipantTrackSubscriptions(reason: string) {
        const participant = this.ctx.room.remoteParticipants.get(this.participantIdentity);
        if (!participant) {
            return;
        }

        let requestedSubscriptions = 0;
        for (const publication of participant.trackPublications.values()) {
            const remotePublication = publication as any;
            if (typeof remotePublication?.setSubscribed === 'function' && remotePublication?.subscribed === false) {
                try {
                    remotePublication.setSubscribed(true);
                    requestedSubscriptions++;
                } catch (error) {
                    console.warn('[Agent] Failed to request track subscription.', error);
                }
            }
        }

        if (requestedSubscriptions > 0) {
            console.log(
                `[Agent] Requested subscription for ${requestedSubscriptions} track(s) on ${this.participantIdentity} (${reason}).`,
            );
        }
    }

    refreshParticipantAudioBinding(reason: string): boolean {
        const roomIO = (this.activeSession as any)?._roomIO;
        if (!roomIO || typeof roomIO.setParticipant !== 'function') {
            return false;
        }

        try {
            if (typeof roomIO.unsetParticipant === 'function') {
                roomIO.unsetParticipant();
            } else {
                roomIO.setParticipant(null);
            }
            roomIO.setParticipant(this.participantIdentity);
            console.log(`[Agent] Refreshed participant audio input binding (${reason}).`);
            return true;
        } catch (error) {
            console.warn('[Agent] Failed to refresh participant audio input binding.', error);
            return false;
        }
    }
}

export default defineAgent({
    entry: async (ctx: JobContext) => {
        const roomName = ctx.job.room?.name || 'unknown';
        let shutdownRequested = false;
        let pendingNoHumanShutdown: ReturnType<typeof setTimeout> | null = null;

        const clearPendingNoHumanShutdown = () => {
            if (!pendingNoHumanShutdown) {
                return;
            }
            clearTimeout(pendingNoHumanShutdown);
            pendingNoHumanShutdown = null;
        };

        const requestShutdown = (reason: string) => {
            if (shutdownRequested) {
                return;
            }
            shutdownRequested = true;
            clearPendingNoHumanShutdown();
            console.log(`[Agent] Requesting shutdown: ${reason}`);
            try {
                ctx.shutdown(reason);
            } catch (error) {
                console.warn('[Agent] Failed to request shutdown cleanly.', error);
            }
        };

        const scheduleNoHumanShutdown = () => {
            clearPendingNoHumanShutdown();
            pendingNoHumanShutdown = setTimeout(() => {
                pendingNoHumanShutdown = null;
                const learnersLeft = Array.from(ctx.room.remoteParticipants.values()).filter(rem =>
                    !rem.identity.startsWith('agent-')
                ).length;

                if (learnersLeft === 0) {
                    console.log('[Agent] No human participants left after grace period. Shutting down job.');
                    requestShutdown('no_human_participants');
                    return;
                }

                console.log('[Agent] Human participant rejoined during grace period. Keeping session alive.');
            }, 4000);
        };

        console.log(`[Agent] Joining room: ${roomName}`);

        // Keep startup flow minimal and deterministic, like gemini-playground.
        await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
        ctx.room.on('participantConnected', (p) => {
            if (!p.identity.startsWith('agent-')) {
                clearPendingNoHumanShutdown();
            }
        });
        // Disconnect when no learner remains in the room.
        ctx.room.on('participantDisconnected', (p) => {
            if (!p.identity.startsWith('agent-')) {
                const learnersLeft = Array.from(ctx.room.remoteParticipants.values()).filter(rem =>
                    !rem.identity.startsWith('agent-')
                ).length;

                if (learnersLeft === 0) {
                    console.log('[Agent] No human participants detected. Starting shutdown grace period.');
                    scheduleNoHumanShutdown();
                }
            }
        });

        console.log(`[Agent] Connected to room: ${roomName} (Job: ${ctx.job.id})`);

        // ─── Participant Discovery ──────────────────────────────────────────────
        const participant = await ctx.waitForParticipant();
        const participantCfg = parseSessionMetadata(participant.metadata);

        // ─── Graph Detection ────────────────────────────────────────────────────
        let graphName = participantCfg.graphName || 'japanese_tutor';
        try {
            if (!participantCfg.graphName && ctx.job.metadata) {
                const meta = typeof ctx.job.metadata === 'string' ? JSON.parse(ctx.job.metadata) : ctx.job.metadata;
                graphName = meta.graphName || graphName;
            } else if (!participantCfg.graphName) {
                // Fallback: Parse from room name
                // Format: roleplay-<graphName>-<userId>-<sessionId>
                const parts = roomName.split('-');
                if (parts.length >= 2) {
                    const potentialGraph = parts[1];
                    if (potentialGraph === 'japanese_tutor' || potentialGraph === 'roleplay' || potentialGraph === 'free_conversation') {
                        graphName = potentialGraph;
                        console.log(`[Agent] Detected graph from room name: ${graphName}`);
                    }
                }
            }
        } catch (e) {
            console.warn(`[Agent] Failed to detect graph: ${e}`);
        }

        const graph = getGraph(graphName);
        const initialConfig = buildSessionConfig(graph.name, participantCfg);

        console.log(`[Agent] Target participant: ${participant?.identity || 'None'}`);
        console.log(`[Agent] Using graph: ${initialConfig.graphName} (${graph.displayName})`);
        if (participantCfg.model || participantCfg.voice || participantCfg.instructions) {
            console.log('[Agent] Applying session config from participant metadata.');
        }

        const sessionManager = new SessionManager(ctx, roomName, participant.identity, initialConfig);
        await sessionManager.startInitialSession();
        sessionManager.registerConfigUpdateRpc();

        const targetParticipantIdentity = participant.identity;
        const forceAudioInputRecovery = (reason: string) => {
            sessionManager.ensureParticipantTrackSubscriptions(reason);
            sessionManager.refreshParticipantAudioBinding(reason);
        };

        const onTrackPublished = (publication: any, remoteParticipant: any) => {
            if (remoteParticipant?.identity !== targetParticipantIdentity) {
                return;
            }

            console.log(
                `[Agent] Target participant track published (kind=${publication?.kind}, source=${publication?.source}).`,
            );
            forceAudioInputRecovery('track_published');
        };

        const onTrackSubscribed = (_track: any, publication: any, remoteParticipant: any) => {
            if (remoteParticipant?.identity !== targetParticipantIdentity) {
                return;
            }

            console.log(
                `[Agent] Target participant track subscribed (kind=${publication?.kind}, source=${publication?.source}).`,
            );
            forceAudioInputRecovery('track_subscribed');
        };

        const onTrackSubscriptionFailed = (trackSid: string, remoteParticipant: any, reason?: string) => {
            if (remoteParticipant?.identity !== targetParticipantIdentity) {
                return;
            }

            console.warn(
                `[Agent] Track subscription failed for target participant (sid=${trackSid}, reason=${reason || 'unknown'}).`,
            );
            forceAudioInputRecovery('track_subscription_failed');
        };

        ctx.room.on('trackPublished', onTrackPublished as any);
        ctx.room.on('trackSubscribed', onTrackSubscribed as any);
        ctx.room.on('trackSubscriptionFailed', onTrackSubscriptionFailed as any);

        let recoveryAttempt = 0;
        const maxRecoveryAttempts = 12;
        const recoveryInterval = setInterval(() => {
            if (shutdownRequested) {
                clearInterval(recoveryInterval);
                return;
            }

            const targetParticipant = ctx.room.remoteParticipants.get(targetParticipantIdentity);
            const hasSubscribedTrack = targetParticipant
                ? Array.from(targetParticipant.trackPublications.values()).some(publication => !!(publication as any).track)
                : false;

            if (hasSubscribedTrack) {
                clearInterval(recoveryInterval);
                return;
            }

            recoveryAttempt += 1;
            forceAudioInputRecovery(`startup_recovery_${recoveryAttempt}`);

            if (recoveryAttempt >= maxRecoveryAttempts) {
                clearInterval(recoveryInterval);
                console.warn('[Agent] Could not detect a subscribed track from target participant during startup.');
            }
        }, 1000);

        forceAudioInputRecovery('session_started');

        let audioHooksCleaned = false;
        const cleanupAudioHooks = () => {
            if (audioHooksCleaned) {
                return;
            }
            audioHooksCleaned = true;
            clearInterval(recoveryInterval);
            ctx.room.off('trackPublished', onTrackPublished as any);
            ctx.room.off('trackSubscribed', onTrackSubscribed as any);
            ctx.room.off('trackSubscriptionFailed', onTrackSubscriptionFailed as any);
        };

        // ─── Token Tracking & Billing (DISABLED) ───────────────────────────────────
        /*
        session.on(voice.AgentSessionEventTypes.MetricsCollected, async (ev: any) => {
            try {
                const metrics = ev.metrics;
                if (!metrics) return;

                // Send billing update to frontend
                const payload = JSON.stringify({
                    type: 'billing_update',
                    inputTokens: metrics.inputTokens || 0,
                    outputTokens: metrics.outputTokens || 0,
                    totalTokens: (metrics.inputTokens || 0) + (metrics.outputTokens || 0),
                    timestamp: Date.now()
                });

                const data = new TextEncoder().encode(payload);
                await ctx.room.localParticipant.publishData(data, {
                    topic: 'billing_update',
                    reliable: true
                });

                // Optional: Log token usage periodically or based on a condition
                // console.log(`[Agent] [Billing] Sent update: +${metrics.inputTokens} prompt, +${metrics.outputTokens} completion`);
            } catch (error) {
                console.error('[Agent] [Billing] Error sending billing update:', error);
            }
        });
        */

        // Wait for either room disconnect or an explicit job shutdown.
        await new Promise<void>((resolve) => {
            if (shutdownRequested) {
                resolve();
                return;
            }

            let settled = false;
            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearPendingNoHumanShutdown();
                cleanupAudioHooks();
                resolve();
            };

            ctx.room.on('disconnected', finish);
            ctx.addShutdownCallback(async () => {
                finish();
            });
        });

        console.log(`[Agent] Finished session for room: ${roomName}`);
    },
});
