import React, { useCallback, useEffect, useMemo } from 'react';
import {
  createLocalScreenTracks,
  ScreenShareCaptureOptions,
  Track,
} from 'livekit-client';
import clsx from 'clsx';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { updateIsActiveScreenshare } from '@/store/slices/bottom-icons-activity-slice';
import { updateScreenSharing } from '@/store/slices/session-slice';
import { getScreenShareResolution } from '@/helpers/utils';
import { getMediaServerConnRoom } from '@/helpers/livekit/utils';
import { MonitorUp, Lock as LockIcon } from 'lucide-react';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { Button } from '@workspace/ui/components/button';

const ScrenshareIcon = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();

  const { isAdmin, isScreenShareAllowed, showTooltip } = useMemo(() => {
    const session = store.getState().session;
    return {
      isAdmin: !!session.currentUser?.metadata?.isAdmin,
      isScreenShareAllowed:
        !!session.currentRoom.metadata?.roomFeatures?.allowScreenShare,
      showTooltip: session.userDeviceType === 'desktop',
    };
  }, []);

  const isActiveScreenshare = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveScreenshare,
  );
  const sessionScreenSharing = useAppSelector(
    (state) => state.session.screenSharing,
  );
  const isScreenshareLock = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockScreenSharing,
  );

  const isLocked = useMemo(
    () => !isAdmin && isScreenshareLock,
    [isAdmin, isScreenshareLock],
  );

  const endScreenShare = useCallback(async () => {
    if (isActiveScreenshare && currentRoom) {
      for (const publication of currentRoom.localParticipant.trackPublications.values()) {
        if (
          (publication.source === Track.Source.ScreenShare ||
            publication.source === Track.Source.ScreenShareAudio) &&
          publication.track
        ) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }
      dispatch(updateIsActiveScreenshare(false));
      dispatch(
        updateScreenSharing({
          isActive: false,
          sharedBy: '',
        }),
      );
    }
  }, [isActiveScreenshare, dispatch, currentRoom]);

  // for change in lock setting
  useEffect(() => {
    if (isLocked) {
      endScreenShare().then();
    }
    //eslint-disable-next-line
  }, [isLocked]);

  // for special case when user cancels sharing from browser directly,
  // we will check & disable button status.
  useEffect(() => {
    if (!sessionScreenSharing.isActive && isActiveScreenshare) {
      dispatch(updateIsActiveScreenshare(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionScreenSharing]);

  const toggleScreenShare = async () => {
    if (isLocked) {
      return;
    }

    if (!isActiveScreenshare) {
      if (sessionScreenSharing.isActive) {
        dispatch(
          addUserNotification({
            message: 'Đã có người đang chia sẻ màn hình',
            typeOption: 'error',
          }),
        );
        return;
      }

      if (!currentRoom) {
        return;
      }

      const option: ScreenShareCaptureOptions = {
        audio: true,
      };
      // because of one bug, we'll disable to set regulation for safari
      // https://bugs.webkit.org/show_bug.cgi?id=263015
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      );
      if (!isSafari) {
        option.resolution = getScreenShareResolution();
      }

      const localTracks = await createLocalScreenTracks(option);
      for (let i = 0; i < localTracks.length; i++) {
        const track = localTracks[i];
        await currentRoom.localParticipant.publishTrack(track);
      }

      dispatch(updateIsActiveScreenshare(true));
      dispatch(
        updateScreenSharing({
          isActive: true,
          sharedBy: currentRoom.localParticipant.identity,
        }),
      );
    } else {
      endScreenShare().then();
    }
  };

  const text = () => {
    if (isActiveScreenshare) {
      return 'Dừng chia sẻ màn hình';
    } else if (!isActiveScreenshare && !isLocked) {
      return 'Chia sẻ màn hình';
    } else if (isLocked) {
      return 'Chia sẻ màn hình bị khóa';
    }
  };

  if (!isScreenShareAllowed) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => toggleScreenShare()}
      className={clsx(
        'share-screen footer-icon relative hidden h-11 w-11 rounded-full border-border bg-card shadow-sm hover:bg-muted md:inline-flex 3xl:h-[52px] 3xl:w-[52px]',
        {
          'has-tooltip': showTooltip,
          'bg-muted': isActiveScreenshare,
          'pointer-events-none opacity-60 text-destructive border-destructive/50': isLocked,
        },
      )}
    >
      <span className="tooltip">{text()}</span>
      <MonitorUp className="h-4 w-4 3xl:h-5 3xl:w-5" />
      {isLocked && (
        <span className="add absolute -top-2 -right-2 z-10">
          <LockIcon className="h-3 w-3 text-primary md:h-3.5 md:w-3.5" />
        </span>
      )}
    </Button>
  );
};

export default ScrenshareIcon;
