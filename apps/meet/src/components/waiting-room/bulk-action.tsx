import React from 'react';
import { Button } from '@workspace/ui/components/button';

import { IParticipant } from '@/store/slices/interfaces/participant';
import sendAPIRequest from '@/helpers/api/api-client';
import {
  ApproveWaitingUsersReqSchema,
  CommonResponseSchema,
  RemoveParticipantReqSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch } from '@/store';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';

interface IBulkActionProps {
  waitingParticipants: IParticipant[];
}

const BulkAction = ({ waitingParticipants }: IBulkActionProps) => {
  const dispatch = useAppDispatch();

  const approveEveryone = () => {
    const body = create(ApproveWaitingUsersReqSchema);

    waitingParticipants.forEach(async (p) => {
      body.userId = p.userId;
      const r = await sendAPIRequest(
        'waitingRoom/approveUsers',
        toBinary(ApproveWaitingUsersReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (!res.status) {
        dispatch(
          addUserNotification({
            message: res.msg,
            typeOption: 'error',
          }),
        );
      }
    });
  };

  const rejectEveryone = () => {
    const session = store.getState().session;
    const body = create(RemoveParticipantReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
    });

    waitingParticipants.forEach(async (p) => {
      body.userId = p.userId;
      body.msg = 'Bạn đã bị từ chối truy cập vào phòng';
      body.blockUser = false;

      const r = await sendAPIRequest(
        'removeParticipant',
        toBinary(RemoveParticipantReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (!res.status) {
        dispatch(
          addUserNotification({
            message: res.msg,
            typeOption: 'error',
          }),
        );
      }
    });
  };

  return (
    <div className="bottom-area pt-4 mt-4 text-foreground border-t border-border flex justify-end gap-2 sm:gap-5 -mx-4 px-4">
      <Button
        onClick={approveEveryone}
        className="w-full"
      >
        Chấp nhận tất cả
      </Button>
      <Button
        onClick={rejectEveryone}
        variant="destructive"
        className="w-full"
      >
        Từ chối tất cả
      </Button>
    </div>
  );
};

export default BulkAction;
