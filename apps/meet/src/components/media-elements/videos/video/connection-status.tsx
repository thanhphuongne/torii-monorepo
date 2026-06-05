import React, { useMemo } from 'react';
import { Signal } from 'lucide-react';
import { ConnectionQuality } from 'livekit-client';

import { useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';

interface IConnectionStatusProps {
  userId: string;
}
const ConnectionStatus = ({ userId }: IConnectionStatusProps) => {
  const connectionQuality = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.connectionQuality,
  );

  const color = useMemo(() => {
    switch (connectionQuality) {
      case ConnectionQuality.Excellent:
        return '#38f105';
      case ConnectionQuality.Good:
        return '#c8f6bd';
      case ConnectionQuality.Poor:
        return '#FF0000';
      case ConnectionQuality.Lost:
        return '#e03131';
      default:
        return '#FFFFFF';
    }
  }, [connectionQuality]);

  return (
    <div className="connection-status cursor-pointer w-7 h-7 rounded-full bg-background/40 backdrop-blur-sm shadow-sm flex items-center justify-center border border-border/20">
      <Signal style={{ color: color }} className="w-3 h-3" />
    </div>
  );
};

export default ConnectionStatus;
