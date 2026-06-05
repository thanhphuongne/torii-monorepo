import React, { useCallback, useMemo, useState } from 'react';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  UpdateUserLockSettingsReqSchema,
} from '@workspace/protocol';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { updateShowLockSettingsModal } from '@/store/slices/bottom-icons-activity-slice';
import sendAPIRequest from '@/helpers/api/api-client';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import Modal from '@/helpers/ui/modal';
import SettingsSwitch from '@/helpers/ui/settings-switch';

const LockSettingsModal = () => {
  const dispatch = useAppDispatch();
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const { roomSid, roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      roomSid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  const roomLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );

  const updateLockSettings = useCallback(
    async (status: boolean, service: string) => {
      if (isBusy) {
        return;
      }
      setIsBusy(true);

      const direction = status ? 'lock' : 'unlock';
      const body = create(UpdateUserLockSettingsReqSchema, {
        roomSid,
        roomId,
        userId: 'all',
        service,
        direction,
      });

      const r = await sendAPIRequest(
        'updateLockSettings',
        toBinary(UpdateUserLockSettingsReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

      if (res.status) {
        dispatch(
          addUserNotification({
            message: 'Đã áp dụng cài đặt',
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

      setIsBusy(false);
    },
    // oxlint-disable-next-line exhaustive-deps
    [isBusy, dispatch],
  );

  const closeModal = () => {
    dispatch(updateShowLockSettingsModal(false));
  };

  const lockOptions = [
    {
      label: 'Khóa micro',
      checked: roomLockSettings?.lockMicrophone ?? false,
      service: 'mic',
    },
    {
      label: 'Khóa webcam',
      checked: roomLockSettings?.lockWebcam ?? false,
      service: 'webcam',
    },
    {
      label: 'Khóa chia sẻ màn hình',
      checked: roomLockSettings?.lockScreenSharing ?? false,
      service: 'screenShare',
    },
    {
      label: 'Khóa bảng trắng',
      checked: roomLockSettings?.lockWhiteboard ?? false,
      service: 'whiteboard',
    },
    {
      label: 'Khóa chat',
      checked: roomLockSettings?.lockChat ?? false,
      service: 'chat',
    },
    {
      label: 'Khóa gửi tin nhắn',
      checked: roomLockSettings?.lockChatSendMessage ?? false,
      service: 'sendChatMsg',
    },
    {
      label: 'Khóa chia sẻ tệp tin',
      checked: roomLockSettings?.lockChatFileShare ?? false,
      service: 'chatFile',
    },
    {
      label: 'Khóa chat riêng tư',
      checked: roomLockSettings?.lockPrivateChat ?? false,
      service: 'privateChat',
    },
  ];

  return (
    <Modal
      show={true}
      onClose={closeModal}
      title="Cài đặt khóa phòng"
    >
      {lockOptions.map((option, i) => (
        <SettingsSwitch
          key={option.service}
          label={option.label}
          enabled={option.checked}
          onChange={(e) => updateLockSettings(e, option.service)}
          disabled={isBusy}
          customCss={`${i > 0 ? 'mt-4' : ''}`}
        />
      ))}
    </Modal>
  );
};

export default LockSettingsModal;
