import React, {
  ClipboardEvent,
  KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import sanitizeHtml from 'sanitize-html';
import { isEmpty } from 'es-toolkit/compat';
import { RoomUploadedFileType } from '@workspace/protocol';

import { store, useAppDispatch, useAppSelector } from '@/store';
import FileSend from '@/components/chat/text-box/file-send';
import { getNatsConn } from '@/helpers/nats';
import { useAutosizeTextArea } from '@/components/chat/text-box/use-autosize-text-area';
import { uploadResumableFile } from '@/helpers/file-upload';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { Send } from 'lucide-react';
import { Textarea } from '@workspace/ui/components/textarea';
import { Button } from '@workspace/ui/components/button';

const urlRegex =
  /(\b(https?):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%?=~_|])/gi;

const TextBoxArea = () => {
  const dispatch = useAppDispatch();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const conn = getNatsConn();
  // Values that are static for the session
  const { isAdmin, chatFeatures } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      isAdmin: !!currentUser?.metadata?.isAdmin,
      chatFeatures: session.currentRoom.metadata?.roomFeatures?.chatFeatures,
    };
  }, []);

  const isLockChatSendMsg = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatSendMessage,
  );
  const isLockSendFile = useAppSelector(
    (state) =>
      state.session.currentUser?.metadata?.lockSettings?.lockChatFileShare,
  );
  const selectedChatOption = useAppSelector(
    (state) => state.roomSettings.selectedChatOption,
  );
  const defaultLockSettings = useAppSelector(
    (state) => state.session.currentRoom.metadata?.defaultLockSettings,
  );

  const [message, setMessage] = useState<string>('');
  useAutosizeTextArea(textAreaRef.current, message);
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value;

    setMessage(val);
  };

  const showSendFile = useMemo(
    () => !!chatFeatures?.isAllowFileUpload,
    [chatFeatures],
  );

  const isMsgSendingLocked = useMemo(() => {
    if (isAdmin) return false;

    // User-specific setting takes precedence.
    if (typeof isLockChatSendMsg !== 'undefined') {
      return isLockChatSendMsg;
    }
    // Otherwise, fall back to the room's default setting.
    return !!defaultLockSettings?.lockChatSendMessage;
  }, [isAdmin, isLockChatSendMsg, defaultLockSettings?.lockChatSendMessage]);

  const isFileSendingLocked = useMemo(() => {
    if (isAdmin) return false;

    // User-specific setting takes precedence.
    if (typeof isLockSendFile !== 'undefined') {
      return isLockSendFile;
    }
    // Otherwise, fall back to the room's default setting.
    return !!defaultLockSettings?.lockChatFileShare;
  }, [isAdmin, isLockSendFile, defaultLockSettings?.lockChatFileShare]);

  const cleanHtml = (rawText: string) => {
    return sanitizeHtml(rawText, {
      allowedTags: ['b', 'i', 'strong', 'br', 'a'],
      allowedAttributes: {
        a: ['href', 'target', 'class'],
      },
      allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    });
  };

  const sendMsg = useCallback(async () => {
    if (isSendingMsg || isMsgSendingLocked) {
      return;
    }
    if (conn) {
      const formattedMessage = message.replace(
        urlRegex,
        (url) =>
          `<a href="${url}" target="_blank" class="text-[#24aef7] hover:underline">${url}</a>`,
      );
      const msg = cleanHtml(formattedMessage);

      if (isEmpty(msg)) {
        return;
      }
      setIsSendingMsg(true);
      setMessage('');

      await conn.sendChatMsg(
        selectedChatOption,
        msg.replace(/\r?\n/g, '<br />'),
      );
      setIsSendingMsg(false);
    }
  }, [conn, message, selectedChatOption, isSendingMsg, isMsgSendingLocked]);

  const onEnterPress = useCallback(
    async (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await sendMsg();
      }
    },
    [sendMsg],
  );

  const handleOnPaste = useCallback(
    (e: ClipboardEvent) => {
      if (isFileSendingLocked || isMsgSendingLocked) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const files: File[] = [];
        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const f = items[i].getAsFile();
            if (f) {
              const extension = f.name.slice(
                ((f.name.lastIndexOf('.') - 1) >>> 0) + 2,
              );
              files.push(
                new File([f], Date.now().toString() + '.' + extension, {
                  type: f.type,
                  lastModified: f.lastModified,
                }),
              );
            }
          }
        }

        if (files.length) {
          uploadResumableFile(
            chatFeatures?.allowedFileTypes ?? [],
            chatFeatures?.maxFileSize,
            RoomUploadedFileType.CHAT_FILE,
            files,
            (result) => {
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
    },
    [isFileSendingLocked, isMsgSendingLocked, chatFeatures, dispatch],
  );

  const placeholderText = isSendingMsg
    ? 'Vui lòng đợi, đang gửi...'
    : 'Gửi tin nhắn, dán hình ảnh hoặc thả file tại đây (Dòng mới: Shift + Enter)';

  return (
    <div className="flex items-center justify-between border border-border rounded-xl p-1.5 w-full">
      {showSendFile && (
        <FileSend
          lockSendFile={isFileSendingLocked}
          chatFeatures={chatFeatures}
        />
      )}
      <Textarea
        name="message-textarea"
        id="message-textarea"
        className="flex-1 text-xs 3xl:text-sm h-10 mr-2 resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
        value={message}
        onChange={handleChange}
        disabled={isMsgSendingLocked}
        placeholder={placeholderText}
        onKeyDown={onEnterPress}
        ref={textAreaRef}
        rows={1}
        onPaste={handleOnPaste}
      />
      <Button
        disabled={isMsgSendingLocked || isSendingMsg}
        onClick={sendMsg}
        size="icon-sm"
        className={`rounded-full ${
          isEmpty(message) ? 'bg-primary/30' : 'bg-primary'
        } ${
          !isMsgSendingLocked && !isEmpty(message)
            ? 'cursor-pointer'
            : 'cursor-not-allowed'
        }`}
      >
        <Send className="w-4 h-4 text-primary-foreground" />
      </Button>
    </div>
  );
};

export default TextBoxArea;
