import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';
import { Video, Check, Plus, ChevronUp } from 'lucide-react';
import { updateShowVideoShareModal } from '@/store/slices/bottom-icons-activity-slice';
import { useAppDispatch, useAppSelector } from '@/store';
import { IMediaDevice } from '@/store/slices/interfaces/room-settings';
import ShareWebcamModal from '@/components/footer/modals/webcam';
import { inputMediaDeviceKind } from '@/helpers/utils';
import { cn } from '@workspace/ui/lib/utils';

interface WebcamIconProps {
  videoDevices: IMediaDevice[];
  enableMediaDevices(type: inputMediaDeviceKind): Promise<void>;
  disableWebcam(): void;
  setSelectedVideoDevice: (value: SetStateAction<string>) => void;
  selectedVideoDevice: string;
  /** Khi true, không mount ShareWebcamModal (để parent render một lần). */
  hideShareModal?: boolean;
  className?: string;
}

const WebcamIcon = ({
  videoDevices,
  enableMediaDevices,
  disableWebcam,
  setSelectedVideoDevice,
  selectedVideoDevice,
  hideShareModal = false,
  className,
}: WebcamIconProps) => {
  const dispatch = useAppDispatch();

  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );

  return (
    <div
      className={cn(
        'cam-wrap relative cursor-pointer shadow-sm border border-border rounded-xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-muted text-foreground',
        className,
      )}
    >
      {showVideoShareModal && !hideShareModal && (
        <ShareWebcamModal
          displayWebcamSelection={false}
          onSelectedDevice={setSelectedVideoDevice}
          selectedDeviceId={selectedVideoDevice}
        />
      )}
      <div
        className="w-11 h-11 relative flex items-center justify-center"
        onClick={() =>
          videoDevices.length === 0
            ? enableMediaDevices('video')
            : disableWebcam()
        }
      >
        {videoDevices.length === 0 ? (
          <>
            <Video className={'h-5 w-auto'} />
            <span className="add absolute -top-2 -right-2 z-10">
              <Plus className="w-4 h-4 text-white bg-primary rounded-full p-0.5" />
            </span>
          </>
        ) : (
          <Video className={'h-5 w-auto'} />
        )}
      </div>
      {videoDevices.length > 0 && (
        <div className="menu relative">
          <Menu as="div">
            {({ open }) => (
              <>
                <MenuButton
                  className={`w-[30px] h-11 flex items-center justify-center border border-border rounded-r-xl ${open ? 'bg-muted' : 'bg-secondary'}`}
                >
                  <ChevronUp className="w-4 h-4" />
                </MenuButton>
                <Transition
                  as={'div'}
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <div className="menu origin-top-right z-10 absolute ltr:left-auto md:ltr:left-0 ltr:-right-16 md:rtl:right-0 bottom-12 border border-border bg-popover shadow-lg rounded-xl overflow-hidden p-2 w-max">
                    <div className="title h-9 w-full flex items-center text-xs leading-none text-muted-foreground px-2 uppercase">
                      Chọn máy ảnh
                    </div>
                    {videoDevices.map((device, i) => (
                      <div className="" role="none" key={`${device.id}-${i}`}>
                        <MenuItem>
                          {() => (
                            <p
                              className={`min-h-9 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-foreground px-2 rounded-lg transition-all duration-300 hover:bg-muted`}
                              onClick={() => setSelectedVideoDevice(device.id)}
                            >
                              {device.label}
                              {selectedVideoDevice === device.id ? (
                                <Check className="w-4 h-4 text-primary" />
                              ) : (
                                ''
                              )}
                            </p>
                          )}
                        </MenuItem>
                      </div>
                    ))}
                    <div className="divider w-[calc(100%+16px)] relative -left-2 h-px bg-border mt-2"></div>
                    <div className="title h-9 w-full flex items-center text-xs leading-none text-muted-foreground px-2 uppercase">
                      Hiệu ứng nền
                    </div>
                    <p
                      className="min-h-9 w-full flex items-center text-sm gap-2 leading-none font-medium text-foreground px-2 rounded-lg transition-all duration-300 hover:bg-muted cursor-pointer"
                      onClick={() =>
                        dispatch(
                          updateShowVideoShareModal(!showVideoShareModal),
                        )
                      }
                    >
                      Cấu hình nền & bộ lọc
                    </p>
                  </div>
                </Transition>
              </>
            )}
          </Menu>
        </div>
      )}
    </div>
  );
};

export default WebcamIcon;
