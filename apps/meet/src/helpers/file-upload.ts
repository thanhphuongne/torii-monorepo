import { toast } from 'react-toastify';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  RoomUploadedFileType,
  UploadBase64EncodedDataReqSchema,
  UploadBase64EncodedDataResSchema,
  UploadedFileMergeReqSchema,
  UploadedFileRes,
  UploadedFileResSchema,
} from '@workspace/protocol';
import Resumable from 'resumablejs';

import { store } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { ISession } from '@/store/slices/interfaces/session';
import { sleep } from '@/helpers/utils';
import { SERVER_URL } from '@/config';
import ResumableFile = Resumable.ResumableFile;

export const uploadBase64EncodedFile = async (
  fileName: string,
  base64EncodedData: string,
  fileType: RoomUploadedFileType,
) => {
  const id = toast.loading('Đang tải lên tệp...', {
    type: 'info',
  });
  const parts = base64EncodedData.split('base64,');
  const body = create(UploadBase64EncodedDataReqSchema, {
    data: parts[1],
    fileName,
    fileType,
  });
  const r = await sendAPIRequest(
    'uploadBase64EncodedData',
    toBinary(UploadBase64EncodedDataReqSchema, body),
    false,
    'application/protobuf',
    'arraybuffer',
  );

  const res = fromBinary(UploadBase64EncodedDataResSchema, new Uint8Array(r));
  if (!res.status) {
    toast.update(id, {
      render: res.msg,
      type: 'error',
      isLoading: false,
      autoClose: 3000,
    });
    return undefined;
  }

  toast.update(id, {
    render: 'Tải lên tệp thành công',
    type: 'success',
    isLoading: false,
    autoClose: 1000,
  });

  return res;
};

interface IResumableUploaderArgs {
  allowedFileTypes: Array<string>;
  maxFileSize: string | undefined;
  fileType: RoomUploadedFileType;
  files: Array<File>;
  onSuccess: (result: UploadedFileRes) => void;
  isUploading?: (uploading: boolean) => void;
  uploadingProgress?: (progress: number) => void;
  onError?: (msg: string) => void;
}

let isUploadingFile = false; // Global lock to prevent multiple uploads from the same user session.

class ResumableUploader {
  private readonly resumable: Resumable;
  private toastId: string | number = '';
  private fileName = '';
  private readonly args: IResumableUploaderArgs;
  private readonly session: ISession;

  constructor(args: IResumableUploaderArgs) {
    this.args = args;
    this.session = store.getState().session;

    this.resumable = new Resumable({
      target: SERVER_URL + '/api/fileUpload',
      uploadMethod: 'POST',
      query: {
        roomSid: this.session.currentRoom.sid,
        roomId: this.session.currentRoom.roomId,
        userId: this.session.currentUser?.userId,
        resumable: true,
      },
      headers: {
        Authorization: this.session.token,
      },
      prioritizeFirstAndLastChunk: true,
      fileType: this.args.allowedFileTypes,
      // @ts-ignore
      maxFileSize: this.args.maxFileSize
        ? Number(this.args.maxFileSize) * 1000000
        : undefined,
      fileTypeErrorCallback: this.onFileTypeError,
      maxFileSizeErrorCallback: this.onMaxFileSizeError,
    });

    this.setupEventListeners();
  }

  private setupEventListeners = () => {
    this.resumable.on('fileAdded', this.onFileAdded);
    this.resumable.on('fileSuccess', this.onFileSuccess);
    this.resumable.on('fileError', this.onFileError);
    this.resumable.on('uploadStart', this.onUploadStart);
    this.resumable.on('fileProgress', this.onFileProgress);
  };

  private onFileAdded = (file: ResumableFile) => {
    this.fileName = file.fileName;
    if (!this.resumable.isUploading()) {
      this.args.isUploading?.(true);
      this.resumable.upload();
    }
  };

  private onFileSuccess = async (file: ResumableFile) => {
    await sleep(1000);

    const mergeReq = create(UploadedFileMergeReqSchema, {
      roomSid: this.session.currentRoom.sid,
      roomId: this.session.currentRoom.roomId,
      resumableIdentifier: file.uniqueIdentifier,
      resumableFilename: file.fileName,
      resumableTotalChunks: file.chunks.length,
      fileType: this.args.fileType,
    });

    const body = toBinary(UploadedFileMergeReqSchema, mergeReq);
    const r = await sendAPIRequest(
      '/uploadedFileMerge',
      body,
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(UploadedFileResSchema, new Uint8Array(r));

    this.cleanUp();

    if (res.status && res.filePath && res.fileName) {
      this.args.onSuccess(res);
    } else {
      this.args.onError?.(res.msg);
      toast(res.msg, { type: 'error' });
    }
  };

  private onFileError = (_file: ResumableFile, message: string) => {
    this.cleanUp();
    try {
      const res = JSON.parse(message);
      const msg = res.msg;
      store.dispatch(
        addUserNotification({ message: msg, typeOption: 'error' }),
      );
      this.args.onError?.(msg);
    } catch (e) {
      console.error(e);
      const msg = 'Đã xảy ra lỗi khi tải lên tệp';
      store.dispatch(
        addUserNotification({ message: msg, typeOption: 'error' }),
      );
      this.args.onError?.(msg);
    }
  };

  private onUploadStart = () => {
    this.toastId = toast(
      `Đang tải lên: ${this.fileName}`,
      {
        closeButton: false,
        progress: 0,
      },
    );
  };

  private onFileProgress = (file: ResumableFile) => {
    const progress = file.progress(false);
    this.args.uploadingProgress?.(Number(progress));
    toast.update(this.toastId, { progress: Number(progress) });
  };

  private onFileTypeError = (file: any) => {
    const msg = `Định dạng tệp không được hỗ trợ: ${file.type}`;
    this.args.onError?.(msg);
    store.dispatch(addUserNotification({ message: msg, typeOption: 'error' }));
    this.cleanUp(false); // Don't dismiss toast as it was never shown
  };

  private onMaxFileSizeError = () => {
    const msg = `Dung lượng tệp vượt quá giới hạn cho phép (${this.args.maxFileSize}MB)`;
    this.args.onError?.(msg);
    store.dispatch(addUserNotification({ message: msg, typeOption: 'error' }));
    this.cleanUp(false); // Don't dismiss toast as it was never shown
  };

  private cleanUp = (dismissToast = true) => {
    this.args.isUploading?.(false);
    isUploadingFile = false;
    if (dismissToast) {
      setTimeout(() => toast.dismiss(this.toastId), 300);
    }
  };

  public start = () => {
    if (isUploadingFile) {
      const msg = 'Vui lòng đợi tác vụ khác hoàn thành';
      this.args.onError?.(msg);
      store.dispatch(
        addUserNotification({ message: msg, typeOption: 'warning' }),
      );
      return;
    }
    isUploadingFile = true;
    this.resumable.addFiles(this.args.files);
  };
}

export const uploadResumableFile = (
  allowedFileTypes: Array<string>,
  maxFileSize: string | undefined,
  fileType: RoomUploadedFileType,
  files: Array<File>,
  onSuccess: (result: UploadedFileRes) => void,
  isUploading?: (uploading: boolean) => void,
  uploadingProgress?: (progress: number) => void,
  onError?: (msg: string) => void,
) => {
  const uploader = new ResumableUploader({
    allowedFileTypes,
    maxFileSize,
    fileType,
    files,
    onSuccess,
    isUploading,
    uploadingProgress,
    onError,
  });
  uploader.start();
};
