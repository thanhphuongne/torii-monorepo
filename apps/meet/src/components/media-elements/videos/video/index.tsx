import React, { useRef } from 'react';
import { Maximize, PictureInPicture } from 'lucide-react';
import { LocalTrackPublication, RemoteTrackPublication } from 'livekit-client';
import { Button } from '@workspace/ui/components/button';

import VideoElm from '@/components/media-elements/videos/video/video-elm';
import PinWebcam from '@/components/media-elements/videos/video/pin-webcam';
import MicStatus from '@/components/media-elements/videos/video/mic-status';
import ConnectionStatus from '@/components/media-elements/videos/video/connection-status';
import { sleep } from '@/helpers/utils';
import Participant from '@/components/media-elements/videos/video/participant';

export interface IVideoComponentProps {
  userId: string;
  name: string;
  isLocal: boolean;
  track: RemoteTrackPublication | LocalTrackPublication;
  displayPinIcon: boolean;
}

const VideoComponent = ({
  userId,
  name,
  isLocal,
  track,
  displayPinIcon,
}: IVideoComponentProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const fullScreen = async () => {
    if (!document.fullscreenElement) {
      videoRef?.current?.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      await document.exitFullscreen();
    }
  };

  const pictureInPicture = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      await sleep(500);
    }
    if (videoRef && videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  return (
    <div className="video-camera-item-inner w-full h-full relative">
      <Participant userId={userId} name={name} isLocal={isLocal} />
      <div className="camera-modules">
        <div className="camera-video-player">
          <MicStatus userId={userId} />
          <VideoElm track={track} ref={videoRef} />
          <div className="cam-icons w-max h-auto flex items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-999 transition-all duration-300 opacity-0 group-hover:opacity-100">
            {displayPinIcon ? <PinWebcam userId={userId} /> : null}
            <Button
              className="cam-fullscreen cursor-pointer w-7 h-7 rounded-full bg-background/40 backdrop-blur-sm shadow-sm flex items-center justify-center border border-border/20 text-white hover:bg-background/60 transition-all"
              onClick={fullScreen}
              variant="ghost"
              size="icon"
            >
              <Maximize className="w-3.5 h-3.5" />
            </Button>
            {document.pictureInPictureEnabled && (
              <Button
                className="cam-pip cursor-pointer w-7 h-7 rounded-full bg-background/40 backdrop-blur-sm shadow-sm flex items-center justify-center border border-border/20 text-white hover:bg-background/60 transition-all"
                onClick={pictureInPicture}
                variant="ghost"
                size="icon"
              >
                <PictureInPicture className="w-3.5 h-3.5" />
              </Button>
            )}
            <ConnectionStatus userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoComponent;
