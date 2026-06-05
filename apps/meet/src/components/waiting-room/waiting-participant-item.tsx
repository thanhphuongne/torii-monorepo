import React, { useCallback, useState } from 'react';
import {
  ApproveWaitingUsersReqSchema,
  CommonResponseSchema,
  RemoveParticipantReqSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { IParticipant } from '@/store/slices/interfaces/participant';
import sendAPIRequest from '@/helpers/api/api-client';
import { store, useAppDispatch } from '@/store';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { generateAvatarInitial } from '@/helpers/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

interface IWaitingParticipantItemProps {
  participant: IParticipant;
}

const WaitingParticipantItem = ({
  participant,
}: IWaitingParticipantItemProps) => {
  const dispatch = useAppDispatch();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = useCallback(async () => {
    setIsProcessing(true);
    const body = create(ApproveWaitingUsersReqSchema, {
      userId: participant.userId,
    });

    const r = await sendAPIRequest(
      'waitingRoom/approveUsers',
      toBinary(ApproveWaitingUsersReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      dispatch(
        addUserNotification({
          message: `Người dùng ${participant.name} đã được chấp thuận`,
          typeOption: 'info',
        }),
      );
    } else {
      dispatch(
        addUserNotification({
          message: res.msg,
          typeOption: 'error',
        }),
      );
    }
    // No need to set isProcessing(false) as the component will unmount on success.
  }, [dispatch, participant]);

  const handleReject = useCallback(
    async (block: boolean) => {
      setIsProcessing(true);
      const session = store.getState().session;
      const body = create(RemoveParticipantReqSchema, {
        sid: session.currentRoom.sid,
        roomId: session.currentRoom.roomId,
        userId: participant.userId,
        msg: 'Bạn đã bị từ chối truy cập vào phòng',
        blockUser: block,
      });

      const r = await sendAPIRequest(
        'removeParticipant',
        toBinary(RemoveParticipantReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (res.status) {
        dispatch(
          addUserNotification({
            message: 'Đã xóa người tham gia',
            typeOption: 'info',
          }),
        );
      } else {
        dispatch(
          addUserNotification({
            message: res.msg,
            typeOption: 'error',
          }),
        );
      }
    },
    [dispatch, participant],
  );

  const initials = generateAvatarInitial(participant.name);

  return (
    <div className="waiting-list-item mb-2 last:mb-0 pb-2 last:pb-0 border-b last:border-b-0 border-solid border-border w-full flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
      <div className="flex items-center gap-2 w-auto">
        <div className="thumb h-7 w-7 rounded-full bg-muted text-xs font-medium text-foreground flex items-center justify-center overflow-hidden shrink-0">
          {participant.metadata.profilePic ? (
            <img
              src={participant.metadata.profilePic}
              alt={participant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <p className="text-base text-foreground capitalize font-medium">
          {participant.name}
        </p>
      </div>
      <div className="flex gap-1 w-auto items-center justify-end">
        {isProcessing ? (
          <div className="w-10 h-6 flex justify-center items-center">
            <Loader2
              className="w-5 h-5 animate-spin text-primary"
            />
          </div>
        ) : (
          <>
            <Button
              onClick={handleApprove}
              size="xs"
            >
              Chấp thuận
            </Button>
            <Button
              onClick={() => handleReject(false)}
              variant="destructive"
              size="xs"
            >
              Từ chối
            </Button>
            <Button
              onClick={() => handleReject(true)}
              variant="destructive"
              size="xs"
            >
              Từ chối và chặn
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default WaitingParticipantItem;
