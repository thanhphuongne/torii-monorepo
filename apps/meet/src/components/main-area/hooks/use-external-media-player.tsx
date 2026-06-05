import { useMemo } from 'react';
import ExternalMediaPlayer from '@/components/external-media-player';
import { useCloseSidePanelsOnShow } from '@/components/main-area/hooks/use-close-side-panels-on-show';

export const useExternalMediaPlayer = (
  isActiveExternalMediaPlayer: boolean,
  isActiveScreenShare: boolean,
  isActiveWhiteboard: boolean,
  isRecorder: boolean,
) => {
  const shouldShow = useMemo(
    () =>
      isActiveExternalMediaPlayer &&
      !isActiveScreenShare &&
      !isActiveWhiteboard,
    [isActiveExternalMediaPlayer, isActiveScreenShare, isActiveWhiteboard],
  );

  useCloseSidePanelsOnShow(shouldShow, isRecorder);

  return useMemo(() => {
    return (
      <div
        className={`${shouldShow ? 'Div-external-media-player w-full flex items-center justify-center' : 'hidden'}`}
      >
        <ExternalMediaPlayer />
      </div>
    );
  }, [shouldShow]);
};
