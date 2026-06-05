import React, { useEffect, useState } from 'react';
import { BroadcastBreakoutRoomMsgReqSchema } from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { Button } from '@workspace/ui/components/button';
import { Textarea } from '@workspace/ui/components/textarea';

import { useBroadcastBreakoutRoomMsgMutation } from '@/store/services/breakout-room-api';
import { BreakoutRoomMessage } from '..';

interface IBroadcastMessageFormProps {
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const BroadcastMessageForm = ({ setMessage }: IBroadcastMessageFormProps) => {
  const [msg, setMsg] = useState<string>('');
  const [broadcastMsg, { isLoading, data, isSuccess, error }] =
    useBroadcastBreakoutRoomMsgMutation();

  useEffect(() => {
    if (isSuccess && data) {
      if (data.status) {
        setMessage({
          text: 'Tin nhắn đã được gửi đến tất cả các phòng',
          type: 'info',
        });
        setMsg('');
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ text: data.msg, type: 'error' });
      }
    } else if (error) {
      const errorMsg = (error as any)?.data?.msg ?? 'Lỗi không xác định';
      setMessage({ text: errorMsg, type: 'error' });
    }
  }, [isSuccess, data, error, setMessage]);

  const send = () => {
    if (msg.trim() === '') {
      return;
    }
    // clear previous error message
    setMessage(null);
    broadcastMsg(
      create(BroadcastBreakoutRoomMsgReqSchema, {
        msg,
      }),
    );
  };

  return (
    <div className="broadcasting-message pb-4 mb-4 border-b border-border grid gap-2">
      <Textarea
        value={msg}
        onChange={(e) => setMsg(e.currentTarget.value)}
        className="h-20"
      />
      <Button
        onClick={send}
        disabled={isLoading || msg.trim() === ''}
        className="ml-auto"
      >
        Gửi tin nhắn
      </Button>
    </div>
  );
};

export default BroadcastMessageForm;
