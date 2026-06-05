'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, Volume2, Waves } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Slider } from '@workspace/ui/components/slider'
import { Progress } from '@workspace/ui/components/progress'

export interface ListeningPlayerProps {
  audioUrl?: string
  autoPlay?: boolean
  onEnded?: () => void
}

export function ListeningPlayer({ audioUrl, autoPlay, onEnded }: ListeningPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState([80])
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (autoPlay && audioUrl && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Autoplay blocked", e))
    }
  }, [audioUrl, autoPlay])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime
      const dur = audioRef.current.duration
      setCurrentTime(cur)
      setProgress((cur / dur) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleVolumeChange = (val: number[]) => {
    setVolume(val)
    if (audioRef.current) {
      audioRef.current.volume = (val[0] ?? 0) / 100
    }
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!audioUrl) return null

  return (
    <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-6 shadow-sm border-primary/20 sticky top-0 z-10 mb-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Waves className="size-5 text-primary animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Bản ghi âm phần nghe</h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {isPlaying ? 'Đang phát...' : 'Đã tạm dừng'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 w-32">
                <Volume2 className="size-4 text-muted-foreground" />
                <Slider 
                    value={volume} 
                    onValueChange={handleVolumeChange} 
                    max={100} 
                    step={1} 
                    className="cursor-pointer"
                />
            </div>
            <div className="text-[11px] font-mono font-bold text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            size="icon"
            className="size-12 rounded-2xl shadow-lg shadow-primary/20"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="size-6" /> : <Play className="size-6 fill-current" />}
          </Button>
          <div className="flex-1 space-y-1">
             <Progress value={progress} className="h-2 rounded-full" />
             <div className="flex justify-between px-1">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50 italic">Đề thi thử JLPT</span>
                 <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50 italic text-right">Chỉ dành cho phần nghe</span>
             </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
            setIsPlaying(false)
            onEnded?.()
        }}
      />
    </div>
  )
}
