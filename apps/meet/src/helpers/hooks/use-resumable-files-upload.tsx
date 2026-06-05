import { useEffect, useState } from 'react';
import { uploadResumableFile } from '@/helpers/file-upload';
import { RoomUploadedFileType, UploadedFileRes } from '@workspace/protocol';

export interface IUseResumableFilesUpload {
  allowedFileTypes: Array<string>;
  maxFileSize: string | undefined;
  files: Array<File> | undefined;
  fileType: RoomUploadedFileType;
}

const useResumableFilesUpload = ({
  allowedFileTypes,
  maxFileSize,
  files,
  fileType,
}: IUseResumableFilesUpload) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<UploadedFileRes>();

  useEffect(() => {
    if (files && files.length) {
      uploadResumableFile(
        allowedFileTypes,
        maxFileSize,
        fileType,
        files,
        (result) => {
          setResult(result);
        },
        (uploading) => setIsUploading(uploading),
      );
    }
    //eslint-disable-next-line
  }, [files]);

  return {
    isUploading,
    result,
  };
};

export default useResumableFilesUpload;
