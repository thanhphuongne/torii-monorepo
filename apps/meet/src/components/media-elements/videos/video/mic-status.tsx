import React from 'react';
import { useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import { Mic, MicOff } from 'lucide-react';

interface IMicStatusProps {
  userId: string;
}

const MicStatus = ({ userId }: IMicStatusProps) => {
  const audioTracks = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.audioTracks,
  );
  const isMuted = useAppSelector(
    (state) => participantsSelector.selectById(state, userId)?.isMuted,
  );

  return (
    audioTracks > 0 && (
      <div className="mic-status cursor-pointer w-7 h-7 text-foreground/80 dark:text-white rounded-full bg-background/60 backdrop-blur-sm shadow-sm flex items-center justify-center absolute right-3 top-3 border border-border/20">
        {isMuted ? (
          <MicOff className={'h-4 w-auto'} />
        ) : (
          <Mic className={'h-4 w-auto'} />
        )}
      </div>
    )
  );
};

export default MicStatus;
