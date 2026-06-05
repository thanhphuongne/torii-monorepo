import React, { useCallback, useMemo, useState } from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  UpdateUserLockSettingsReqSchema,
} from '@workspace/protocol';

import { store, useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { ICurrentUserMetadata } from '@/store/slices/interfaces/session';
import sendAPIRequest from '@/helpers/api/api-client';

interface ILockSettingMenuItemProps {
  userId: string;
}

const serviceToLockSettingMap: Record<
  string,
  keyof NonNullable<ICurrentUserMetadata['lockSettings']>
> = {
  mic: 'lockMicrophone',
  webcam: 'lockWebcam',
  screenShare: 'lockScreenSharing',
  whiteboard: 'lockWhiteboard',

  chat: 'lockChat',
  sendChatMsg: 'lockChatSendMessage',
  chatFile: 'lockChatFileShare',
};

const LockSettingMenuItem = ({ userId }: ILockSettingMenuItemProps) => {
  const [isBusy, setIsBusy] = useState<boolean>(false);

  // all static values
  const { roomId, sid, roomFeatures } = useMemo(() => {
    const session = store.getState().session;
    return {
      roomId: session.currentRoom.roomId,
      sid: session.currentRoom.sid,
      roomFeatures: session.currentRoom.metadata?.roomFeatures,
    };
  }, []);

  const lockSettings = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata?.lockSettings,
  );

  const toggleLockSetting = useCallback(
    async (task: string) => {
      if (isBusy) {
        return;
      }
      setIsBusy(true);

      const settingKey = serviceToLockSettingMap[task];
      const isLocked = !!lockSettings?.[settingKey];
      const direction = isLocked ? 'unlock' : 'lock';

      const body = create(UpdateUserLockSettingsReqSchema, {
        roomSid: sid,
        roomId: roomId,
        userId: userId,
        service: task,
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
        toast('Đã áp dụng cài đặt mới.', {
          toastId: 'lock-setting-status',
          type: 'info',
        });
      } else {
        toast(res.msg, {
          type: 'error',
        });
      }
      setIsBusy(false);
    },
    [userId, sid, roomId, isBusy, lockSettings],
  );

  const lockableFeatures = [
    {
      key: 'mic',
      isDisplayed: true,
      isLocked: lockSettings?.lockMicrophone,
      lockText: 'Khóa micrô',
      unlockText: 'Mở khóa micrô',
    },
    {
      key: 'webcam',
      isDisplayed:
        roomFeatures?.allowWebcams && !roomFeatures?.adminOnlyWebcams,
      isLocked: lockSettings?.lockWebcam,
      lockText: 'Khóa máy ảnh',
      unlockText: 'Mở khóa máy ảnh',
    },
    {
      key: 'screenShare',
      isDisplayed: roomFeatures?.allowScreenShare,
      isLocked: lockSettings?.lockScreenSharing,
      lockText: 'Khóa chia sẻ màn hình',
      unlockText: 'Mở khóa chia sẻ màn hình',
    },
    {
      key: 'whiteboard',
      isDisplayed: roomFeatures?.whiteboardFeatures?.isAllow,
      isLocked: lockSettings?.lockWhiteboard,
      lockText: 'Khóa bảng trắng',
      unlockText: 'Mở khóa bảng trắng',
    },

    {
      key: 'chat',
      isDisplayed: roomFeatures?.chatFeatures?.isAllow,
      isLocked: lockSettings?.lockChat,
      lockText: 'Khóa trò chuyện',
      unlockText: 'Mở khóa trò chuyện',
    },
    {
      key: 'sendChatMsg',
      isDisplayed: roomFeatures?.chatFeatures?.isAllow,
      isLocked: lockSettings?.lockChatSendMessage,
      lockText: 'Khóa gửi tin nhắn trò chuyện',
      unlockText: 'Mở khóa gửi tin nhắn trò chuyện',
    },
    {
      key: 'chatFile',
      isDisplayed:
        roomFeatures?.chatFeatures?.isAllow &&
        roomFeatures?.chatFeatures?.isAllowFileUpload,
      isLocked: lockSettings?.lockChatFileShare,
      lockText: 'Khóa gửi tệp',
      unlockText: 'Mở khóa gửi tệp',
    },
  ];

  return lockableFeatures.map(
    (feature) =>
      feature.isDisplayed && (
        <div role="none" key={feature.key}>
          <MenuItem>
            {() => (
              <button
                className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-foreground px-3 rounded-lg transition-all duration-300 hover:bg-muted"
                onClick={() => toggleLockSetting(feature.key)}
              >
                {feature.isLocked ? feature.unlockText : feature.lockText}
              </button>
            )}
          </MenuItem>
        </div>
      ),
  );
};

export default LockSettingMenuItem;
