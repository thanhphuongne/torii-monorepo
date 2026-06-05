import path from 'path';
import dotenv from 'dotenv';

// Load .env from the current service directory
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath, override: true });

import express from 'express';
import cors from 'cors';
import http from 'http';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ServerOptions, AgentServer, initializeLogger } from '@livekit/agents';
import { WorkerMessage, JobType } from '@livekit/protocol';
import { Room, ParticipantInfo, RoomServiceClient } from 'livekit-server-sdk';
import { VOICE_GRAPHS } from './graphs';

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8082', 10);
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const VOICE_AGENT_NAME = process.env.VOICE_AGENT_NAME || 'torii-voice-agent';

console.log(`[Server] Environment loaded from: ${envPath}`);
console.log(`[Server] LiveKit Config: URL=${LIVEKIT_URL}, Key=${LIVEKIT_API_KEY.substring(0, 5)}...`);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

if (!GOOGLE_API_KEY) {
    console.warn('[Server] GOOGLE_API_KEY is not set. Expecting per-session gemini_api_key from participant metadata.');
}

// ─── Setup ───────────────────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

// ─── LiveKit Agent Server ────────────────────────────────────────────────────
let agentServer: AgentServer | null = null;
const activeRoomJobs = new Map<string, { jobId: string, timestamp: number }>();

type CleanupPhase = 'startup' | 'shutdown';

function cleanupJobProcesses(phase: CleanupPhase) {
    const procFilter = 'job_proc_lazy_main.cjs';
    const agentEntryFilter = '/apps/voice-agent/src/agent-entry.ts';
    const cmd = `ps -eo pid,ppid,args | grep '${procFilter}' | grep '${agentEntryFilter}' | grep -v grep`;

    try {
        const output = execSync(cmd, { encoding: 'utf8' }).trim();
        if (!output) {
            return;
        }

        const lines = output.split('\n');
        for (const line of lines) {
            const match = line.trim().match(/^(\d+)\s+(\d+)\s+/);
            if (!match) {
                continue;
            }

            const pid = Number(match[1]);
            const ppid = Number(match[2]);
            if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
                continue;
            }

            // Startup: only remove clear orphans (ppid=1).
            // Shutdown: remove all worker job processes tied to this entrypoint.
            if (phase === 'startup' && ppid !== 1) {
                continue;
            }

            try {
                process.kill(pid, 'SIGKILL');
                console.log(`[Server] [Cleanup] Sent SIGKILL to stale job process pid=${pid}, ppid=${ppid} (${phase}).`);
            } catch (error) {
                console.warn(`[Server] [Cleanup] Failed to terminate pid=${pid} (${phase}).`, error);
            }
        }
    } catch (error: any) {
        // Exit code 1 means no match found.
        if (typeof error?.status === 'number' && error.status === 1) {
            return;
        }
        console.warn(`[Server] [Cleanup] Failed to scan job processes (${phase}).`, error);
    }
}

async function startAgentWorker() {
    console.log('[Server] Starting LiveKit Agent worker...');

    // Initialize LiveKit logger
    initializeLogger({ pretty: true, level: 'debug' });

    // Determine agent file extension (use .ts in dev, .js in prod)
    const isTs = __filename.endsWith('.ts');
    const agentFile = path.resolve(__dirname, isTs ? 'agent-entry.ts' : 'agent-entry.js');

    console.log(`[Server] Environment loaded from: ${envPath}`);
    console.log(`[Server] Agent file path: ${agentFile}`);
    console.log(`[Server] Agent name: ${VOICE_AGENT_NAME}`);
    console.log(`[Server] LiveKit Config: URL=${LIVEKIT_URL}, Key=${LIVEKIT_API_KEY.substring(0, 5)}...`);

    const serverOptions = new ServerOptions({
        agent: agentFile,
        agentName: VOICE_AGENT_NAME,
        wsURL: LIVEKIT_URL,
        apiKey: LIVEKIT_API_KEY,
        apiSecret: LIVEKIT_API_SECRET,
        production: !isTs, // Enable dev mode when running TS files
    });

    agentServer = new AgentServer(serverOptions);

    try {
        // Run the server in a way that handles workers
        agentServer.run().catch(err => {
            console.error('[Server] AgentServer encountered an error:', err);
        });

        // Use simple time-based locking instead of complex event tracking
        // as job.room is often undefined during worker dispatch events.
        console.log('[Server] AgentServer is running.');
    } catch (err) {
        console.error('[Server] Failed to run AgentServer:', err);
    }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /start
 * Triggers a LiveKit agent to join a specified room.
 * Replaces the old WebSocket-based session start.
 */
app.post('/start', async (req, res) => {
    const {
        channel_name, // LiveKit room name
        user_id,      // Target participant identity
        graph_name = 'roleplay',
    } = req.body;

    if (!channel_name) {
        return res.status(400).json({ success: false, message: 'channel_name (room) is required' });
    }

    if (!agentServer) {
        return res.status(503).json({ success: false, message: 'Agent server not initialized' });
    }

    try {
        // ─── Room Cleanup & Safety ──────────────────────────────────────────────
        const now = Date.now();
        const lock = activeRoomJobs.get(channel_name);
        if (lock && now - lock.timestamp < 10000) { // 10s cooldown to prevent spam
            console.log(`[Server] [Safety] Join request for ${channel_name} ignored (job ${lock.jobId} active/pending)`);
            return res.json({ success: true, message: 'Agent already joining this room', roomId: channel_name });
        }

        // Acquire lock immediately to prevent concurrent /start race conditions.
        activeRoomJobs.set(channel_name, { jobId: 'pending', timestamp: now });

        // Proactively kick any existing agents from the room via LiveKit Server SDK
        // This ensures old "zombie" agents are removed before we start a new one.
        try {
            const apiHost = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
            const roomService = new RoomServiceClient(apiHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
            const participants = await roomService.listParticipants(channel_name);
            for (const p of participants) {
                if (p.identity.startsWith('agent-')) {
                    console.log(`[Server] [Safety] Removing existing agent participant ${p.identity} from room ${channel_name}`);
                    await roomService.removeParticipant(channel_name, p.identity);
                }
            }
        } catch (e: any) {
            // Room might not exist or other error, just log and continue
            console.log(`[Server] [Safety] Room cleanup check finished (No action taken or room not active)`);
        }

        console.log(`[Server] Dispatching job for room ${channel_name}, graph ${graph_name}...`);

        // Use simulateJob pattern to force the agent to join the room
        const room = new Room({ name: channel_name });
        const participant = new ParticipantInfo({
            identity: user_id || 'unknown',
            name: user_id || 'Learner',
        });

        // Provide graphName to the worker via job metadata
        const jobMetadata = JSON.stringify({ graphName: graph_name });

        (agentServer as any).event.emit(
            'worker_msg',
            new WorkerMessage({
                message: {
                    case: 'simulateJob',
                    value: {
                        type: JobType.JT_PUBLISHER,
                        room: room as any,
                        participant: participant as any,
                        metadata: jobMetadata,
                    } as any, // Cast to any to avoid property mismatch in older protocol versions
                },
            }),
        );

        return res.json({
            success: true,
            room: channel_name,
            message: `Agent dispatched to room ${channel_name}`,
        });
    } catch (err: any) {
        // Release lock on failure to allow retry.
        activeRoomJobs.delete(channel_name);
        console.error('[Server] Failed to dispatch job:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /stop
 * Proactively kicks any existing agents from the room.
 */
app.post('/stop', async (req, res) => {
    const { channel_name } = req.body;

    if (!channel_name) {
        return res.status(400).json({ success: false, message: 'channel_name (room) is required' });
    }

    console.log(`[Server] Stop requested for room: ${channel_name}. Cleaning up agents...`);

    try {
        const apiHost = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
        const roomService = new RoomServiceClient(apiHost, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

        // Clear the internal cooldown lock for this room
        activeRoomJobs.delete(channel_name);

        const participants = await roomService.listParticipants(channel_name);
        let agentsRemoved = 0;

        for (const p of participants) {
            if (p.identity.startsWith('agent-')) {
                console.log(`[Server] [Stop] Removing agent participant ${p.identity} from room ${channel_name}`);
                await roomService.removeParticipant(channel_name, p.identity);
                agentsRemoved++;
            }
        }

        return res.json({
            success: true,
            message: `Stop signal processed. Removed ${agentsRemoved} agent(s).`,
            channel: channel_name
        });
    } catch (err: any) {
        console.error('[Server] Failed to handle /stop request:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /graphs
 */
app.get('/graphs', (_req, res) => {
    const graphs = Object.values(VOICE_GRAPHS).map(g => ({
        name: g.name,
        displayName: g.displayName,
        language: g.language,
        voice: g.voice,
    }));
    return res.json({ success: true, graphs });
});

/**
 * GET /health
 */
app.get('/health', (_req, res) => {
    return res.json({ status: 'ok', agentServer: !!agentServer });
});

// ─── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(PORT, async () => {
    console.log(`\n🎙️  Torii LiveKit Voice Agent Server`);
    console.log(`   HTTP: http://localhost:${PORT}`);
    console.log(`   Internal LiveKit URL: ${LIVEKIT_URL}\n`);

    cleanupJobProcesses('startup');

    await startAgentWorker();
});

// Graceful shutdown and cleanup for tsx watch
const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    // Immediately stop accepting new HTTP connections to free port 8082
    httpServer.close();
    cleanupJobProcesses('shutdown');

    // In dev mode (tsx watch), we want to exit quickly so the new process
    // can bind to the port without EADDRINUSE. LiveKit's internal graceful 
    // shutdown delays the exit, so we force an exit.
    setTimeout(() => {
        process.exit(0);
    }, 500);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
