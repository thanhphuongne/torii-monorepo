import React from 'react';
import { EyeOff } from 'lucide-react';
import { useAppSelector } from '@/store';
import IconWrapper from '@/components/participants/participant/icons/icon-wapper';
import { participantsSelector } from '@/store/slices/participant-slice';

interface VisibilityIconProps {
  userId: string;
}

const VisibilityIcon = ({ userId }: VisibilityIconProps) => {
  const visibility = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.visibility,
  );

  return (
    visibility === 'hidden' && (
      <IconWrapper>
        <EyeOff className="w-3 h-3 3xl:w-4 3xl:h-4 text-foreground dark:text-white" />
      </IconWrapper>
    )
  );
};

export default VisibilityIcon;
