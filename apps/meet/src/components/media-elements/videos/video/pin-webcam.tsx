import React, { useCallback, useEffect, useState } from 'react';
import { Pin } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/store';
import { updatePinCamUserId } from '@/store/slices/roomSettingsSlice';

interface IPinWebcamProps {
  userId: string;
}

const PinWebcam = ({ userId }: IPinWebcamProps) => {
  const dispatch = useAppDispatch();
  const pinCamUserId = useAppSelector(
    (state) => state.roomSettings.pinCamUserId,
  );
  const [isPinCamActive, setIsPinCamActive] = useState<boolean>(false);

  useEffect(() => {
    setIsPinCamActive(!!(pinCamUserId && pinCamUserId === userId));
  }, [pinCamUserId, userId]);

  const togglePin = useCallback(() => {
    dispatch(updatePinCamUserId(isPinCamActive ? undefined : userId));
  }, [isPinCamActive, userId, dispatch]);

  return (
    <div
      className="pin-webcam cursor-pointer w-7 h-7 rounded-full bg-foreground/50 shadow-shadowXS flex items-center justify-center"
      onClick={togglePin}
    >
      {isPinCamActive ? (
        <Pin className="text-white w-3.5 h-3.5" />
      ) : (
        <Pin className="text-white w-3.5 h-3.5 -rotate-45" />
      )}
    </div>
  );
};

export default PinWebcam;
