'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PlayCircle, X, Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Slider } from '@workspace/ui/components/slider'

interface CourseVideoPreviewProps {
    thumbnailUrl?: string | null
    previewVideoUrl?: string | null
    title: string
}

export function CourseVideoPreview({ thumbnailUrl, previewVideoUrl, title }: CourseVideoPreviewProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [showControls, setShowControls] = useState(true)

    const videoRef = useRef<HTMLVideoElement>(null)
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    // Lock body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
            // Reset states on close
            setIsPlaying(false)
            setProgress(0)
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    const togglePlay = () => {
        if (!videoRef.current) return
        if (isPlaying) {
            videoRef.current.pause()
        } else {
            videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleTimeUpdate = () => {
        if (!videoRef.current) return
        setCurrentTime(videoRef.current.currentTime)
        const progressPercent = (videoRef.current.currentTime / videoRef.current.duration) * 100
        setProgress(progressPercent)
    }

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return
        setDuration(videoRef.current.duration)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return
        const newTime = (Number(e.target.value) / 100) * duration
        videoRef.current.currentTime = newTime
        setProgress(Number(e.target.value))
    }

    const toggleMute = () => {
        if (!videoRef.current) return
        videoRef.current.muted = !isMuted
        setIsMuted(!isMuted)
    }

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return
        const newVol = Number(e.target.value)
        videoRef.current.volume = newVol
        setVolume(newVol)
        setIsMuted(newVol === 0)
    }

    const handleMouseMove = () => {
        setShowControls(true)
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false)
        }, 3000)
    }

    const skip = (seconds: number) => {
        if (!videoRef.current) return
        videoRef.current.currentTime += seconds
    }

    if (!thumbnailUrl) return null

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className="relative aspect-video rounded-lg overflow-hidden shadow-md border group cursor-pointer bg-black"
            >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <img
                    src={thumbnailUrl || undefined}
                    alt={title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
                {previewVideoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-16 bg-background/90 rounded-full flex items-center justify-center shadow-lg transition-transform">
                            <PlayCircle className="size-8 text-primary ml-1" />
                        </div>
                    </div>
                )}
            </div>

            {isOpen && previewVideoUrl && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-5xl px-4 md:px-6">
                        {/* Header/Close Bar */}
                        <div className="absolute top-[-3rem] right-4 md:right-6 flex justify-between w-full md:w-auto items-center pointer-events-auto">
                            <h3 className="text-white font-medium text-lg drop-shadow-md md:hidden truncate max-w-[80%]">
                                {title}
                            </h3>
                            <Button
                                onClick={() => setIsOpen(false)}
                                variant="ghost"
                                size="icon"
                                className="text-white hover:text-white hover:bg-white/10 rounded-full size-10"
                            >
                                <X className="size-8" />
                            </Button>
                        </div>

                        <div
                            className="bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10 relative group aspect-video"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => isPlaying && setShowControls(false)}
                        >
                            <video
                                ref={videoRef}
                                src={previewVideoUrl}
                                className="w-full h-full object-contain"
                                autoPlay
                                onClick={togglePlay}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={() => setIsPlaying(false)}
                            />

                            {/* Centered Play Button (Visible when paused or initially) */}
                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="size-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <Play className="size-10 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}

                            {/* Controls Overlay */}
                            <div
                                className={cn(
                                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-6 pt-12 transition-opacity duration-300",
                                    showControls ? "opacity-100" : "opacity-0"
                                )}
                            >
                                {/* Progress Bar */}
                                <div className="relative w-full mb-4">
                                    <Slider
                                        value={[progress]}
                                        max={100}
                                        step={0.1}
                                        onValueChange={(vals) => {
                                            if (!videoRef.current || !vals[0]) return
                                            const val = vals[0]
                                            const newTime = (val / 100) * duration
                                            videoRef.current.currentTime = newTime
                                            setProgress(val)
                                        }}
                                        className="cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center justify-between text-white">
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={togglePlay}
                                            className="text-white hover:text-primary hover:bg-transparent size-8"
                                        >
                                            {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
                                        </Button>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => skip(-5)}
                                                className="text-white hover:text-primary hover:bg-transparent size-8"
                                            >
                                                <RotateCcw className="size-5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => skip(5)}
                                                className="text-white hover:text-primary hover:bg-transparent size-8"
                                            >
                                                <RotateCw className="size-5" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-2 group/vol">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={toggleMute}
                                                className="text-white hover:text-primary hover:bg-transparent size-8"
                                            >
                                                {isMuted || volume === 0 ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
                                            </Button>
                                            <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                                                <Slider
                                                    value={[isMuted ? 0 : volume]}
                                                    max={1}
                                                    step={0.1}
                                                    onValueChange={(vals) => {
                                                        if (!videoRef.current || vals[0] === undefined) return
                                                        const val = vals[0]
                                                        videoRef.current.volume = val
                                                        setVolume(val)
                                                        setIsMuted(val === 0)
                                                    }}
                                                    className="w-20 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        <span className="text-sm font-medium font-mono">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-white/60 text-center mt-4 text-sm hidden md:block">
                            {title}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
