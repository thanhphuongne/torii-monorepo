import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { GeminiLiveClient } from './gemini-live';
import { getGraph, type VoiceGraph } from './graphs';

export interface Session {
    id: string;
    channelName: string;
    userId?: string;
    graph: VoiceGraph;
    gemini: GeminiLiveClient;
    ws: WebSocket | null;
    createdAt: number;
    lastPing: number;
    timeoutSeconds: number;
}

/**
 * SessionManager
 * Manages active voice sessions. Equivalent to the workers map in TEN Agent's Go server.
 */
export class SessionManager {
    private sessions = new Map<string, Session>();
    private apiKey: string;
    private cleanupInterval: NodeJS.Timeout;

    constructor(apiKey: string, timeoutCheckIntervalMs = 10_000) {
        this.apiKey = apiKey;
        // Periodically clean up timed-out sessions
        this.cleanupInterval = setInterval(() => this.cleanupTimedOut(), timeoutCheckIntervalMs);
    }

    async createSession(params: {
        channelName: string;
        graphName: string;
        userId?: string;
        timeoutSeconds?: number;
        systemPromptOverride?: string;
    }): Promise<Session> {
        // Prevent duplicate sessions for the same channel
        if (this.sessions.has(params.channelName)) {
            console.warn(`[SessionManager] Session already exists for channel ${params.channelName}, stopping old one`);
            await this.stopSession(params.channelName);
        }

        const graph = getGraph(params.graphName);

        // Allow system prompt override (for custom agent configuration)
        if (params.systemPromptOverride) {
            graph.systemPrompt = params.systemPromptOverride;
        }

        const gemini = new GeminiLiveClient(this.apiKey);
        await gemini.connect(graph);

        const session: Session = {
            id: uuidv4(),
            channelName: params.channelName,
            userId: params.userId,
            graph,
            gemini,
            ws: null,
            createdAt: Date.now(),
            lastPing: Date.now(),
            timeoutSeconds: params.timeoutSeconds ?? 120,
        };

        this.sessions.set(params.channelName, session);
        console.log(`[SessionManager] Created session ${session.id} for channel ${params.channelName}`);
        return session;
    }

    attachWebSocket(channelName: string, ws: WebSocket): Session | null {
        const session = this.sessions.get(channelName);
        if (!session) return null;

        session.ws = ws;

        // Wire Gemini audio output → WebSocket
        session.gemini.on('audio', (base64Pcm: string) => {
            if (session.ws?.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({ type: 'audio.output', data: base64Pcm }));
            }
        });

        session.gemini.on('transcript', (text: string) => {
            if (session.ws?.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({ type: 'transcript', text }));
            }
        });

        session.gemini.on('turnComplete', () => {
            if (session.ws?.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({ type: 'turn.complete' }));
            }
        });

        session.gemini.on('error', (msg: string) => {
            if (session.ws?.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({ type: 'error', message: msg }));
            }
        });

        session.gemini.once('ready', () => {
            if (session.ws?.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({ type: 'session.ready', channelName, graphName: session.graph.name }));
            }
        });

        return session;
    }

    getSession(channelName: string): Session | undefined {
        return this.sessions.get(channelName);
    }

    ping(channelName: string): boolean {
        const session = this.sessions.get(channelName);
        if (!session) return false;
        session.lastPing = Date.now();
        return true;
    }

    async stopSession(channelName: string): Promise<boolean> {
        const session = this.sessions.get(channelName);
        if (!session) return false;

        try {
            await session.gemini.disconnect();
        } catch (err) {
            console.error('[SessionManager] Error disconnecting Gemini:', err);
        }

        if (session.ws?.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ type: 'session.stopped' }));
            session.ws.close();
        }

        this.sessions.delete(channelName);
        console.log(`[SessionManager] Stopped session for channel ${channelName}`);
        return true;
    }

    async stopAll(): Promise<void> {
        for (const channelName of this.sessions.keys()) {
            await this.stopSession(channelName);
        }
    }

    get activeCount(): number {
        return this.sessions.size;
    }

    private cleanupTimedOut(): void {
        const now = Date.now();
        for (const [channelName, session] of this.sessions.entries()) {
            if (session.timeoutSeconds < 0) continue; // infinite timeout
            const elapsed = (now - session.lastPing) / 1000;
            if (elapsed > session.timeoutSeconds) {
                console.log(`[SessionManager] Session ${channelName} timed out after ${elapsed.toFixed(0)}s`);
                this.stopSession(channelName);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
    }
}
