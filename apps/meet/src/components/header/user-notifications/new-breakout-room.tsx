import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { create } from '@bufbuild/protobuf';
import copy from 'copy-text-to-clipboard';
import { JoinBreakoutRoomReqSchema } from '@workspace/protocol';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';

import { store, useAppDispatch } from '@/store';
import { useJoinRoomMutation } from '@/store/services/breakout-room-api';
import { updateReceivedInvitationFor } from '@/store/slices/breakout-room-slice';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import ActionButton from '@/helpers/ui/action-button';
import { LayoutGrid } from 'lucide-react';

interface NewBreakoutRoomProps {
  receivedInvitationFor: string | undefined;
  createdAt: number | undefined;
}

const NewBreakoutRoom = ({
  receivedInvitationFor,
  createdAt,
}: NewBreakoutRoomProps) => {
  const dispatch = useAppDispatch();
  const [joinRoom, { isLoading, data }] = useJoinRoomMutation();
  const [joinLink, setJoinLink] = useState<string>('');
  const [copyText, setCopyText] = useState<string>('Sao chép');
  const userId = useMemo(
    () => store.getState().session.currentUser?.userId,
    [],
  );

  useEffect(() => {
    if (!isLoading && data) {
      if (!data.status) {
        dispatch(
          addUserNotification({
            message: data.msg,
            typeOption: 'error',
            newInstance: true,
          }),
        );
        return;
      }
      if (data.token && data.token !== '') {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set('access_token', data.token);
        const url =
          location.protocol +
          '//' +
          location.host +
          window.location.pathname +
          '?' +
          searchParams.toString();

        const opened = window.open(url, '_blank');
        setJoinLink(url);

        if (!opened) {
          setJoinLink(url);
          return;
        }

        dispatch(updateReceivedInvitationFor(''));
      }
    }
    //eslint-disable-next-line
  }, [isLoading, data]);

  const join = useCallback(() => {
    if (!receivedInvitationFor) {
      dispatch(
        addUserNotification({
          message: 'Người dùng đã tham gia phòng theo nhóm.',
          typeOption: 'error',
          newInstance: true,
        }),
      );
      return;
    }
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: receivedInvitationFor,
        userId: userId,
      }),
    );
  }, [receivedInvitationFor, userId, joinRoom, dispatch]);

  const copyUrl = useCallback(() => {
    copy(joinLink);
    setCopyText('Đã sao chép');
    setTimeout(() => {
      setCopyText('Sao chép');
    }, 1000);
  }, [joinLink]);

  const formatDate = (timeStamp?: number) => {
    const date = new Date(timeStamp ?? 0);
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="notification notif-breakoutRoom flex gap-4 py-2 px-4 border-b border-border">
      <div className="icon w-9 h-9 rounded-full bg-muted text-primary relative inline-flex items-center justify-center">
        <LayoutGrid className="w-[15px]" />
      </div>
      <div className="text flex-1 text-foreground text-sm">
        <p>Bạn được mời tham gia phòng theo nhóm.</p>
        {joinLink !== '' && (
          <div className="invite-link mt-2">
            <Label className="block mb-1 text-sm">
              Liên kết tham gia
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                readOnly={true}
                value={joinLink}
                className="flex-1 h-8 text-xs"
              />
              <Button
                onClick={copyUrl}
                size="xs"
              >
                {copyText}
              </Button>
            </div>
          </div>
        )}
        <div className="bottom flex justify-between text-muted-foreground text-xs items-center mt-2">
          <span className="">{formatDate(createdAt)}</span>{' '}
          <div className="btn-group">
            <ActionButton
              onClick={join}
              isLoading={isLoading}
              custom="h-7 w-auto px-3 !text-xs !rounded-lg"
            >
              Tham gia
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBreakoutRoom;
