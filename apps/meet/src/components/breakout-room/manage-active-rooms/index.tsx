import React, { useEffect } from 'react';
import { Button } from '@workspace/ui/components/button';

import BroadcastMessageForm from '@/components/breakout-room/manage-active-rooms/broadcast-message-form';
import RoomLists from '@/components/breakout-room/manage-active-rooms/room-lists';

import { useEndAllRoomsMutation } from '@/store/services/breakout-room-api';
import { BreakoutRoomMessage } from '..';
import { useAppDispatch } from '@/store';
import { updateShowManageBreakoutRoomModal } from '@/store/slices/bottom-icons-activity-slice';

interface IManageActiveRoomsProps {
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const ManageActiveRooms = ({ setMessage }: IManageActiveRoomsProps) => {
  const dispatch = useAppDispatch();
  const [endAllRooms, { isLoading, data, isSuccess, error }] =
    useEndAllRoomsMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        dispatch(updateShowManageBreakoutRoomModal(false));
      } else {
        setMessage({ text: data.msg, type: 'error' });
      }
    } else if (error) {
      const msg = (error as any)?.data?.msg ?? 'Lỗi không xác định';
      setMessage({ text: msg, type: 'error' });
    }
  }, [isSuccess, data, error, dispatch, setMessage]);

  const onEndAllRooms = () => {
    setMessage(null);
    endAllRooms();
  };

  return (
    <div className="manage-breakout-room-wrap">
      <BroadcastMessageForm setMessage={setMessage} />
      <RoomLists setMessage={setMessage} />
      <div className="btn pb-3 pt-4 flex items-end justify-end">
        <Button
          onClick={onEndAllRooms}
          disabled={isLoading}
          className="ml-auto"
        >
          Kết thúc tất cả
        </Button>
      </div>
    </div>
  );
};

export default ManageActiveRooms;
