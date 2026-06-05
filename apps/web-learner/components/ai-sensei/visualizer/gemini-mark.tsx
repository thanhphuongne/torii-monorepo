"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AgentState } from "@livekit/components-react";

// ─── State color map ──────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
    speaking: "#4F46E5", // primary indigo
    listening: "#06B6D4", // cyan-500
    thinking: "#F59E0B", // amber
    connecting: "#6B7280", // gray
    disconnected: "#9CA3AF",
    idle: "#6366F1",
};

// ─── 4-pointed Gemini star ────────────────────────────────────────────────────

const GeminiShape: React.FC<{ volume: number; state: AgentState }> = ({
    volume,
    state,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const colorRef = useRef(new THREE.Color(STATE_COLORS.idle));
    const targetColor = useRef(new THREE.Color(STATE_COLORS.idle));

    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        const s = 1, c = s * 0.05;
        shape.moveTo(0, s);
        shape.quadraticCurveTo(c, c, s, 0);
        shape.quadraticCurveTo(c, -c, 0, -s);
        shape.quadraticCurveTo(-c, -c, -s, 0);
        shape.quadraticCurveTo(-c, c, 0, s);
        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.25, bevelEnabled: true,
            bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 16,
        });
        geo.center();
        return geo;
    }, []);

    const material = useMemo(() =>
        new THREE.MeshStandardMaterial({
            color: new THREE.Color(STATE_COLORS.idle),
            emissive: new THREE.Color(STATE_COLORS.idle),
            emissiveIntensity: 0.2,
            roughness: 0.6,
            metalness: 0.4,
        }), []);

    useFrame(() => {
        if (!meshRef.current) return;
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;

        // Gentle rotation
        meshRef.current.rotation.y += state === "listening" ? 0.008 : 0.012;

        // Volume-reactive scale
        const targetScale = state === "speaking" ? 1 + volume * 0.5 : 1 + volume * 0.15;
        const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1);
        meshRef.current.scale.setScalar(s);

        // Color lerp
        const hex: string = STATE_COLORS[state] ?? "#6366F1";
        targetColor.current.set(hex);
        colorRef.current.lerp(targetColor.current, 0.06);
        mat.color = colorRef.current.clone();
        mat.emissive = colorRef.current.clone();

        const targetEmissive = state === "speaking" ? 0.7 + volume * 0.9 : 0.2 + volume * 0.3;
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetEmissive, 0.08);
    });

    return <mesh ref={meshRef} geometry={geometry} material={material} />;
};

// ─── Listening torus ring (synced with star, inside same group) ───────────────

const ListeningRing: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const geometry = useMemo(() => new THREE.TorusGeometry(1.35, 0.025, 16, 80), []);
    const material = useMemo(() =>
        new THREE.MeshStandardMaterial({
            color: new THREE.Color("#06B6D4"),
            emissive: new THREE.Color("#06B6D4"),
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.85,
        }), []);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.55 + Math.sin(clock.getElapsedTime() * 2.5) * 0.3;
    });

    return <mesh ref={meshRef} geometry={geometry} material={material} />;
};

// ─── Speaking ripple ring (expands outward, fades, loops) ────────────────────

const SpeakingRing: React.FC<{ phaseOffset: number; volume: number }> = ({
    phaseOffset,
    volume,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const progress = useRef(phaseOffset); // 0..1

    const geometry = useMemo(() => new THREE.TorusGeometry(1.4, 0.018, 8, 64), []);
    const material = useMemo(() =>
        new THREE.MeshStandardMaterial({
            color: new THREE.Color("#4F46E5"),
            emissive: new THREE.Color("#4F46E5"),
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0,
        }), []);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        // Advance cycle — 1.8s per full ripple
        progress.current = (progress.current + delta * 0.55) % 1;
        const p = progress.current;

        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        // Scale: starts at 1, expands to 1.8 — more compact than before
        meshRef.current.scale.setScalar(1 + p * 0.8);
        // Opacity: peak around p=0.05, smooth fade to 0
        const baseOpacity = Math.max(0, (1 - p) * (1 - p) * 0.55);
        mat.opacity = baseOpacity * (1 + volume * 0.8);
    });

    return <mesh ref={meshRef} geometry={geometry} material={material} />;
};

// ─── Scene root — shared group for synchronized floating ─────────────────────

const GeminiScene: React.FC<{ volume: number; state: AgentState }> = ({
    volume,
    state,
}) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.getElapsedTime();
        groupRef.current.position.y = Math.sin(t * 2) * 0.08;
    });

    return (
        <group ref={groupRef}>
            {/* Speaking ripples — 3 rings staggered 120° in phase */}
            {state === "speaking" && (
                <>
                    <SpeakingRing phaseOffset={0} volume={volume} />
                    <SpeakingRing phaseOffset={0.33} volume={volume} />
                    <SpeakingRing phaseOffset={0.66} volume={volume} />
                </>
            )}
            {/* Listening ring */}
            {state === "listening" && <ListeningRing />}
            {/* Star */}
            <GeminiShape volume={volume} state={state} />
        </group>
    );
};

// ─── Public component ─────────────────────────────────────────────────────────

export const GeminiMark = ({
    volume,
    state,
}: {
    volume: number;
    state: AgentState;
}) => {
    return (
        <Canvas
            camera={{ position: [0, 0, 5], fov: 55 }}
            style={{ background: "transparent" }}
            gl={{ alpha: true, antialias: true }}
        >
            <ambientLight intensity={1.2} />
            <directionalLight position={[3, 3, 3]} intensity={1.5} />
            <pointLight position={[-2, 2, 2]} intensity={0.8} />
            <GeminiScene volume={volume} state={state} />
        </Canvas>
    );
};
