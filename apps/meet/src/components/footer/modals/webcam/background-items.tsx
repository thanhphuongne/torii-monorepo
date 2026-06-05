import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Ban, Droplets } from 'lucide-react';
import { RoomUploadedFileType } from '@workspace/protocol';
import { Button } from '@workspace/ui/components/button';

import {
  BackgroundConfig,
  backgroundImageUrls,
} from '@/components/virtual-background/helpers/background-helper';
import useResumableFilesUpload from '@/helpers/hooks/use-resumable-files-upload';
import { useAppSelector } from '@/store';
import { SERVER_URL } from '@/config';

interface IBackgroundItemsProps {
  onSelect: (bg: BackgroundConfig) => void;
}

const BackgroundItems = ({ onSelect }: IBackgroundItemsProps) => {
  const allowedFileTypes = ['jpg', 'jpeg', 'png'];
  const selectedBg = useAppSelector(
    (state) => state.bottomIconsActivity.virtualBackground,
  );

  const [bgImgs, setBgImgs] = useState<Array<string>>(backgroundImageUrls);
  const [files, setFiles] = useState<Array<File>>();
  const customFileRef = useRef<HTMLInputElement>(null);

  const { isUploading, result } = useResumableFilesUpload({
    allowedFileTypes,
    maxFileSize: '30',
    files,
    fileType: RoomUploadedFileType.VIRTUAL_BACKGROUND,
  });

  useEffect(() => {
    if (result && result.filePath) {
      const path =
        SERVER_URL +
        '/download/uploadedFile/' +
        result.filePath;

      const newBgImgs = [...bgImgs];
      newBgImgs.push(path);
      setBgImgs([...newBgImgs]);

      const el = customFileRef.current;
      if (el) {
        el.value = '';
      }
    }
    //eslint-disable-next-line
  }, [result, customFileRef]);

  const handleOnClick = (type, url) => {
    const bg = {
      type,
      url,
    };
    onSelect(bg);
  };

  const customBgImage = (e: ChangeEvent<HTMLInputElement>) => {
    if (isUploading) {
      return;
    }
    const files = e.target.files;
    if (!files) {
      return;
    }
    setFiles([...files]);
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 md:h-[175px] overflow-auto scrollBar">
      <div
        className={`wrap overflow-hidden rounded-xl h-20 ${selectedBg.type === 'none' ? 'border-4 border-primary/20' : 'border-4 border-transparent'}`}
        onClick={() => handleOnClick('none', '')}
      >
        <div
          className={`cursor-pointer w-full h-full flex items-center justify-center bg-muted overflow-hidden ${selectedBg.type === 'none' ? 'border border-primary shadow-sm rounded-lg' : 'rounded-lg border border-border'}`}
        >
          <Ban className="w-5 h-5 text-foreground" />
        </div>
      </div>
      <div
        className={`wrap overflow-hidden rounded-xl h-20 ${selectedBg.type === 'blur-sm' ? 'border-4 border-primary/20' : 'border-4 border-transparent'}`}
        onClick={() => handleOnClick('blur-sm', '')}
      >
        <div
          className={`cursor-pointer w-full h-full flex items-center justify-center bg-muted overflow-hidden ${selectedBg.type === 'blur-sm' ? 'border border-primary shadow-sm rounded-lg' : 'rounded-lg border border-border'}`}
        >
          <Droplets className="w-5 h-5 text-foreground" />
        </div>
      </div>
      {bgImgs.map((imageUrl, i) => {
        return (
          <div
            className={`wrap overflow-hidden rounded-xl h-20 transition-all duration-200 ${selectedBg.url === imageUrl ? 'border-4 border-primary/20' : 'border-4 border-transparent'}`}
            onClick={() => handleOnClick('image', imageUrl)}
            key={imageUrl}
          >
            <div
              className={`cursor-pointer w-full h-full flex items-center justify-center bg-muted overflow-hidden ${selectedBg.url === imageUrl ? 'border border-primary shadow-sm rounded-lg' : 'rounded-lg border border-border'}`}
            >
              <img
                src={imageUrl}
                alt={`bg-${i + 1}`}
                className={`object-cover w-full h-full`}
              />
            </div>
          </div>
        );
      })}
      <div className="upload-btn-wrap relative border-4 border-transparent">
        <Button
          variant="outline"
          className="h-[72px] w-full border-dashed border-primary rounded-xl bg-muted"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <path
              d="M8 1V15M1 8H15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
        <input
          className="absolute left-0 top-0 opacity-0 w-full h-full cursor-pointer"
          ref={customFileRef}
          type="file"
          onChange={customBgImage}
          accept={allowedFileTypes.map((file) => '.' + file).join(',')}
        />
      </div>
    </div>
  );
};

export default BackgroundItems;
