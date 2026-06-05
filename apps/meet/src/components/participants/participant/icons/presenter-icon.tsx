import React from 'react';
import { Presentation } from 'lucide-react';

import { useAppSelector } from '@/store';
import IconWrapper from '@/components/participants/participant/icons/icon-wapper';
import { participantsSelector } from '@/store/slices/participant-slice';

interface IPresenterIconProps {
  userId: string;
}

const PresenterIcon = ({ userId }: IPresenterIconProps) => {
  const isPresenter = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.isPresenter,
  );

  return (
    isPresenter && (
      <IconWrapper>
        <Presentation className="w-3 h-3 3xl:w-4 3xl:h-4 text-foreground dark:text-white" />
      </IconWrapper>
    )
  );
};

export default PresenterIcon;
