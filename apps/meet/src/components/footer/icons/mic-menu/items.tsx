import React, { useCallback } from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { Room, Track } from 'livekit-client';

import { useAppDispatch, useAppSelector } from '@/store';
import { updateSelectedAudioDevice } from '@/store/slices/roomSettingsSlice';
import {
  updateIsActiveMicrophone,
  updateIsMicMuted,
} from '@/store/slices/bottom-icons-activity-slice';
import { Check, Mic, MicOff, LogOut } from 'lucide-react';

interface IMicMenuItemsProps {
  currentRoom: Room;
  isActiveMicrophone: boolean;
  isMicMuted: boolean;
  onPrimaryAction: () => void;
}

const MicMenuItems = ({
  currentRoom,
  isActiveMicrophone,
  isMicMuted,
  onPrimaryAction,
}: IMicMenuItemsProps) => {
  const dispatch = useAppDispatch();

  const audioDevices = useAppSelector(
    (state) => state.roomSettings.audioDevices,
  );
  const selectedAudioDevice = useAppSelector(
    (state) => state.roomSettings.selectedAudioDevice,
  );

  const handleDeviceChange = useCallback(
    async (deviceId: string) => {
      await currentRoom.switchActiveDevice('audioinput', deviceId);
      dispatch(updateSelectedAudioDevice(deviceId));
    },
    [currentRoom, dispatch],
  );

  const muteUnmuteMic = useCallback(async () => {
    if (!currentRoom) return;
    for (const publication of currentRoom.localParticipant.audioTrackPublications.values()) {
      if (
        publication.track &&
        publication.track.source === Track.Source.Microphone
      ) {
        if (publication.isMuted) {
          await publication.track.unmute();
          dispatch(updateIsMicMuted(false));
        } else {
          await publication.track.mute();
          dispatch(updateIsMicMuted(true));
        }
      }
    }
  }, [currentRoom, dispatch]);

  const leaveMic = useCallback(async () => {
    if (!currentRoom) return;
    for (const publication of currentRoom.localParticipant.audioTrackPublications.values()) {
      if (publication.track && publication.kind === Track.Kind.Audio) {
        if (publication.track) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track,
            true,
          );
        }
      }
    }
    dispatch(updateIsActiveMicrophone(false));
    dispatch(updateIsMicMuted(false));
    dispatch(updateSelectedAudioDevice(''));
  }, [currentRoom, dispatch]);

  return (
    <MenuItems
      static
      className="menu origin-top-right z-10 absolute ltr:-left-8 md:ltr:left-0 rtl:right-0 bottom-12 border border-border bg-popover shadow-lg rounded-2xl overflow-hidden p-2 w-max"
    >
      <div className="title h-8 w-full flex items-center text-xs leading-none text-muted-foreground px-2 uppercase">
        Chọn micrô
      </div>
      {audioDevices.map((device) => (
        <MenuItem key={device.id}>
          {() => (
            <p
              className={`${selectedAudioDevice === device.id ? 'bg-muted' : ''
                } h-8 w-full flex items-center justify-between text-sm gap-2 leading-none font-medium text-foreground px-2 rounded-lg transition-all duration-300 hover:bg-muted`}
              onClick={() => handleDeviceChange(device.id)}
            >
              {device.label}
              {selectedAudioDevice === device.id ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                ''
              )}
            </p>
          )}
        </MenuItem>
      ))}
      <div className="divider h-1 w-[110%] bg-muted -ml-3 my-1"></div>
      <div className="" role="none">
        <MenuItem>
          {() => (
            <p
              className="h-8 w-full flex items-center text-sm gap-2 leading-none font-medium text-red-700 px-2 rounded-lg transition-all duration-300 hover:bg-Red-600 hover:text-white"
              onClick={isActiveMicrophone ? muteUnmuteMic : onPrimaryAction}
            >
              {!isActiveMicrophone ? (
                <>
                  <Mic className={'h-4 w-auto'} />
                  Bật micrô
                </>
              ) : isMicMuted ? (
                <>
                  <Mic className={'h-4 w-auto'} />
                  Bật micrô
                </>
              ) : (
                <>
                  <MicOff className={'h-4 w-auto'} />
                  Tắt micrô
                </>
              )}
            </p>
          )}
        </MenuItem>
      </div>
      <div className="" role="none">
        <MenuItem>
          {() => (
            <p
              className="group h-8 w-full flex items-center text-sm gap-2 leading-none font-medium px-2 rounded-lg transition-all duration-300 hover:bg-Red-600 hover:text-white text-red-700"
              onClick={leaveMic}
            >
              <LogOut className="w-4 h-4 transition ease-in" />
              Rời khỏi micrô
            </p>
          )}
        </MenuItem>
      </div>
    </MenuItems>
  );
};

export default MicMenuItems;
