import React, { useEffect, useRef, useState } from 'react';

import VirtualBackground from '@/components/virtual-background/virtual-background';
import { useAppSelector } from '@/store';
import { SourcePlayback } from '@/components/virtual-background/helpers/source-helper';

interface WebcamPreviewProps {
  selectedVideoDevice: string;
  className?: string;
}

const WebcamPreview = ({ selectedVideoDevice, className }: WebcamPreviewProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const virtualBackground = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );

  const [sourcePlayback, setSourcePlayback] = useState<SourcePlayback>();

  useEffect(() => {
    const el = ref.current;
    let stream: MediaStream;

    if (selectedVideoDevice !== '') {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedVideoDevice,
        },
      };
      navigator.mediaDevices.getUserMedia(constraints).then((mediaStream) => {
        if (el) {
          el.srcObject = mediaStream;
          stream = mediaStream;
          setSourcePlayback({
            htmlElement: el,
            width: 640,
            height: 480,
          });
        }
      });
    }

    return () => {
      if (el) {
        el.pause();
        el.srcObject = null;
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      }
    };
  }, [selectedVideoDevice]);

  return (
    <div
      className={`camera relative min-h-0 flex-1 overflow-hidden bg-transparent ${className ?? ''}`}
    >
      {selectedVideoDevice !== '' && (
        <>
          <div
            className={`${virtualBackground.type !== 'none' ? 'w-0.5 h-0.5' : 'absolute inset-0 flex'}`}
          >
            <video
              className="h-full w-full object-cover object-center"
              ref={ref}
              autoPlay
              playsInline
            />
          </div>
          {virtualBackground.type !== 'none' && sourcePlayback && (
            <VirtualBackground
              sourcePlayback={sourcePlayback}
              backgroundConfig={virtualBackground}
              id="preview"
            />
          )}
        </>
      )}
    </div>
  );
};

export default WebcamPreview;
