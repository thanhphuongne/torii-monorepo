import React, { useMemo } from 'react';

import { useRoomDurationCountdown } from '@/helpers/hooks/use-room-duration-countdown';

interface IDurationProps {
  duration: bigint;
  created: bigint;
}

const BreakoutRoomDuration = ({ duration, created }: IDurationProps) => {
  const endTime = useMemo(() => {
    const startTimeInMs = Number(created) * 1000;
    const durationInMs = Number(duration) * 60 * 1000;
    return startTimeInMs + durationInMs;
  }, [created, duration]);

  const remainingTime = useRoomDurationCountdown(endTime);

  return (
    <div className="h-7 px-4 flex items-center justify-center rounded-lg bg-muted/50 border border-border transition-all duration-300 hover:bg-muted shadow-sm">
      {remainingTime}
    </div>
  );
};

export default BreakoutRoomDuration;
