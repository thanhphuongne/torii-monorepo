import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  ActivatePollsReqSchema,
  CommonResponseSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';

const usePolls = () => {
  const dispatch = useAppDispatch();
  const isActivePoll = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures?.pollsFeatures?.isActive,
  );

  const togglePolls = useCallback(async () => {
    const id = toast.loading('Vui lòng đợi...', {
      type: 'info',
    });

    const body = create(ActivatePollsReqSchema, {
      isActive: !isActivePoll,
    });
    const r = await sendAPIRequest(
      'polls/activate',
      toBinary(ActivatePollsReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (!res.status) {
      toast.update(id, {
        render: res.msg,
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } else {
      toast.dismiss(id);
      dispatch(setActiveSidePanel('POLLS'));
    }
  }, [isActivePoll, dispatch]);

  return { togglePolls, isActivePoll };
};

export default usePolls;
