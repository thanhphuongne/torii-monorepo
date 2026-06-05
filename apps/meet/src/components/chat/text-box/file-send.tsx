import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChatFeatures, RoomUploadedFileType } from '@workspace/protocol';

import { useAppDispatch } from '@/store';
import useResumableFilesUpload from '@/helpers/hooks/use-resumable-files-upload';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { Loader2, Paperclip } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

interface IFileSendProps {
  lockSendFile: boolean;
  chatFeatures: ChatFeatures | undefined;
}

const FileSend = ({ lockSendFile, chatFeatures }: IFileSendProps) => {
  const inputFile = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const [files, setFiles] = useState<Array<File>>();

  const { accept, maxFileSize, canUpload } = useMemo(() => {
    const allowedTypes = chatFeatures?.allowedFileTypes;
    const canUpload = Array.isArray(allowedTypes) && allowedTypes.length > 0;
    const accept = canUpload
      ? allowedTypes.map((type) => '.' + type).join(',')
      : '';
    return { accept, maxFileSize: chatFeatures?.maxFileSize, canUpload };
  }, [chatFeatures?.allowedFileTypes, chatFeatures?.maxFileSize]);

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes: chatFeatures?.allowedFileTypes ?? [],
    maxFileSize,
    files,
    fileType: RoomUploadedFileType.CHAT_FILE,
  });

  useEffect(() => {
    if (result && result.filePath && result.fileName) {
      dispatch(
        addUserNotification({
          message: 'Tệp được tải lên thành công',
          typeOption: 'success',
        }),
      );
    }
    //eslint-disable-next-line
  }, [result]);

  const openFileBrowser = () => {
    if (!isUploading) {
      inputFile.current?.click();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) {
      return;
    }
    setFiles([...files]);
  };

  return (
    <div className="attached-wrap w-7 3xl:w-9 h-7 3xl:h-9 flex items-center justify-center">
      <input
        type="file"
        id="chat-file"
        ref={inputFile}
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => onChange(e)}
      />
      <Button
        disabled={lockSendFile || isUploading || !canUpload}
        onClick={() => openFileBrowser()}
        variant="ghost"
        size="icon-sm"
      >
        {isUploading ? (
          <Loader2
            className={'inline w-4 h-4 text-muted animate-spin'}
          />
        ) : (
          <Paperclip className="h-auto w-4 3xl:w-[18px] cursor-pointer text-foreground hover:text-primary transition-colors" />
        )}
      </Button>
    </div>
  );
};

export default FileSend;
