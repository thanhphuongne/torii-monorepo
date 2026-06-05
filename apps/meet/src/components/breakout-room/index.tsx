import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CreateBreakoutRoomsReq } from '@workspace/protocol';

import FormElems from '@/components/breakout-room/form';
import ManageActiveRooms from '@/components/breakout-room/manage-active-rooms';
import Modal from '@/helpers/ui/modal';

import { useAppDispatch, useAppSelector } from '@/store';
import { updateShowManageBreakoutRoomModal } from '@/store/slices/bottom-icons-activity-slice';
import { useCreateBreakoutRoomsMutation } from '@/store/services/breakout-room-api';

export interface BreakoutRoomMessage {
  text: string;
  type: 'info' | 'error';
}

const BreakoutRoom = () => {
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState<BreakoutRoomMessage | null>(null);

  const breakoutRoomIsActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures?.breakoutRoomFeatures
        ?.isActive,
  );

  const [createBreakoutRoom, { isLoading, data, error, isSuccess }] =
    useCreateBreakoutRoomsMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        toast('Phòng thảo luận riêng được tạo', {
          type: 'info',
        });
        dispatch(updateShowManageBreakoutRoomModal(false));
      } else {
        setMessage({ text: data.msg ?? '', type: 'error' });
      }
    } else if (error) {
      const msg = (error as any)?.data?.msg ?? 'Lỗi không xác định';
      setMessage({ text: msg, type: 'error' });
    }
  }, [isSuccess, data, error, dispatch]);

  const handleCreateBreakoutRooms = (req: CreateBreakoutRoomsReq) => {
    // clean previous error
    setMessage(null);
    createBreakoutRoom(req);
  };

  return (
    <Modal
      show={true}
      onClose={() => dispatch(updateShowManageBreakoutRoomModal(false))}
      title="Phòng nhóm riêng"
      customClass="breakoutRoomModal"
      maxWidth="max-w-4xl"
    >
      <div className="mt-0">
        {message && (
          <div
            className={`py-2 px-4 rounded-lg mb-4 text-sm ${message.type === 'error'
              ? 'text-destructive bg-destructive/10'
              : 'text-primary bg-primary/10'
              }`}
          >
            {message.text}
          </div>
        )}
        {breakoutRoomIsActive ? (
          <ManageActiveRooms setMessage={setMessage} />
        ) : (
          <FormElems
            createBreakoutRooms={handleCreateBreakoutRooms}
            isLoading={isLoading}
            setMessage={setMessage}
          />
        )}
      </div>
    </Modal>
  );
};

export default BreakoutRoom;
