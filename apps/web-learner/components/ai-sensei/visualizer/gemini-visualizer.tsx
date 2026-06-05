"use client";

import { GeminiMark } from "./gemini-mark";
import {
    AgentState,
    TrackReference,
    useTrackVolume,
} from "@livekit/components-react";

type GeminiVisualizerProps = {
    agentState: AgentState;
    agentTrackRef?: TrackReference;
};

export function GeminiVisualizer({ agentTrackRef, agentState }: GeminiVisualizerProps) {
    const agentVolume = useTrackVolume(agentTrackRef);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Subtle ambient glow behind star */}
            <div
                className={`absolute rounded-full blur-3xl transition-all duration-700 pointer-events-none ${agentState === "speaking"
                    ? "w-40 h-40 bg-primary/15 animate-pulse"
                    : agentState === "thinking"
                        ? "w-36 h-36 bg-yellow-500/10 animate-pulse"
                        : agentState === "listening"
                            ? "w-32 h-32 bg-cyan-500/10 animate-pulse"
                            : "w-28 h-28 bg-primary/5"
                    }`}
            />

            {/* Star canvas — ring is rendered inside Three.js scene */}
            <div className="relative w-48 h-48">
                <GeminiMark volume={agentVolume} state={agentState} />
            </div>
        </div>
    );
}
