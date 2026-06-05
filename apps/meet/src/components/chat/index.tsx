import React, { useMemo } from 'react';
import { RoomUploadedFileType } from '@workspace/protocol';

import TextBoxArea from '@/components/chat/text-box';
import ChatTabs from '@/components/chat/chat-tabs';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { uploadResumableFile } from '@/helpers/file-upload';

const ChatComponent = () => {
  const dispatch = useAppDispatch();
  // Values that are static for the session
  const { isRecorder, isAdmin, chatFeatures } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      isRecorder: !!currentUser?.isRecorder,
      isAdmin: !!currentUser?.metadata?.isAdmin,
      chatFeatures: session.currentRoom.metadata?.roomFeatures?.chatFeatures,
    };
  }, []);

  // Values that can change during the session (e.g., admin changes lock settings)
  const isChatLocked = useAppSelector(
    (state) => state.session.currentUser?.metadata?.lockSettings?.lockChat,
  );
  const isLockChatSendMessage = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatSendMessage,
  );
  const isLockChatFileShare = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatFileShare,
  );
  const defaultLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );

  const canShowChatInput = useMemo(() => {
    // Recorders can never chat.
    if (isRecorder) {
      return false;
    }
    // Admins can always chat (unless they are a recorder, which is handled above).
    if (isAdmin) {
      return true;
    }

    // Determine the final lock status by respecting user-specific overrides.
    let finalChatLockStatus = defaultLockSettings?.lockChat;
    if (typeof isChatLocked !== 'undefined') {
      // User-specific setting takes precedence.
      finalChatLockStatus = isChatLocked;
    }

    let finalMsgSendLockStatus = defaultLockSettings?.lockChatSendMessage;
    if (typeof isLockChatSendMessage !== 'undefined') {
      // User-specific setting takes precedence.
      finalMsgSendLockStatus = isLockChatSendMessage;
    }

    // A non-admin can chat if neither the chat feature nor message sending is locked.
    return !finalChatLockStatus && !finalMsgSendLockStatus;
  }, [
    isRecorder,
    isAdmin,
    isChatLocked,
    isLockChatSendMessage,
    defaultLockSettings,
  ]);

  const handleOnDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (isLockChatSendMessage || isLockChatFileShare) {
      return;
    }

    if (e.dataTransfer && e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length) {
        uploadResumableFile(
          chatFeatures?.allowedFileTypes ?? [],
          chatFeatures?.maxFileSize,
          RoomUploadedFileType.CHAT_FILE,
          files,
          (_result) => {
            dispatch(
              addUserNotification({
                message: 'Tệp được tải lên thành công',
                typeOption: 'success',
              }),
            );
          },
        );
      }
    }
  };

  return (
    <div
      className="side-panel-bg-color relative z-10 w-full bg-card border-l border-border h-full flex flex-col"
      onDrop={handleOnDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="flex-1 min-h-0">
        <div className="all-MessageModule-wrap h-full">
          <ChatTabs />
        </div>
      </div>
      {canShowChatInput && (
        <div className="side-panel-bg-color message-form relative z-30 shrink-0 border-t border-border bg-card w-full px-3 3xl:px-5 py-2 3xl:py-4 flex items-center">
          <TextBoxArea />
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
