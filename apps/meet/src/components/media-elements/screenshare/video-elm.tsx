import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import clsx from 'clsx';

import '@/components/media-elements/screenshare/style.css';
import { useAppSelector } from '@/store';
import { Loader2, Maximize } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

interface IVideoElmProps {
  track: RemoteTrackPublication | LocalTrackPublication;
}

const VideoElm = ({ track }: IVideoElmProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const isNatsServerConnected = useAppSelector(
    (state) => state.roomSettings.isNatsServerConnected,
  );
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const self = useMemo(() => track instanceof LocalTrackPublication, [track]);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      track.videoTrack?.attach(el);
    }

    return () => {
      if (el) {
        track.videoTrack?.detach(el);
      }
    };
  }, [track]);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (!isNatsServerConnected) {
      el.pause();
    } else if (isNatsServerConnected && el.paused) {
      el.play().catch((e) => console.error('screenshare play failed', e));
    }
  }, [isNatsServerConnected]);

  const onLoadedData = useCallback(() => setIsLoaded(true), []);

  const fullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document
        .exitFullscreen()
        .catch((e) => console.error('exit fullscreen failed', e));
    }
  }, []);

  return (
    <div className="screen-share-video group relative">
      {!isLoaded && (
        <div className="loading-status absolute flex h-full w-full items-center justify-center bg-black/50">
          <Loader2
            className="inline h-10 w-10 animate-spin text-gray-200"
          />
        </div>
      )}
      {isLoaded && (
        <Button
          className="absolute z-99 bottom-2 right-2 p-1 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onClick={fullScreen}
          variant="ghost"
          size="icon"
        >
          <Maximize className="w-5 h-5 text-white" />
        </Button>
      )}
      <video
        onLoadedData={onLoadedData}
        ref={ref}
        className={clsx('video-player absolute', {
          'self-screen-share !w-auto !h-52 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2':
            self,
          'remote-screen-share': !self,
        })}
      />
      {self && (
        <div className="text-sm 3xl:text-base text-foreground dark:text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full pt-64">
          Bạn đang chia sẻ màn hình
        </div>
      )}
    </div>
  );
};

export default VideoElm;
