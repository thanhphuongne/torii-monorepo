import React, { Fragment, useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@workspace/ui/components/button';
import {
  CommonResponseSchema,
  RemoveParticipantReqSchema,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store } from '@/store';
import sendAPIRequest from '@/helpers/api/api-client';
import Modal from '@/helpers/ui/modal';
import RadioOptions from '@/helpers/ui/radio-options';

export interface IRemoveParticipantAlertModalData {
  name: string;
  userId: string;
  removeType: string;
}

interface IRemoveParticipantAlertModalProps {
  name: string;
  userId: string;
  removeType: string;
  closeAlertModal: () => void;
}

const RemoveParticipantAlertModal = ({
  name,
  userId,
  removeType,
  closeAlertModal,
}: IRemoveParticipantAlertModalProps) => {
  const [blockUser, setBlockUser] = useState<number>(0);

  const onCloseRemoveParticipantAlert = async (remove = false) => {
    if (!remove) {
      closeAlertModal();
      return;
    }

    const session = store.getState().session;
    const body = create(RemoveParticipantReqSchema, {
      sid: session.currentRoom.sid,
      roomId: session.currentRoom.roomId,
      userId: userId,
      msg:
        removeType === 'remove'
          ? 'Quản trị viên đã xóa bạn khỏi phòng.'
          : 'Quản trị viên đã từ chối yêu cầu tham gia của bạn.',
      blockUser: blockUser === 1,
    });

    const r = await sendAPIRequest(
      'removeParticipant',
      toBinary(RemoveParticipantReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast('Thành viên đã bị xóa thành công.', {
        toastId: 'user-remove-status',
        type: 'info',
      });
    } else {
      toast(res.msg, {
        type: 'error',
      });
    }
    closeAlertModal();
  };

  const renderButtons = () => {
    return (
      <Fragment>
        <Button
          variant="destructive"
          onClick={() => onCloseRemoveParticipantAlert(true)}
        >
          Xóa
        </Button>
        <Button
          variant="outline"
          className="ml-4"
          onClick={() => onCloseRemoveParticipantAlert(false)}
        >
          Hủy
        </Button>
      </Fragment>
    );
  };

  return (
    <Modal
      show={true}
      onClose={() => onCloseRemoveParticipantAlert(false)}
      title={`Xác nhận xóa ${name}?`}
      renderButtons={renderButtons}
    >
      <div className="mb-2 pl-3">
        <p className="text-sm text-muted-foreground">
          Bạn có muốn chặn tài khoản này tham gia lại không?
        </p>
        <RadioOptions
          name="block"
          checked={blockUser}
          onChange={setBlockUser}
          options={[
            {
              id: 'yes',
              value: 1,
              label: 'Có',
            },
            {
              id: 'no',
              value: 0,
              label: 'Không',
            },
          ]}
        />
      </div>
    </Modal>
  );
};

export default RemoveParticipantAlertModal;
