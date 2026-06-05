import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { CommonResponseSchema, RoomEndAPIReqSchema } from '@workspace/protocol';
import { Button } from '@headlessui/react';

import { store } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import { getNatsConn } from '@/helpers/nats';
import ConfirmationModal from '@/helpers/ui/confirmation-modal';
import { PhoneOff } from 'lucide-react';

const EndMeetingButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [alertText, setAlertText] = useState<string>('');
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const conn = getNatsConn();
  const { isAdmin, roomId } = useMemo(() => {
    const session = store.getState().session;
    return {
      isAdmin: session.currentUser?.metadata?.isAdmin,
      roomId: session.currentRoom.roomId,
    };
  }, []);

  function open() {
    if (isAdmin) {
      setAlertText('Bạn có chắc chắn muốn kết thúc cuộc họp cho tất cả mọi người?');
    } else {
      setAlertText('Bạn có chắc chắn muốn rời khỏi cuộc họp?');
    }

    setIsOpen(true);
  }

  const onConfirm = useCallback(async () => {
    if (isBusy) {
      return;
    }
    setIsBusy(true);

    if (!isAdmin) {
      await conn.endSession('Bạn đã rời khỏi cuộc họp.');
    } else {
      const id = toast.loading('Đang kết thúc phiên họp...', {
        type: 'info',
      });

      const body = create(RoomEndAPIReqSchema, {
        roomId: roomId,
      });
      const r = await sendAPIRequest(
        'endRoom',
        toBinary(RoomEndAPIReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      if (!res.status) {
        toast.update(id, {
          render: res.msg,
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        toast.dismiss(id);
      }
    }
    setIsBusy(false);
    setIsOpen(false);
  }, [isBusy, isAdmin, conn, roomId]);

  return (
    <>
      <Button
        onClick={open}
        className="h-[34px] md:h-10 3xl:h-11 w-[34px] md:w-10 lg:w-auto px-2 lg:px-5 flex items-center justify-center rounded-full text-sm 3xl:text-base font-medium 3xl:font-semibold text-destructive-foreground bg-destructive transition-all duration-300 hover:bg-destructive/90 shadow-sm cursor-pointer"
      >
        <span className="hidden lg:block">
          {isAdmin ? 'Kết thúc cuộc họp' : 'Rời cuộc họp'}
        </span>
        <span className="block lg:hidden">
          <PhoneOff className="w-4 h-4" />
        </span>
      </Button>

      <ConfirmationModal
        show={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={onConfirm}
        title="Xác nhận"
        text={alertText}
      />
    </>
  );
};

export default EndMeetingButton;
