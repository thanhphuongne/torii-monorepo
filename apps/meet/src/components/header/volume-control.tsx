import React, { useCallback, useEffect, useState } from 'react';
import { debounce } from 'es-toolkit';

import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Slider } from '@workspace/ui/components/slider';
import { cn } from '@workspace/ui/lib/utils';

import {
  updateRoomAudioVolume,
  updateRoomScreenShareAudioVolume,
} from '@/store/slices/roomSettingsSlice';
import { useAppDispatch, useAppSelector } from '@/store';
import { updateParticipant } from '@/store/slices/participant-slice';
import { Volume2, VolumeX } from 'lucide-react';

const VolumeControl = () => {
  const dispatch = useAppDispatch();

  const roomVolume = useAppSelector(
    (state) => state.roomSettings.roomAudioVolume,
  );
  const screenShareVolume = useAppSelector(
    (state) => state.roomSettings.roomScreenShareAudioVolume,
  );
  const participantIds = useAppSelector((state) => state.participants.ids);

  const [localRoomVolume, setLocalRoomVolume] = useState(roomVolume);
  const [localScreenShareVolume, setLocalScreenShareVolume] =
    useState(screenShareVolume);

  // Sync from Redux to local state if the values differ.
  useEffect(() => {
    if (roomVolume !== localRoomVolume) {
      setLocalRoomVolume(roomVolume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomVolume]);

  useEffect(() => {
    if (screenShareVolume !== localScreenShareVolume) {
      setLocalScreenShareVolume(screenShareVolume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenShareVolume]);

  // Debounce updates from local state back to Redux.
  // oxlint-disable-next-line exhaustive-deps
  const debouncedRoomVolumeUpdate = useCallback(
    debounce((newVolume: number) => {
      dispatch(updateRoomAudioVolume(newVolume));
      // Also update all individual participants
      participantIds.forEach((id) => {
        dispatch(
          updateParticipant({ id, changes: { audioVolume: newVolume } }),
        );
      });
    }, 200),
    [dispatch, participantIds],
  );

  // oxlint-disable-next-line exhaustive-deps
  const debouncedScreenShareVolumeUpdate = useCallback(
    debounce((newVolume: number) => {
      dispatch(updateRoomScreenShareAudioVolume(newVolume));
    }, 200),
    [dispatch],
  );

  useEffect(() => {
    debouncedRoomVolumeUpdate(localRoomVolume);
  }, [localRoomVolume, debouncedRoomVolumeUpdate]);

  useEffect(() => {
    debouncedScreenShareVolumeUpdate(localScreenShareVolume);
  }, [localScreenShareVolume, debouncedScreenShareVolumeUpdate]);

  const roomPercent = Math.round(localRoomVolume * 100);
  const screenSharePercent = Math.round(localScreenShareVolume * 100);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            'shrink-0 rounded-[10px] md:size-8 [&_svg]:size-5',
            'text-foreground',
          )}
          aria-label="Âm lượng"
        >
          {localRoomVolume > 0 ? (
            <Volume2 className="size-5" />
          ) : (
            <VolumeX className="size-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="volume-popup-wrapper z-10 w-64 gap-0 py-5 px-3 shadow-lg"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="meet-volume-room"
              className="text-sm font-normal text-foreground"
            >
              Âm lượng âm thanh phòng
            </Label>
            <div className="flex items-center gap-3 pl-1">
              <Slider
                id="meet-volume-room"
                min={0}
                max={100}
                step={1}
                value={[roomPercent]}
                onValueChange={(v) => setLocalRoomVolume((v[0] ?? 0) / 100)}
                className="min-w-0 flex-1 py-2"
              />
              <p className="w-10 shrink-0 text-center text-sm tabular-nums text-foreground">
                {roomPercent}
              </p>
              <div className="flex size-5 shrink-0 items-center justify-center">
                {localRoomVolume > 0 ? (
                  <Volume2 className="size-4 text-foreground" />
                ) : (
                  <VolumeX className="size-4 text-foreground" />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="meet-volume-screenshare"
              className="text-sm font-normal text-foreground"
            >
              Âm lượng âm thanh chia sẻ màn hình
            </Label>
            <div className="flex items-center gap-3 pl-1">
              <Slider
                id="meet-volume-screenshare"
                min={0}
                max={100}
                step={1}
                value={[screenSharePercent]}
                onValueChange={(v) =>
                  setLocalScreenShareVolume((v[0] ?? 0) / 100)
                }
                className="min-w-0 flex-1 py-2"
              />
              <p className="w-10 shrink-0 text-center text-sm tabular-nums text-foreground">
                {screenSharePercent}
              </p>
              <div className="flex size-5 shrink-0 items-center justify-center">
                {localScreenShareVolume > 0 ? (
                  <Volume2 className="size-4 text-foreground" />
                ) : (
                  <VolumeX className="size-4 text-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default VolumeControl;
