import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createAudioAnalyser,
  createLocalTracks,
  LocalAudioTrack,
  LocalTrack,
  LocalTrackPublication,
  ParticipantEvent,
  Track,
} from 'livekit-client';
import { isEmpty } from 'es-toolkit/compat';
import clsx from 'clsx';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  AnalyticsStatus,
  AnalyticsStatusSchema,
} from '@workspace/protocol';

import { store, useAppDispatch, useAppSelector } from '@/store';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateShowMicrophoneModal,
} from '@/store/slices/bottom-icons-activity-slice';
import MicMenu from '@/components/footer/icons/mic-menu';
import MicrophoneModal from '@/components/footer/modals/microphone-modal';
import { updateMuteOnStart } from '@/store/slices/session-slice';
import {
  addAudioDevices,
  updateSelectedAudioDevice,
} from '@/store/slices/roomSettingsSlice';
import {
  getAudioPreset,
  getInputMediaDevices,
  sleep,
} from '@/helpers/utils';
import { getMediaServerConnRoom } from '@/helpers/livekit/utils';
import { getNatsConn } from '@/helpers/nats';
import { Mic, MicOff, Plus, X } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

const MicrophoneIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();
  const conn = getNatsConn();

  const [showMutedTooltip, setShowMutedTooltip] = useState(false);
  const tooltipDismissedRef = useRef(false);
  const isMutedRef = useRef(false);
  const muteDelayTimer = useRef<NodeJS.Timeout | null>(null);

  const { showTooltip, muteOnStart, isAdmin, defaultLock } = useMemo(() => {
    const session = store.getState().session;
    return {
      showTooltip: session.userDeviceType === 'desktop',
      muteOnStart: !!session.currentRoom.metadata?.roomFeatures?.muteOnStart,
      isAdmin: !!session.currentUser?.metadata?.isAdmin,
      defaultLock:
        !!session.currentRoom?.metadata?.defaultLockSettings?.lockMicrophone,
    };
  }, []);

  const showMicrophoneModal = useAppSelector(
    (state) => state.bottomIconsActivity.showMicrophoneModal,
  );
  const isActiveMicrophone = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveMicrophone,
  );
  const isMicLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockMicrophone,
  );
  const isMicMuted = useAppSelector(
    (state) => state.bottomIconsActivity.isMicMuted,
  );
  const selectedAudioDevice = useAppSelector(
    (state) => state.roomSettings.selectedAudioDevice,
  );

  // Lock if not an admin & user-specific lock is set, or fall back to room default.
  const isLocked = useMemo(
    () => !isAdmin && (isMicLock ?? defaultLock),
    [isAdmin, isMicLock, defaultLock],
  );

  // for change in mic lock setting
  useEffect(() => {
    if (!currentRoom) return;

    const closeMicOnLock = async (micTrack: LocalTrack) => {
      await currentRoom.localParticipant.unpublishTrack(micTrack, true);
      dispatch(updateIsActiveMicrophone(false));
      dispatch(updateIsMicMuted(false));
    };

    if (isLocked) {
      const mic = currentRoom.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      );
      if (mic && mic.track) {
        closeMicOnLock(mic.track).then();
      }
    }
  }, [isLocked, currentRoom, dispatch]);

  const speakingHandler = useCallback(
    (speaking: boolean) => {
      if (!currentRoom) {
        return;
      }
      if (!speaking) {
        const lastSpokeAt = currentRoom.localParticipant.lastSpokeAt?.getTime();
        if (lastSpokeAt) {
          const cal = Date.now() - lastSpokeAt;
          // send analytics
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED_DURATION,
            AnalyticsEventType.USER,
            undefined,
            undefined,
            cal.toString(),
          );
        }
      } else {
        // send analytics as user has spoken
        conn.sendAnalyticsData(
          AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED,
          AnalyticsEventType.USER,
          undefined,
          undefined,
          '1',
        );
      }
    },
    [currentRoom, conn],
  );

  // for speaking to send stats & muted tooltip
  useEffect(() => {
    if (!currentRoom) {
      return;
    }

    let interval: any;
    let cleanupAnalyser: (() => void) | undefined;

    const setupAnalyser = (publication: LocalTrackPublication) => {
      if (publication.kind !== Track.Kind.Audio) {
        return;
      }
      // Reset dismissed state for the new track session.
      tooltipDismissedRef.current = false;

      const track = publication.track as LocalAudioTrack;
      const { calculateVolume, cleanup } = createAudioAnalyser(track, {
        cloneTrack: true,
      });
      cleanupAnalyser = cleanup; // Store the cleanup function for this track.

      interval = setInterval(() => {
        const volume = calculateVolume();
        if (
          isMutedRef.current &&
          volume > 0.2 &&
          !tooltipDismissedRef.current
        ) {
          setShowMutedTooltip(true);
        } else {
          // Ensure we hide the tooltip if conditions are no longer met.
          setShowMutedTooltip(false);
        }
      }, 500);
    };

    // This function now encapsulates the entire teardown.
    const teardownAnalyser = async () => {
      if (muteDelayTimer.current) {
        clearTimeout(muteDelayTimer.current);
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (cleanupAnalyser) {
        cleanupAnalyser();
        cleanupAnalyser = undefined;
      }
      await sleep(200);
      setShowMutedTooltip(false);
      tooltipDismissedRef.current = false;
    };

    const onTrackMuted = () => {
      // Don't start immediately
      muteDelayTimer.current = setTimeout(() => {
        isMutedRef.current = true;
      }, 3000);
    };

    const onTrackUnmuted = () => {
      // If a timer is pending, cancel it.
      if (muteDelayTimer.current) {
        clearTimeout(muteDelayTimer.current);
      }
      // Immediately disarm the mute check.
      isMutedRef.current = false;
      setShowMutedTooltip(false);
      tooltipDismissedRef.current = false;
    };

    // Attach all event listeners.
    currentRoom.localParticipant.on(
      ParticipantEvent.IsSpeakingChanged,
      speakingHandler,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackPublished,
      setupAnalyser,
    );
    currentRoom.localParticipant.on(
      ParticipantEvent.LocalTrackUnpublished,
      teardownAnalyser,
    );
    currentRoom.localParticipant.on(ParticipantEvent.TrackMuted, onTrackMuted);
    currentRoom.localParticipant.on(
      ParticipantEvent.TrackUnmuted,
      onTrackUnmuted,
    );

    // Main cleanup for when the component unmounts.
    return () => {
      // Detach all listeners.
      currentRoom.localParticipant.off(
        ParticipantEvent.IsSpeakingChanged,
        speakingHandler,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackPublished,
        setupAnalyser,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.LocalTrackUnpublished,
        teardownAnalyser,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackMuted,
        onTrackMuted,
      );
      currentRoom.localParticipant.off(
        ParticipantEvent.TrackUnmuted,
        onTrackUnmuted,
      );
      // Final, robust cleanup.
      teardownAnalyser().then();
    };
  }, [currentRoom, speakingHandler]);

  const muteUnmuteMic = useCallback(async () => {
    if (!currentRoom) {
      return;
    }
    for (const publication of currentRoom.localParticipant.audioTrackPublications.values()) {
      if (
        publication.track &&
        publication.track.source === Track.Source.Microphone
      ) {
        if (publication.isMuted) {
          await publication.track.unmute();
          dispatch(updateIsMicMuted(false));

          // send analytics
          const val = AnalyticsStatusSchema.values[AnalyticsStatus.UNMUTED];
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            val['name'],
          );
        } else {
          await publication.track.mute();
          dispatch(updateIsMicMuted(true));

          // send analytics
          const val = AnalyticsStatusSchema.values[AnalyticsStatus.MUTED];
          conn.sendAnalyticsData(
            AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS,
            AnalyticsEventType.USER,
            val['name'],
          );
        }
      }
    }
  }, [currentRoom, conn, dispatch]);

  const onCloseMicrophoneModal = useCallback(
    async (deviceId?: string) => {
      dispatch(updateShowMicrophoneModal(false));

      if (isEmpty(deviceId) || !currentRoom) {
        return;
      }

      const localTracks = await createLocalTracks({
        audio: {
          deviceId: deviceId,
        },
        video: false,
      });

      const audioTrack = localTracks.find(
        (track) => track.kind === Track.Kind.Audio,
      );

      if (audioTrack) {
        if (muteOnStart) {
          // Mute the track before publishing to prevent any audio leak.
          await audioTrack.mute();
          dispatch(updateIsMicMuted(true));
          // We'll disable it as it was for the first time only.
          dispatch(updateMuteOnStart(false));
        }

        await currentRoom.localParticipant.publishTrack(audioTrack, {
          audioPreset: getAudioPreset(),
        });
        dispatch(updateIsActiveMicrophone(true));
      }

      if (deviceId != null) {
        dispatch(updateSelectedAudioDevice(deviceId));
      }
    },
    [dispatch, currentRoom, muteOnStart],
  );

  const manageMic = useCallback(async () => {
    if (isLocked) {
      return;
    }

    if (!isActiveMicrophone) {
      if (selectedAudioDevice !== '') {
        await onCloseMicrophoneModal(selectedAudioDevice);
      } else {
        const devices = await getInputMediaDevices('audio');
        dispatch(addAudioDevices(devices.audio));
        dispatch(updateShowMicrophoneModal(true));
      }
      return;
    }

    await muteUnmuteMic();
  }, [
    isLocked,
    isActiveMicrophone,
    selectedAudioDevice,
    dispatch,
    muteUnmuteMic,
    onCloseMicrophoneModal,
  ]);

  const getTooltipText = () => {
    if (!isActiveMicrophone && !isLocked) {
      return 'Bật micrô';
    } else if (!isActiveMicrophone && isLocked) {
      return 'Micrô bị khóa';
    }

    if (isActiveMicrophone && !isMicMuted) {
      return 'Tắt tiếng micrô';
    } else if (isActiveMicrophone && isMicMuted) {
      return 'Bật tiếng micrô';
    }
  };

  // only for initial if device was selected in landing page
  useEffect(() => {
    if (selectedAudioDevice) {
      onCloseMicrophoneModal(selectedAudioDevice).then();
    }
    //eslint-disable-next-line
  }, [onCloseMicrophoneModal]);

  const isMicConfigured =
    selectedAudioDevice !== '' || isActiveMicrophone || isLocked;

  const baseBorderClasses = clsx(
    'border border-border transition-colors duration-300',
    {
      'border-destructive! pointer-events-none opacity-60': isLocked,
      'border-primary/40 bg-muted':
        isMicConfigured && isActiveMicrophone && !isMicMuted && !isLocked,
      'border-destructive bg-muted text-destructive':
        !isLocked && isMicMuted && isActiveMicrophone,
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
    if (!isActiveMicrophone) {
      return selectedAudioDevice === '' ? (
        <Mic className="h-5 w-5 3xl:h-6 3xl:w-6" />
      ) : (
        <MicOff className="h-5 w-5 3xl:h-6 3xl:w-6" />
      );
    }

    return isMicMuted ? (
      <MicOff className="h-5 w-5 3xl:h-6 3xl:w-6" />
    ) : (
      <Mic className="h-5 w-5 3xl:h-6 3xl:w-6" />
    );
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {showMutedTooltip && (
          <div className="micro-muted-tooltip tooltip-left absolute -left-3 rtl:microphone-rtl-left bottom-[48px] 3xl:bottom-[55px]">
            <div className="inner w-max bg-secondary rounded-lg shadow-lg px-4 pr-6 py-4 flex items-center gap-2 relative">
              <MicOff className={'h-4 3xl:h-5 w-auto text-destructive'} />
              <p className="text-sm text-foreground">Bạn đang bị tắt tiếng</p>
              <Button
                className="text-foreground absolute cursor-pointer top-1 right-1"
                onClick={() => {
                  tooltipDismissedRef.current = true;
                  setShowMutedTooltip(false);
                }}
                variant="ghost"
                size="icon"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Trạng thái ban đầu: nút tròn nhỏ (+) để mở setting */}
        {!isActiveMicrophone ? (
          <MicMenu
            currentRoom={currentRoom}
            isActiveMicrophone={isActiveMicrophone}
            isMicMuted={isMicMuted}
            onPrimaryAction={manageMic}
            noLeftBorder
            buttonClassName={clsx(
              roundButtonClasses,
              'cursor-pointer',
              showTooltip ? 'has-tooltip' : '',
            )}
            buttonChildren={
              <div className={iconDivClasses}>
                <span className="tooltip tooltip-left -left-3 rtl:microphone-rtl-left">
                  {getTooltipText()}
                </span>
                <Plus className={'h-4 3xl:h-5 w-auto'} />
              </div>
            }
          />
        ) : (
          /* Khi enable: dạng pill chia 2 phần */
          <div className={pillWrapperClasses}>
            <button
              type="button"
              className={clsx(
                'relative flex items-center justify-center rounded-l-full w-10 md:w-11 3xl:w-[52px]',
                'transition-colors duration-200',
              )}
              onClick={manageMic}
            >
              <div className={iconDivClasses}>
                <span className="tooltip tooltip-left -left-3 rtl:microphone-rtl-left">
                  {getTooltipText()}
                </span>
                {renderMainIcon()}
              </div>
            </button>
            <div className="flex items-stretch">
              <MicMenu
                currentRoom={currentRoom}
                isActiveMicrophone={isActiveMicrophone}
                isMicMuted={isMicMuted}
                onPrimaryAction={manageMic}
                buttonClassName={clsx(
                  'flex h-full min-h-0 w-8 md:w-9 3xl:w-10 items-center justify-center rounded-r-full border-0 border-l border-white/15',
                  'transition-colors duration-200',
                  isMicMuted && isActiveMicrophone ? 'text-destructive' : '',
                )}
              />
            </div>
          </div>
        )}
      </div>
      {showMicrophoneModal && (
        <MicrophoneModal
          show={showMicrophoneModal}
          onCloseMicrophoneModal={onCloseMicrophoneModal}
        />
      )}
    </>
  );
};

export default MicrophoneIcon;
