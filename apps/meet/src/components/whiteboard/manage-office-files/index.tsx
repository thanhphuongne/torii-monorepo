import React, { useMemo, useRef, useState } from 'react';
import { Button as HeadlessButton, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { debounce } from 'es-toolkit';
import { X, Paperclip } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

import { updateCurrentWhiteboardOfficeFileId } from '@/store/slices/whiteboard';
import { store, useAppDispatch } from '@/store';
import FileUploadProgress from '@/components/whiteboard/manage-office-files/file-upload-progress';
import UploadedFilesList from '@/components/whiteboard/manage-office-files/uploaded-files-list';
import { IWhiteboardOfficeFile } from '@/store/slices/interfaces/whiteboard';
import { savePageData } from '@/components/whiteboard/helpers/utils';
import { broadcastCurrentFileId } from '@/components/whiteboard/helpers/handle-requests';
import { sleep } from '@/helpers/utils';

interface ManageOfficeFilesModalProps {
  roomId: string;
  excalidrawAPI: ExcalidrawImperativeAPI;
  isOpen: boolean;
  onClose: () => void;
  showSwitchingWarning: () => boolean;
}

const ManageOfficeFilesModal = ({
  roomId,
  excalidrawAPI,
  isOpen,
  onClose,
  showSwitchingWarning,
}: ManageOfficeFilesModalProps) => {
  const dispatch = useAppDispatch();

  const { allowedFileTypes, maxAllowedFileSize } = useMemo(() => {
    const maxAllowedFileSize =
      store.getState().session.currentRoom.metadata?.roomFeatures
        ?.whiteboardFeatures?.maxAllowedFileSize ?? '30';
    // prettier-ignore
    const allowedFileTypes: string[] = ['pdf', 'docx', 'doc', 'odt', 'txt', 'rtf', 'xml', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp', 'vsd', 'odg', 'html'];
    return {
      maxAllowedFileSize,
      allowedFileTypes,
    };
  }, []);

  const inputFile = useRef<HTMLInputElement>(null);
  const [fileToUpload, setFileToUpload] = useState<File | undefined>(undefined);
  const [selectedOfficeFile, setSelectedOfficeFile] = useState<
    IWhiteboardOfficeFile | undefined
  >(undefined);
  const [disableUploading, setDisableUploading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length) {
      setFileToUpload(selectedFiles[0]);
    }
  };

  const debouncedAddToWhiteboard = useMemo(
    () =>
      debounce(async (officeFile: IWhiteboardOfficeFile) => {
        if (!excalidrawAPI) {
          return;
        }
        // save current file information
        const { currentPage, currentWhiteboardOfficeFileId } =
          store.getState().whiteboard;
        if (currentWhiteboardOfficeFileId === officeFile.fileId) {
          // same file selected, nothing to do
          onClose();
          return;
        }

        await savePageData(
          excalidrawAPI.getSceneElementsIncludingDeleted(),
          currentPage,
          currentWhiteboardOfficeFileId,
        );
        // broadcast first so that user can prepare for file
        await broadcastCurrentFileId(officeFile.fileId);
        await sleep(300);
        // now update our store
        dispatch(updateCurrentWhiteboardOfficeFileId(officeFile.fileId));
        onClose();
      }, 300),
    [excalidrawAPI, dispatch, onClose],
  );

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-10 focus:outline-hidden"
      unmount={false}
      onClose={() => false}
    >
      <div className="excalidrawUploadFiles fixed inset-0 w-screen overflow-y-auto z-10 bg-foreground/70 dark:bg-foreground/80">
        <div className="flex min-h-full items-center justify-center py-4">
          <DialogPanel
            transition
            className="w-full max-w-lg bg-card border border-border shadow-xl rounded-xl overflow-hidden duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
          >
            <DialogTitle
              as="h3"
              className="flex items-center justify-between text-base font-semibold leading-7 text-foreground px-4 py-2 border-b border-border"
            >
              <span>Quản lý tệp</span>
              <HeadlessButton className="cursor-pointer" onClick={() => onClose()}>
                <X className="w-5 h-5" />
              </HeadlessButton>
            </DialogTitle>
            <div className="wrap p-4 bg-card">
              <div className="input-wrap relative rounded-xl border border-dashed border-border py-8 px-6 cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple={false}
                  disabled={disableUploading}
                  ref={inputFile}
                  onChange={handleFileChange}
                  accept={allowedFileTypes.join(',')}
                  className="w-full h-full absolute top-0 left-0 opacity-0 cursor-pointer"
                />
                <div className="text-wrap text-sm font-medium text-center cursor-pointer">
                  <p className="text-foreground font-semibold pb-1">
                    Kéo và thả tệp vào đây
                  </p>
                  <p className="text-muted-foreground">
                    Dung lượng tối đa {maxAllowedFileSize}MB
                  </p>
                  <div className="divider flex justify-center items-center gap-3 py-3">
                    <span className="line inline-block h-[1px] w-20 bg-border"></span>
                    <span className="text-muted-foreground">
                      Hoặc
                    </span>
                    <span className="line inline-block h-[1px] w-20 bg-border"></span>
                  </div>
                  <Button variant="outline" className="m-auto gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Chọn tệp từ thiết bị
                  </Button>
                </div>
              </div>
              <div className="file-preview-list grid gap-2 pt-4">
                {fileToUpload && (
                  <FileUploadProgress
                    key={fileToUpload.name + fileToUpload.lastModified}
                    excalidrawAPI={excalidrawAPI}
                    allowedFileTypes={allowedFileTypes}
                    maxAllowedFileSize={maxAllowedFileSize}
                    file={fileToUpload}
                    setDisableUploading={setDisableUploading}
                  />
                )}
                <UploadedFilesList
                  roomId={roomId}
                  excalidrawAPI={excalidrawAPI}
                  onSelectOfficeFile={setSelectedOfficeFile}
                  selectedOfficeFile={selectedOfficeFile}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-border">
              <button
                className="h-9 w-full flex items-center justify-center rounded-lg text-sm font-semibold text-foreground bg-muted hover:bg-muted/80 border border-border transition-all duration-300 shadow-sm cursor-pointer"
                onClick={() => onClose()}
              >
                Đóng
              </button>
              <button
                className="h-9 w-full flex items-center justify-center rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50"
                onClick={() => {
                  if (!showSwitchingWarning() && selectedOfficeFile)
                    debouncedAddToWhiteboard(selectedOfficeFile);
                }}
                disabled={selectedOfficeFile === undefined || disableUploading}
              >
                Thêm vào bảng trắng
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default React.memo(ManageOfficeFilesModal);
