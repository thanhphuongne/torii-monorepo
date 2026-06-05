import React, { useEffect, useRef } from 'react';
import {
  GetRoomUploadedFilesReqSchema,
  GetRoomUploadedFilesResSchema,
  RoomUploadedFileType,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

import { useAppSelector } from '@/store';
import { File, CheckCircle } from 'lucide-react';
import {
  IWhiteboardOfficeFile,
  WhiteboardFileConversionRes,
} from '@/store/slices/interfaces/whiteboard';
import sendAPIRequest from '@/helpers/api/api-client';
import { createAndRegisterOfficeFile } from '@/components/whiteboard/helpers/handle-files';

interface UploadedFilesListProps {
  roomId: string;
  excalidrawAPI: ExcalidrawImperativeAPI;
  onSelectOfficeFile: (fileId: IWhiteboardOfficeFile) => void;
  selectedOfficeFile?: IWhiteboardOfficeFile;
}

const UploadedFilesList = ({
  roomId,
  excalidrawAPI,
  onSelectOfficeFile,
  selectedOfficeFile,
}: UploadedFilesListProps) => {
  const isFetched = useRef(false);

  const whiteboardUploadedOfficeFiles = useAppSelector(
    (state) => state.whiteboard.whiteboardUploadedOfficeFiles,
  );
  const currentWhiteboardOfficeFileId = useAppSelector(
    (state) => state.whiteboard.currentWhiteboardOfficeFileId,
  );

  useEffect(() => {
    const fetchAndUpdateFiles = async () => {
      const body = create(GetRoomUploadedFilesReqSchema, {
        roomId: roomId,
        fileType: RoomUploadedFileType.WHITEBOARD_CONVERTED_FILE,
      });
      const r = await sendAPIRequest(
        'getRoomFilesByType',
        toBinary(GetRoomUploadedFilesReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(GetRoomUploadedFilesResSchema, new Uint8Array(r));
      if (!res.status || !res.files) {
        return;
      }

      // let's compare with local store
      res.files.forEach((file) => {
        const exist = whiteboardUploadedOfficeFiles.find(
          (f) => f.fileId === file.fileId,
        );
        if (!exist) {
          const newFile: WhiteboardFileConversionRes = {
            msg: '',
            status: true,
            fileId: file.fileId,
            fileName: file.fileName,
            filePath: file.filePath,
            totalPages: file.totalPages ?? 0,
          };
          createAndRegisterOfficeFile(
            newFile,
            excalidrawAPI.getAppState().height,
            excalidrawAPI.getAppState().width,
          );
        }
      });
    };

    if (!isFetched.current) {
      isFetched.current = true;
      fetchAndUpdateFiles().then();
    }
    // oxlint-disable-next-line exhaustive-deps
  }, []);

  return (
    <div className="max-h-40 overflow-y-auto scrollBar grid gap-2">
      {whiteboardUploadedOfficeFiles.map((file) => {
        const isCurrentlyInUse = currentWhiteboardOfficeFileId === file.fileId;
        const isSelectedInModal = selectedOfficeFile?.fileId === file.fileId;

        let classNames =
          'flex gap-4 py-2 px-3 w-full rounded-xl cursor-pointer transition-all duration-200';
        if (isSelectedInModal) {
          classNames +=
            ' border-2 border-primary bg-primary/5';
        } else {
          classNames +=
            ' border-2 border-border bg-card hover:bg-muted/50';
        }

        return (
          <div
            key={file.fileId}
            className={classNames}
            onClick={() => onSelectOfficeFile(file)}
          >
            <div className="icon w-9 h-9 rounded-full bg-muted text-foreground relative inline-flex items-center justify-center">
              <File className="w-4 h-4" />
            </div>
            <div className="text flex-1 text-foreground text-sm">
              <div className="top flex gap-3 justify-between">
                <div className="left">
                  <p className="break-all">{file.fileName}</p>
                </div>
                <div className="right">
                  {isCurrentlyInUse && <CheckCircle className="w-5 h-5 text-primary" />}
                </div>
              </div>
              <div className="progress-bar flex gap-2 items-center text-xs pt-0.5 text-muted-foreground">
                Tổng {file.totalPages} trang
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UploadedFilesList;
