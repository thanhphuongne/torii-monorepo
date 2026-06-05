import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ChangeVisibilityRes,
  ChangeVisibilityResSchema,
} from '@workspace/protocol';
import { create, toBinary } from '@bufbuild/protobuf';
import { debounce } from 'es-toolkit';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { updateIsActiveWhiteboard } from '@/store/slices/bottom-icons-activity-slice';
import sendAPIRequest from '@/helpers/api/api-client';
import { Presentation } from 'lucide-react';
import { participantsSelector } from '@/store/slices/participant-slice';
import clsx from 'clsx';
import { Button } from '@workspace/ui/components/button';

const WhiteboardIcon = () => {
  const dispatch = useAppDispatch();
  const isInitialMount = useRef(true);
  const isLocalAction = useRef(false);

  const { showTooltip, allowedWhiteboard, currentUserId, isAdmin, isRecorder } =
    useMemo(() => {
      const session = store.getState().session;
      const currentUser = session.currentUser;
      return {
        showTooltip: session.userDeviceType === 'desktop',
        allowedWhiteboard:
          session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures
            ?.isAllow,
        currentUserId: currentUser?.userId,
        isAdmin: currentUser?.metadata?.isAdmin,
        isRecorder: currentUser?.isRecorder,
      };
    }, []);

  const isActiveWhiteboard = useAppSelector(
    (state) => state.bottomIconsActivity.isActiveWhiteboard,
  );
  const isVisible = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.whiteboardFeatures
        ?.visible,
  );
  const isPresenter = useAppSelector(
    (state) =>
      !!participantsSelector.selectById(state, currentUserId ?? '')?.metadata
        .isPresenter,
  );

  const canControlWhiteboard = useMemo(() => {
    // only user who is admin and presenter can control whiteboard
    return isAdmin && isPresenter && !isRecorder;
  }, [isAdmin, isPresenter, isRecorder]);

  useEffect(() => {
    if (!allowedWhiteboard) {
      return;
    }

    // If the change was initiated locally, we don't need to process the echo.
    if (isLocalAction.current) {
      isLocalAction.current = false;
      return;
    }

    if (isVisible) {
      dispatch(updateIsActiveWhiteboard(true));
    } else if (!isVisible) {
      dispatch(updateIsActiveWhiteboard(false));
    }
    //eslint-disable-next-line
  }, [isVisible]);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSendRequest = useCallback(
    debounce(async (isActive: boolean) => {
      const currentRoom = store.getState().session.currentRoom;
      const isVisible =
        currentRoom.metadata?.roomFeatures?.whiteboardFeatures?.visible;

      if (isActive === isVisible) {
        return;
      }

      const sendRequest = async (body: ChangeVisibilityRes) => {
        await sendAPIRequest(
          'changeVisibility',
          toBinary(ChangeVisibilityResSchema, body),
          false,
          'application/protobuf',
        );
      };

      const body = create(ChangeVisibilityResSchema, {
        roomId: currentRoom.roomId,
        visibleWhiteBoard: isActive,
      });
      await sendRequest(body);
      // After sending, we can listen for remote changes again.
      isLocalAction.current = false;
    }, 200),
    [],
  );

  useEffect(() => {
    if (!canControlWhiteboard) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    debouncedSendRequest(isActiveWhiteboard);
  }, [canControlWhiteboard, isActiveWhiteboard, debouncedSendRequest]);

  const toggleWhiteboard = useCallback(() => {
    // prevent toggling whiteboard during screen sharing
    if (store.getState().bottomIconsActivity.isActiveScreenshare) {
      return;
    }
    isLocalAction.current = true;
    dispatch(updateIsActiveWhiteboard(!isActiveWhiteboard));
  }, [dispatch, isActiveWhiteboard]);

  return (
    allowedWhiteboard && (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={toggleWhiteboard}
        className={clsx(
          'whiteboard footer-icon relative hidden h-11 w-11 rounded-full border-border bg-card shadow-sm hover:bg-muted md:inline-flex 3xl:h-[52px] 3xl:w-[52px]',
          {
            'has-tooltip': showTooltip,
            'bg-muted': isActiveWhiteboard,
          },
        )}
      >
        <span className="tooltip">
          {isActiveWhiteboard ? 'Ẩn bảng trắng' : 'Hiển thị bảng trắng'}
        </span>
        <Presentation className="h-4 w-4 3xl:h-5 3xl:w-5" />
      </Button>
    )
  );
};

export default WhiteboardIcon;
