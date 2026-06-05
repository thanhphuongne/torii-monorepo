import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { EventEmitter } from 'events';
import type { VoiceGraph } from './graphs';

/**
 * GeminiLiveClient
 * Manages a real-time voice session with Gemini Live API.
 * Equivalent to the gemini_mllm_python extension in TEN Agent.
 */
export class GeminiLiveClient extends EventEmitter {
    private session: any = null;
    private ai: GoogleGenAI;
    private isConnected = false;

    constructor(private readonly apiKey: string) {
        super();
        this.ai = new GoogleGenAI({ apiKey });
    }

    async connect(graph: VoiceGraph): Promise<void> {
        try {
            const model = graph.model || 'gemini-2.0-flash-live-001';

            this.session = await this.ai.live.connect({
                model,
                callbacks: {
                    onopen: () => {
                        this.isConnected = true;
                        console.log(`[GeminiLive] Session opened for model ${model}`);
                        this.emit('ready');
                    },
                    onmessage: (message: LiveServerMessage) => {
                        this.handleMessage(message);
                    },
                    onerror: (err: any) => {
                        console.error('[GeminiLive] Error:', err);
                        this.emit('error', err.message || 'Gemini Live error');
                    },
                    onclose: (evt: any) => {
                        this.isConnected = false;
                        console.log('[GeminiLive] Session closed:', evt.reason);
                        this.emit('closed');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: {
                        parts: [{ text: graph.systemPrompt }],
                    },
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: graph.voice },
                        },
                    },
                },
            });
        } catch (err: any) {
            console.error('[GeminiLive] Connect failed:', err.message);
            throw err;
        }
    }

    /**
     * Send raw PCM audio (base64 encoded, 16kHz 16-bit mono) to Gemini
     */
    sendAudio(base64Pcm: string): void {
        if (!this.session || !this.isConnected) return;
        try {
            this.session.sendRealtimeInput({
                audio: {
                    data: base64Pcm,
                    mimeType: 'audio/pcm;rate=16000',
                },
            });
        } catch (err: any) {
            console.error('[GeminiLive] sendAudio error:', err.message);
        }
    }

    /**
     * Signal end of user's speech turn
     */
    commitTurn(): void {
        if (!this.session || !this.isConnected) return;
        try {
            this.session.sendRealtimeInput({ audioStreamEnd: {} });
        } catch (err) {
            // ignore
        }
    }

    async disconnect(): Promise<void> {
        if (this.session) {
            try {
                await this.session.close();
            } catch (_) { }
            this.session = null;
        }
        this.isConnected = false;
    }

    private handleMessage(message: LiveServerMessage): void {
        try {
            // Audio response from Gemini
            const parts = message.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
                if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData.data) {
                    this.emit('audio', part.inlineData.data); // base64 PCM
                }
                if (part.text) {
                    this.emit('transcript', part.text);
                }
            }

            // Turn complete signal
            if (message.serverContent?.turnComplete) {
                this.emit('turnComplete');
            }

            // Usage metadata for billing
            if (message.usageMetadata) {
                this.emit('usage', message.usageMetadata);
            }
        } catch (err) {
            console.error('[GeminiLive] handleMessage error:', err);
        }
    }
}
