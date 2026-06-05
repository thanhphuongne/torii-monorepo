import React from 'react';
import {
  ApproveWaitingUsersReqSchema,
  CommonResponseSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import sendAPIRequest from '@/helpers/api/api-client';
import { X, Check } from 'lucide-react';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { Button } from '@workspace/ui/components/button';

interface IWaitingApprovalProps {
  userId: string;
  name: string;
  openRemoveParticipantAlert(userId: string, type: string): void;
}
const WaitingApproval = ({
  userId,
  name,
  openRemoveParticipantAlert,
}: IWaitingApprovalProps) => {
  const waitForApproval = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.waitForApproval,
  );
  const dispatch = useAppDispatch();

  const approve = async () => {
    const body = create(ApproveWaitingUsersReqSchema, {
      userId: userId,
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
          message: `Đã phê duyệt người dùng ${name} thành công.`,
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
  };

  const reject = () => {
    openRemoveParticipantAlert(userId, 'reject');
  };

  return (
    waitForApproval && (
      <div className="approve-btn-wrap absolute right-0 top-0 flex gap-2 items-center justify-end h-full px-2 w-auto bg-card/80 backdrop-blur-sm z-10 transition-all rounded-r-lg">
        <Button
          className="h-6 px-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-sm transition-all"
          onClick={approve}
        >
          <Check className="w-4 h-4" />
          Duyệt
        </Button>
        <Button
          className="h-6 w-6 flex items-center justify-center rounded-md text-destructive-foreground bg-destructive hover:bg-destructive/90 shadow-sm transition-all"
          onClick={reject}
          size="icon"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  );
};

export default WaitingApproval;
