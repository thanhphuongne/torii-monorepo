'use client';

import {
    VideoPlayer,
    VideoPlayerControlBar,
    VideoPlayerPlayButton,
    VideoPlayerSeekBackwardButton,
    VideoPlayerSeekForwardButton,
    VideoPlayerTimeRange,
    VideoPlayerTimeDisplay,
    VideoPlayerMuteButton,
    VideoPlayerVolumeRange,
    VideoPlayerContent,
    VideoPlayerFullscreenButton,
} from '@workspace/ui/components/ui/shadcn-io/video-player';

interface LessonVideoPlayerProps {
    videoUrl: string;
    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
    onEnded: () => void;
}

export function LessonVideoPlayer({ videoUrl, onTimeUpdate, onEnded }: LessonVideoPlayerProps) {
    return (
        <div className="bg-black/5 relative group p-2 md:p-6 lg:p-8">
            <VideoPlayer className="w-full aspect-video bg-black/90 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/5 ring-inset">
                <VideoPlayerContent
                    slot="media"
                    src={videoUrl}
                    className="h-full w-full object-cover"
                    onTimeUpdate={onTimeUpdate}
                    onEnded={onEnded}
                />
                <VideoPlayerControlBar>
                    <VideoPlayerPlayButton />
                    <VideoPlayerSeekBackwardButton />
                    <VideoPlayerSeekForwardButton />
                    <VideoPlayerTimeRange />
                    <VideoPlayerTimeDisplay />
                    <VideoPlayerMuteButton />
                    <VideoPlayerVolumeRange />
                    <VideoPlayerFullscreenButton />
                </VideoPlayerControlBar>
            </VideoPlayer>
        </div>
    );
}
