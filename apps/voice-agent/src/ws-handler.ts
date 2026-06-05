import { WebSocketServer, WebSocket } from 'ws';
import type { SessionManager } from './session';

/**
 * setupWebSocketServer
 * Handles WebSocket connections from the browser for audio streaming.
 *
 * Protocol:
 *   Browser → Server:
 *     { type: 'session.join', channelName: string }
 *     { type: 'audio.input', data: string }   ← base64 PCM 16kHz mono
 *     { type: 'turn.end' }
 *     { type: 'session.stop' }
 *
 *   Server → Browser:
 *     { type: 'session.ready', channelName, graphName }
 *     { type: 'audio.output', data: string }  ← base64 PCM from Gemini
 *     { type: 'transcript', text: string }
 *     { type: 'turn.complete' }
 *     { type: 'session.stopped' }
 *     { type: 'error', message: string }
 */
export function setupWebSocketServer(wss: WebSocketServer, sessions: SessionManager): void {
    wss.on('connection', (ws: WebSocket) => {
        let channelName: string | null = null;
        console.log('[WS] New connection');

        ws.on('message', async (raw) => {
            let msg: any;
            try {
                msg = JSON.parse(raw.toString());
            } catch {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
                return;
            }

            switch (msg.type) {
                case 'session.join': {
                    channelName = msg.channelName;
                    if (!channelName) {
                        ws.send(JSON.stringify({ type: 'error', message: 'channelName required' }));
                        return;
                    }

                    const session = sessions.attachWebSocket(channelName, ws);
                    if (!session) {
                        ws.send(JSON.stringify({ type: 'error', message: `No session found for channel ${channelName}. Call /start first.` }));
                        return;
                    }

                    console.log(`[WS] Client joined channel ${channelName}`);
                    // Session ready event fires from gemini 'ready' event once connected
                    break;
                }

                case 'audio.input': {
                    if (!channelName) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Join session first' }));
                        return;
                    }

                    const session = sessions.getSession(channelName);
                    if (!session) return;

                    sessions.ping(channelName);
                    session.gemini.sendAudio(msg.data as string);
                    break;
                }

                case 'turn.end': {
                    if (!channelName) return;
                    const session = sessions.getSession(channelName);
                    if (!session) return;
                    session.gemini.commitTurn();
                    break;
                }

                case 'session.stop': {
                    if (!channelName) return;
                    await sessions.stopSession(channelName);
                    channelName = null;
                    break;
                }

                default:
                    ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
            }
        });

        ws.on('close', () => {
            console.log(`[WS] Connection closed for channel ${channelName ?? 'unknown'}`);
        });

        ws.on('error', (err) => {
            console.error('[WS] Error:', err.message);
        });
    });
}
