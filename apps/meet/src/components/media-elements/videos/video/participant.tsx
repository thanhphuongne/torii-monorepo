import React from 'react';

import RaisedHand from '@/components/media-elements/videos/video/raised-hand';

export interface IParticipantProps {
  userId: string;
  name: string;
  isLocal: boolean;
}

const Participant = ({ userId, name, isLocal }: IParticipantProps) => {
  return (
    <div className="name-wrapper absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
      <div className="name inline-flex items-center gap-2 px-2 py-1 bg-background/40 backdrop-blur-md border border-border/20 rounded-lg text-xs font-medium text-white shadow-sm pointer-events-auto">
        <span className="truncate max-w-[120px]">{name}</span>
        {isLocal && <span className="opacity-70 text-[10px]">(me)</span>}
        <RaisedHand userId={userId} />
      </div>
    </div>
  );
};

export default Participant;
