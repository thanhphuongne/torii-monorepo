import React from 'react';
import { Monitor } from 'lucide-react';

import { useAppSelector } from '@/store';
import IconWrapper from '@/components/participants/participant/icons/icon-wapper';
import { participantsSelector } from '@/store/slices/participant-slice';

interface IScreenShareIconProps {
  userId: string;
}

const ScreenShareIcon = ({ userId }: IScreenShareIconProps) => {
  const screenShareTrack = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.screenShareTrack,
  );

  return (
    screenShareTrack > 0 && (
      <IconWrapper>
        <Monitor className="text-foreground dark:text-white w-2.5 h-2.5 3xl:w-3.5 3xl:h-3.5" />
      </IconWrapper>
    )
  );
};

export default ScreenShareIcon;
