import React, { SetStateAction } from 'react';
import { Menu, MenuButton, MenuItem, Transition } from '@headlessui/react';
import { Check, Plus, ChevronUp, Mic } from 'lucide-react';
import { IMediaDevice } from '@/store/slices/interfaces/room-settings';
import { inputMediaDeviceKind } from '@/helpers/utils';
import { cn } from '@workspace/ui/lib/utils';

interface MicrophoneIconProps {
  audioDevices: IMediaDevice[];
  enableMediaDevices(type: inputMediaDeviceKind): Promise<void>;
  disableMic(): void;
  setSelectedAudioDevice: (value: SetStateAction<string>) => void;
  selectedAudioDevice: string;
  className?: string;
}

const MicrophoneIcon = ({
  audioDevices,
  setSelectedAudioDevice,
  selectedAudioDevice,
  enableMediaDevices,
  disableMic,
  className,
}: MicrophoneIconProps) => {
  return (
    <div
      className={cn(
        'microphone-wrap relative cursor-pointer shadow-sm border border-border rounded-xl h-11 min-w-11 flex items-center justify-center transition-all duration-300 hover:bg-muted text-foreground',
        className,
      )}
    >
      <div
        className="w-11 h-11 relative flex items-center justify-center"
        onClick={() =>
          audioDevices.length === 0 ? enableMediaDevices('audio') : disableMic()
        }
      >
        {audioDevices.length === 0 ? (
          <>
            <Mic className={'h-5 w-auto'} />
            <span className="add absolute -top-2 -right-2 z-10">
              <Plus className="w-4 h-4 text-white bg-primary rounded-full p-0.5" />
            </span>
          </>
        ) : (
          <Mic className={'h-5 w-auto'} />
        )}
      </div>
      {audioDevices.length > 0 && (
        <div className="menu relative">
          <Menu>
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
                  <div className="menu origin-top-right z-10 absolute ltr:-left-32 md:ltr:left-0 rtl:right-0 bottom-12 border border-border bg-popover shadow-lg rounded-xl overflow-hidden p-2 w-max">
                    <div className="title h-9 w-full flex items-center text-xs leading-none text-muted-foreground px-2 uppercase">
                      Chọn micrô
                    </div>
                    {audioDevices.map((device, i) => (
                      <div
                        className=""
                        role="none"
                        key={`${device.id}-${i}`}
                        onClick={() => setSelectedAudioDevice(device.id)}
                      >
                        <MenuItem>
                          {() => (
                            <p className="min-h-9 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-foreground px-2 rounded-lg transition-all duration-300 hover:bg-muted">
                              {device.label}
                              {selectedAudioDevice === device.id ? (
                                <Check className="w-4 h-4 text-primary" />
                              ) : (
                                ''
                              )}
                            </p>
                          )}
                        </MenuItem>
                      </div>
                    ))}
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

export default MicrophoneIcon;
