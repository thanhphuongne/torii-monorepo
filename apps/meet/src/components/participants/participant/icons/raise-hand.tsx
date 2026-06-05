import React from 'react';
import { useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { Hand } from 'lucide-react';
import IconWrapper from '@/components/participants/participant/icons/icon-wapper';

interface IRaiseHandIconProps {
  userId: string;
}
const RaiseHandIcon = ({ userId }: IRaiseHandIconProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );

  return (
    raisedHand && (
      <IconWrapper>
        <Hand className={'h-3 3xl:h-4 w-auto dark:text-white'} />
      </IconWrapper>
    )
  );
};

export default RaiseHandIcon;
