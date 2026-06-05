import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  RoomUploadedFileType,
} from '@workspace/protocol';

import { File, Trash2 } from 'lucide-react';
import { sleep } from '@/helpers/utils';
import { store } from '@/store';
import { getNatsConn } from '@/helpers/nats';
import sendAPIRequest from '@/helpers/api/api-client';
import {
  WhiteboardFileConversionReq,
  WhiteboardFileConversionRes,
} from '@/store/slices/interfaces/whiteboard';
import { createAndRegisterOfficeFile } from '@/components/whiteboard/helpers/handle-files';
import { uploadResumableFile } from '@/helpers/file-upload';

interface FileUploadProgressProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  allowedFileTypes: string[];
  maxAllowedFileSize: string;
  file: File;
  setDisableUploading: Dispatch<SetStateAction<boolean>>;
}
type message = {
  isError: boolean;
  msg: string;
};
const FileUploadProgress = ({
  excalidrawAPI,
  allowedFileTypes,
  maxAllowedFileSize,
  file,
  setDisableUploading,
}: FileUploadProgressProps) => {
  const conn = getNatsConn();

  const { roomSid, roomId, userId } = useMemo(() => {
    const { currentRoom, currentUser } = store.getState().session;
    return {
      roomSid: currentRoom.sid,
      roomId: currentRoom.roomId,
      userId: currentUser?.userId,
    };
  }, []);

  const [uploadingProgress, setUploadingProgress] = useState<number>(0);
  const [message, setMessage] = useState<message | undefined>(undefined);
  const [removeView, setRemoveView] = useState<boolean>(false);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const uploadInitiated = useRef(false);

  useEffect(() => {
    setDisableUploading(isWorking);
    // oxlint-disable-next-line exhaustive-deps
  }, [isWorking]);

  useEffect(() => {
    if (uploadInitiated.current) {
      return;
    }
    uploadInitiated.current = true;
    const files: File[] = [file];

    uploadResumableFile(
      allowedFileTypes,
      maxAllowedFileSize,
      RoomUploadedFileType.WHITEBOARD_CONVERTED_FILE,
      files,
      (result) => convertFile(result.filePath),
      (isWorking) => setIsWorking(isWorking),
      (uploadProgress) =>
        setUploadingProgress(Math.round(uploadProgress * 100)),
      (errMsg) => setMessage({ isError: true, msg: errMsg }),
    );
    // oxlint-disable-next-line
  }, [uploadInitiated, file]);

  const convertFile = async (filePath: string) => {
    const id = toast.loading('Đang chuyển đổi...', {
      type: 'info',
    });
    setMessage({ isError: false, msg: 'Đang chuyển đổi...' });
    setIsWorking(true);
    const body: WhiteboardFileConversionReq = {
      roomSid: roomSid,
      roomId: roomId,
      userId: userId ?? '',
      filePath: filePath,
    };

    const res: WhiteboardFileConversionRes = await sendAPIRequest(
      'convertWhiteboardFile',
      body,
    );
    if (!res.status) {
      setMessage({ isError: true, msg: res.msg });
      setIsWorking(false);
      toast.update(id, {
        render: res.msg,
        type: 'error',
        isLoading: false,
        closeButton: true,
      });
      return;
    }

    const newFile = createAndRegisterOfficeFile(
      res,
      excalidrawAPI.getAppState().height,
      excalidrawAPI.getAppState().width,
    );

    // send analytics
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_USER_WHITEBOARD_FILES,
      AnalyticsEventType.USER,
      newFile.fileName,
    );
    conn.sendAnalyticsData(
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_WHITEBOARD_FILES,
      AnalyticsEventType.ROOM,
      newFile.fileName,
    );

    toast.update(id, {
      render: 'Tệp đã sẵn sàng',
      type: 'success',
      isLoading: false,
      autoClose: 1000,
    });
    setMessage({ isError: false, msg: 'Tệp đã sẵn sàng' });
    await sleep(1000);
    setRemoveView(true);
    setIsWorking(false);
  };

  const handleDelete = useCallback(() => {
    if (!isWorking) {
      setRemoveView(true);
    }
  }, [isWorking]);

  return (
    !removeView && (
      <div
        className={`flex gap-4 py-2 px-3 bg-muted/30 w-full rounded-xl ${message && message.isError ? 'border border-destructive/50' : ''}`}
      >
        <div className="icon w-9 h-9 rounded-full bg-muted text-foreground relative inline-flex items-center justify-center">
          <File className="w-4 h-4" />
        </div>
        <div className="text flex-1 text-foreground text-sm">
          <div className="top flex gap-3 justify-between">
            <div className="left">
              <p className="break-all font-medium">{file.name}</p>
              <div className="bottom flex justify-between text-muted-foreground text-xs items-center pt-1">
                {(file.size / (1024 * 1024)).toFixed(2)}MB
              </div>
            </div>
            <div className="right cursor-pointer" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="progress-bar flex gap-2 items-center">
            {message ? (
              <p
                className={`text-xs pt-0.5 ${message.isError ? 'text-destructive' : 'text-primary'}`}
              >
                {message.msg}
              </p>
            ) : (
              <>
                <div className="bar h-2 w-full relative bg-muted rounded-full overflow-hidden">
                  <div
                    className="inner bg-primary absolute w-full h-full top-0 left-0"
                    style={{ width: `${uploadingProgress}%` }}
                  ></div>
                </div>
                <div className="count bg-muted border border-border rounded-lg w-auto py-0.5 px-2">
                  {uploadingProgress}%
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default FileUploadProgress;
