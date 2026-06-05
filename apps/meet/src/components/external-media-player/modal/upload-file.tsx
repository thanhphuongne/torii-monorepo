import React, { useEffect, useState } from 'react';
import { RoomUploadedFileType } from '@workspace/protocol';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';

import { uploadResumableFile } from '@/helpers/file-upload';
import { File, Trash2 } from 'lucide-react';

interface IUploadFileProps {
  isPlayBtnLoading: boolean;
  onAfterFileUploaded(fileId: string, fileName: string, filePath: string): void;
  onFileSelectedForUpload(file: File): void;
}

const UploadFile = ({
  isPlayBtnLoading,
  onAfterFileUploaded,
  onFileSelectedForUpload,
}: IUploadFileProps) => {
  const [file, setFile] = useState<File | undefined>();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadingProgress, setUploadingProgress] = useState<number>(0);
  const [error, setError] = useState<string | undefined>();
  const allowedFileTypes = ['mp4', 'mp3', 'webm'];

  useEffect(() => {
    if (!file) {
      return;
    }
    setError(undefined);
    uploadResumableFile(
      allowedFileTypes,
      undefined,
      RoomUploadedFileType.EXTERNAL_MEDIA_PLAYER_FILE,
      [file],
      (result) => {
        onAfterFileUploaded(result.fileId, result.fileName, result.filePath);
        setFile(undefined);
      },
      (isUploading) => setIsUploading(isUploading),
      (progress) => setUploadingProgress(Math.round(progress * 100)),
      (errorMsg) => setError(errorMsg),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length) {
      const file = selectedFiles[0];
      setFile(file);
      onFileSelectedForUpload(file);
    }
  };

  return (
    <div className="upload-area relative min-h-20 mt-2.5 mb-4">
      {!file ? (
        <>
          <div className="absolute -bottom-7 text-sm font-medium text-foreground">
            Hỗ trợ các định dạng: {allowedFileTypes.map((type) => '.' + type).join(', ')}
          </div>
          <Input
            type="file"
            id="media-file"
            accept={allowedFileTypes.map((type) => '.' + type).join(',')}
            onChange={onChange}
            className="absolute left-0 w-full h-full top-0 opacity-0 cursor-pointer"
            disabled={isPlayBtnLoading}
          />
          <Label
            htmlFor="media-file"
            className="w-full h-full py-7 px-5 border border-dashed border-Blue cursor-pointer rounded-sm focus:shadow-input-focus flex items-center justify-center text-center text-foreground"
          >
            Chọn tệp
          </Label>
        </>
      ) : (
        <div
          className={`flex gap-4 py-2 px-3 bg-muted w-full rounded-xl ${error ? 'border border-Red-400' : ''
            }`}
        >
          <div className="icon w-9 h-9 rounded-full bg-sidebar-border text-Blue2-800 relative inline-flex items-center justify-center">
            <File className="w-4 h-4" />
          </div>
          <div className="text flex-1 text-foreground text-sm">
            <div className="top flex gap-3 justify-between">
              <div className="left">
                <p className="break-all">{file.name}</p>
                <div className="bottom flex justify-between text-foreground text-xs items-center pt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)}MB
                </div>
              </div>
              <div
                className="right cursor-pointer"
                onClick={() => !isUploading && setFile(undefined)}
              >
                <Trash2 className="w-4 h-4" />
              </div>
            </div>
            <div className="progress-bar flex gap-2 items-center">
              <div className="bar h-2 w-full relative bg-background rounded-full overflow-hidden">
                <div
                  className="inner gradient absolute w-full h-full top-0 left-0"
                  style={{ width: `${uploadingProgress}%` }}
                ></div>
              </div>
              <div className="count bg-background border border-input rounded-[7px] w-auto py-0.5 px-2">
                {uploadingProgress}%
              </div>
            </div>
            {error && <p className="text-xs pt-0.5 text-red-500">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadFile;
