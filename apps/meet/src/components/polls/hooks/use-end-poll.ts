import { useEffect } from 'react';
import { create } from '@bufbuild/protobuf';
import { ClosePollReqSchema } from '@workspace/protocol';

import { useClosePollMutation } from '@/store/services/polls-api';
import { useAppDispatch } from '@/store';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';

export const useEndPoll = () => {
  const dispatch = useAppDispatch();
  const [closePoll, { data: closePollRes, isLoading }] = useClosePollMutation();

  useEffect(() => {
    if (closePollRes) {
      if (closePollRes.status) {
        dispatch(
          addUserNotification({
            message: 'Đã kết thúc bình chọn thành công',
            typeOption: 'info',
          }),
        );
      } else {
        dispatch(
          addUserNotification({
            message: closePollRes.msg,
            typeOption: 'error',
          }),
        );
      }
    }
  }, [closePollRes, dispatch]);

  const endPoll = (pollId: string) => {
    if (isLoading) {
      return;
    }
    closePoll(
      create(ClosePollReqSchema, {
        pollId,
      }),
    );
  };

  return { endPoll, isEndingPoll: isLoading };
};
