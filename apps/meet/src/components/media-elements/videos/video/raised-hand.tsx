import React from 'react';

import { useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { Hand } from 'lucide-react';

interface RaisedHandProps {
  userId: string;
}

const RaisedHand = ({ userId }: RaisedHandProps) => {
  const raisedHand = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.raisedHand,
  );

  return (
    raisedHand && (
      <div className="raised-hand absolute bottom-0 right-4 cursor-pointer w-7 h-7 rounded-full bg-Blue2-500 flex items-center justify-center">
        <Hand className="h-4 w-auto text-white" />
      </div>
    )
  );
};
export default RaisedHand;
