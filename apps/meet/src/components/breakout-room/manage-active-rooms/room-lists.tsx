import React, { useMemo } from 'react';

import { useGetBreakoutRoomsQuery } from '@/store/services/breakout-room-api';
import { Loader2 } from 'lucide-react';
import { BreakoutRoomMessage } from '..';
import RoomItem from '@/components/breakout-room/manage-active-rooms/room';

interface IRoomListsProps {
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const RoomLists = ({ setMessage }: IRoomListsProps) => {
  const { data, isLoading } = useGetBreakoutRoomsQuery(undefined, {
    pollingInterval: 10000,
  });

  const sortedRooms = useMemo(() => {
    if (data && data.rooms) {
      const sortedRooms = data.rooms.slice();
      sortedRooms.sort((a, b) => b.title.localeCompare(a.title));
      return sortedRooms;
    }
    return [];
  }, [data]);

  return (
    <div className="breakout-room-list-wrapper min-h-[90px] relative">
      {isLoading && (
        <div className="absolute text-center top-1/2 -translate-y-1/2 z-999 left-0 right-0 m-auto pointer-events-none">
          <Loader2
            className={'inline w-10 h-10 me-3 text-muted animate-spin'}
          />
        </div>
      )}
      {sortedRooms.map((room) => (
        <RoomItem key={room.id} room={room} setMessage={setMessage} />
      ))}
    </div>
  );
};

export default RoomLists;
