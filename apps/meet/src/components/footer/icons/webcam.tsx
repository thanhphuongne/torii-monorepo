import React, { useCallback, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { LocalTrack, Track } from 'livekit-client';

import { store, useAppDispatch, useAppSelector } from '@/store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
  updateVirtualBackground,
} from '@/store/slices/bottom-icons-activity-slice';
import ShareWebcamModal from '@/components/footer/modals/webcam';
import WebcamMenu from '@/components/footer/icons/webcam/menu';
import { updateSelectedVideoDevice } from '@/store/slices/roomSettingsSlice';
import VirtualBackground from '@/components/virtual-background/virtual-background';
import { createEmptyVideoStreamTrack } from '@/helpers/utils';
import { getMediaServerConnRoom } from '@/helpers/livekit/utils';
import { Video, VideoOff, Plus } from 'lucide-react';
import useWebcamPublisher from '@/components/footer/icons/webcam/use-webcam-publisher';
import useVirtualBackground from '@/components/footer/icons/webcam/use-virtual-background';

const WebcamIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();

  const { showTooltip, isAdmin, defaultLock, isWebcamAllowed } = useMemo(() => {
    const session = store.getState().session;
    const roomFeatures = session.currentRoom.metadata?.roomFeatures;
    const isAdmin = !!session.currentUser?.metadata?.isAdmin;

    let show = true;
    if (!roomFeatures?.allowWebcams) {
      show = false;
    } else if (roomFeatures?.adminOnlyWebcams && !isAdmin) {
      show = false;
    }

    return {
      showTooltip: session.userDeviceType === 'desktop',
      isAdmin,
      defaultLock:
        !!session.currentRoom?.metadata?.defaultLockSettings?.lockWebcam,
      isWebcamAllowed: show,
    };
  }, []);
  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );
  const isActiveWebcam = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWebcam,
  );
  const isWebcamLock = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockWebcam,
  );
  const virtualBackground = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );
  const selectedVideoDevice = useAppSelector(
    (state) => state.roomSettings.selectedVideoDevice,
  );

  // Lock if not an admin & user-specific lock is set, or fall back to room default.
  const isWebcamLocked = useMemo(
    () => !isAdmin && (isWebcamLock ?? defaultLock),
    [isAdmin, isWebcamLock, defaultLock],
  );

  const { publishNewTrack, replaceTrack } = useWebcamPublisher();
  const { sourcePlayback, virtualBgVideoPlayer, handleVirtualBgVideoOnLoad } =
    useVirtualBackground(
      virtualBackground.type !== 'none' ? selectedVideoDevice : undefined,
    );

  // for change in webcam lock setting
  useEffect(() => {
    if (!currentRoom) return;

    const closeWebcamOnLock = async (cameraTrack: LocalTrack) => {
      await currentRoom.localParticipant.unpublishTrack(cameraTrack, true);
      dispatch(updateIsActiveWebcam(false));
    };

    if (isWebcamLocked) {
      const hasCameraTrack = currentRoom.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      if (hasCameraTrack && hasCameraTrack.track) {
        closeWebcamOnLock(hasCameraTrack.track).then();
      }
    }
  }, [isWebcamLocked, currentRoom, dispatch]);

  // this is required during changing webcam device
  useEffect(() => {
    if (!selectedVideoDevice || !isActiveWebcam || !currentRoom) {
      return;
    }

    const changeDevice = async (deviceId: string) => {
      await currentRoom.switchActiveDevice('videoinput', deviceId);
    };

    if (virtualBackground.type === 'none') {
      changeDevice(selectedVideoDevice).then();
    } else {
      // virtual background stream will be handled by its own hook
    }
  }, [
    selectedVideoDevice,
    isActiveWebcam,
    currentRoom,
    virtualBackground.type,
  ]);

  const onSelectedDevice = useCallback(
    async (deviceId: string) => {
      dispatch(updateSelectedVideoDevice(deviceId));
      dispatch(updateIsActiveWebcam(true));
      if (virtualBackground.type === 'none') {
        await publishNewTrack(deviceId);
      }
    },
    [dispatch, publishNewTrack, virtualBackground.type],
  );

  // only for initial if device was selected in landing page
  useEffect(() => {
    if (selectedVideoDevice) {
      onSelectedDevice(selectedVideoDevice).then();
    }
    //eslint-disable-next-line
  }, []);

  const toggleWebcam = useCallback(async () => {
    if (isWebcamLocked) {
      return;
    }

    if (!isActiveWebcam) {
      if (!currentRoom) return;
      if (selectedVideoDevice !== '') {
        await onSelectedDevice(selectedVideoDevice);
      } else {
        dispatch(updateShowVideoShareModal(!isActiveWebcam));
      }
    } else if (isActiveWebcam) {
      // we'll replace it by empty Stream
      if (!currentRoom) return;
      const emptyStream = createEmptyVideoStreamTrack(
        currentRoom.localParticipant.name ?? 'User',
      );
      await checkPreviousCameraTrackAndReplace(emptyStream);

      dispatch(updateIsActiveWebcam(false));
      dispatch(
        updateVirtualBackground({
          type: 'none',
        }),
      );
    }
    //eslint-disable-next-line
  }, [
    isWebcamLocked,
    isActiveWebcam,
    selectedVideoDevice,
    dispatch,
    currentRoom,
    onSelectedDevice,
  ]);

  const checkPreviousCameraTrackAndReplace = useCallback(
    async (newTrack: MediaStreamTrack): Promise<boolean> => {
      return await replaceTrack(newTrack);
    },
    [replaceTrack],
  );

  // handle virtual background canvas
  const onCanvasRef = useCallback(
    async (canvasRef: React.RefObject<HTMLCanvasElement>) => {
      if (!canvasRef.current) {
        return;
      }
      const stream = canvasRef.current.captureStream(25);
      for (const track of stream.getTracks()) {
        if (track.kind === 'video') {
          const replaced = await replaceTrack(track);
          if (!replaced && currentRoom) {
            await currentRoom.localParticipant.publishTrack(track, {
              source: Track.Source.Camera,
              name: 'canvas',
            });
          }
          dispatch(updateIsActiveWebcam(true));
        }
      }
    },
    [replaceTrack, currentRoom, dispatch],
  );

  const getTooltipText = () => {
    if (!isActiveWebcam && !isWebcamLocked) {
      return 'Bật webcam';
    } else if (!isActiveWebcam && isWebcamLocked) {
      return 'Webcam bị khóa';
    } else if (isActiveWebcam) {
      return 'Tắt webcam';
    }
  };

  if (!isWebcamAllowed) {
    return null;
  }

  const isCamConfigured =
    selectedVideoDevice !== '' || isActiveWebcam || isWebcamLocked;

  const baseBorderClasses = clsx(
    'border border-border transition-colors duration-300',
    {
      'border-destructive! pointer-events-none opacity-60': isWebcamLocked,
      'border-primary/40 bg-muted': isCamConfigured && isActiveWebcam && !isWebcamLocked,
      'border-destructive bg-muted text-destructive':
        !isWebcamLocked && !isActiveWebcam && selectedVideoDevice !== '',
    },
  );

  const roundButtonClasses = clsx(
    'meet-footer-ctrl-pill footer-icon relative flex items-center justify-center !h-10 md:!h-11 3xl:!h-[52px] !w-10 md:!w-11 3xl:!w-[52px] aspect-square min-w-10 md:min-w-11 3xl:min-w-[52px] rounded-full overflow-visible text-foreground bg-card shadow-sm hover:bg-muted',
    baseBorderClasses,
  );

  const pillWrapperClasses = clsx(
    'meet-footer-ctrl-pill footer-icon relative flex items-center overflow-visible text-foreground !h-10 md:!h-11 3xl:!h-[52px] rounded-full bg-card shadow-sm hover:bg-muted',
    baseBorderClasses,
  );

  const iconDivClasses = clsx(
    'w-full h-full relative flex items-center justify-center',
    {
      'has-tooltip': showTooltip,
    },
  );

  const renderMainIcon = () => {
    if (isActiveWebcam) return <Video className="h-5 w-5 3xl:h-6 3xl:w-6" />;
    return selectedVideoDevice === '' ? (
      <Video className="h-5 w-5 3xl:h-6 3xl:w-6" />
    ) : (
      <VideoOff className="h-5 w-5 3xl:h-6 3xl:w-6" />
    );
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {!isActiveWebcam ? (
          <WebcamMenu
            currentRoom={currentRoom}
            isActiveWebcam={isActiveWebcam}
            toggleWebcam={toggleWebcam}
            noLeftBorder
            buttonClassName={clsx(
              roundButtonClasses,
              'cursor-pointer',
              showTooltip ? 'has-tooltip' : '',
            )}
            buttonChildren={
              <div className={iconDivClasses}>
                <span className="tooltip">{getTooltipText()}</span>
                <Plus className={'h-4 3xl:h-5 w-auto'} />
              </div>
            }
          />
        ) : (
          <div className={pillWrapperClasses}>
            <button
              type="button"
              className={clsx(
                'relative flex items-center justify-center rounded-l-full w-10 md:w-11 3xl:w-[52px]',
                'transition-colors duration-200',
              )}
              onClick={() => toggleWebcam()}
            >
              <div className={iconDivClasses}>
                <span className="tooltip">{getTooltipText()}</span>
                {renderMainIcon()}
              </div>
            </button>
            <div className="flex items-stretch">
              <WebcamMenu
                currentRoom={currentRoom}
                isActiveWebcam={isActiveWebcam}
                toggleWebcam={toggleWebcam}
                buttonClassName={clsx(
                  'flex h-full min-h-0 w-8 md:w-9 3xl:w-10 items-center justify-center rounded-r-full border-0 border-l border-white/15',
                  'transition-colors duration-200',
                )}
              />
            </div>
          </div>
        )}
      </div>

      {showVideoShareModal && (
        <ShareWebcamModal
          onSelectedDevice={onSelectedDevice}
          selectedDeviceId={selectedVideoDevice}
          displayWebcamSelection={true}
        />
      )}

      {/*For virtual background*/}
      {sourcePlayback &&
        selectedVideoDevice &&
        virtualBackground.type !== 'none' && (
          <div style={{ display: 'none' }}>
            <VirtualBackground
              sourcePlayback={sourcePlayback}
              id={selectedVideoDevice}
              backgroundConfig={virtualBackground}
              onCanvasRef={onCanvasRef}
            />
          </div>
        )}
      {virtualBackground.type !== 'none' && (
        <div style={{ display: 'none' }}>
          <video
            ref={virtualBgVideoPlayer}
            autoPlay
            onLoadedData={handleVirtualBgVideoOnLoad}
          />
        </div>
      )}
    </>
  );
};

export default WebcamIcon;
