import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import clsx from 'clsx';

import UserBox from '@/components/breakout-room/form/user-box';
import { ItemTypes, UserType } from '@/components/breakout-room/form/types';
import { useAppDispatch } from '@/store';
import { updateBreakoutRoomDroppedUser } from '@/store/slices/breakout-room-slice';

interface IRoomBoxProps {
  roomId: number;
  name: string;
  users: Array<UserType>;
}

interface DragItem {
  id: string;
}

const RoomBox = ({ roomId, name, users }: IRoomBoxProps) => {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLDivElement>(null);

  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.USER,
    drop: (item: DragItem) => {
      dispatch(
        updateBreakoutRoomDroppedUser({
          id: item.id,
          roomId: roomId,
        }),
      );
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));
  drop(ref);

  const isDropTarget = canDrop && isOver;

  const roomBoxClasses = clsx(
    'roomBox scrollBar scrollBar2 overflow-hidden overflow-y-auto h-60 w-full sm:w-52 lg:w-[13.2rem] xl:w-55 ltr:mr-4 lg:ltr:mr-6 rtl:ml-4 lg:rtl:ml-6 mb-2 sm:mb-6 border border-solid border-border rounded-lg shadow-sm',
    {
      'bg-primary/20': isDropTarget,
      'bg-secondary/50': canDrop && !isDropTarget,
      'bg-card': !canDrop,
    },
  );

  const headerClasses = clsx(
    'text-sm sm:text-base px-2 py-1 border-b-2 border-solid mb-1',
    {
      'text-primary border-primary': canDrop,
      'text-foreground border-border':
        !canDrop,
    },
  );

  return (
    <div ref={ref} className={roomBoxClasses}>
      <p className={headerClasses}>{name}</p>
      {users.map((user) => {
        return <UserBox key={user.id} name={user.name} id={user.id} />;
      })}
    </div>
  );
};

export default RoomBox;
