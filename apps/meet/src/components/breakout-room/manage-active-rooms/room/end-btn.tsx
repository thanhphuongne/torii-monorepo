import React, { useEffect } from 'react';
import { EndBreakoutRoomReqSchema } from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { toast } from 'react-toastify';
import { Button } from '@workspace/ui/components/button';

import { useEndSingleRoomMutation } from '@/store/services/breakout-room-api';
import { BreakoutRoomMessage } from '@/components/breakout-room';

interface IEndBtnProps {
  breakoutRoomId: string;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}
const EndBtn = ({ breakoutRoomId, setMessage }: IEndBtnProps) => {
  const [endSingleRoom, { isLoading, isSuccess, isError, data, error }] =
    useEndSingleRoomMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        toast('Phòng đã kết thúc', {
          type: 'info',
        });
        setMessage({ text: 'Phòng đã kết thúc', type: 'info' });
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ text: data.msg, type: 'error' });
      }
      // success is handled by query cache invalidation, no toast needed.
    } else if (isError) {
      const msg = (error as any)?.data?.msg ?? 'Lỗi không xác định';
      setMessage({ text: msg, type: 'error' });
    }
  }, [isSuccess, isError, data, error, setMessage]);

  const handleEndRoom = () => {
    // clear previous error
    setMessage(null);
    endSingleRoom(create(EndBreakoutRoomReqSchema, { breakoutRoomId }));
  };

  return (
    <div className="end-room-btn">
      <Button
        variant="destructive"
        size="sm"
        onClick={handleEndRoom}
        disabled={isLoading}
        className="ml-auto"
      >
        Kết thúc phòng
      </Button>
    </div>
  );
};

export default EndBtn;
