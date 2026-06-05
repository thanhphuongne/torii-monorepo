import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalDisplayLinkReqSchema,
  ExternalDisplayLinkTask,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import { updateDisplayExternalLinkRoomModal } from '@/store/slices/bottom-icons-activity-slice';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';

const useDisplayExternalLink = () => {
  const dispatch = useAppDispatch();
  const isActiveDisplayExternalLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const isActiveExternalMediaPlayer = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );

  const toggleDisplayExternalLinkModal = useCallback(async () => {
    if (!isActiveDisplayExternalLink) {
      if (isActiveExternalMediaPlayer) {
        dispatch(
          addUserNotification({
            message: 'Bạn cần tắt trình phát phương tiện bên ngoài trước.',
            typeOption: 'error',
          }),
        );
      } else {
        dispatch(updateDisplayExternalLinkRoomModal(true));
      }
      return;
    }
    const body = create(ExternalDisplayLinkReqSchema, {
      task: ExternalDisplayLinkTask.STOP_EXTERNAL_LINK,
    });

    const id = toast.loading('Vui lòng đợi...', {
      type: 'info',
    });

    const r = await sendAPIRequest(
      'externalDisplayLink',
      toBinary(ExternalDisplayLinkReqSchema, body),
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
      // open modal to let user select new link
      dispatch(updateDisplayExternalLinkRoomModal(true));
    }
  }, [isActiveDisplayExternalLink, isActiveExternalMediaPlayer, dispatch]);

  return { toggleDisplayExternalLinkModal, isActiveDisplayExternalLink };
};

export default useDisplayExternalLink;
