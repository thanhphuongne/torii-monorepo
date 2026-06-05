import React from 'react';
import { MenuItem } from '@headlessui/react';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  SwitchPresenterReqSchema,
  SwitchPresenterTask,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { useAppSelector } from '@/store';
import { participantsSelector } from '@/store/slices/participant-slice';
import sendAPIRequest from '@/helpers/api/api-client';

interface ISwitchPresenterMenuItemProps {
  userId: string;
}

const SwitchPresenterMenuItem = ({ userId }: ISwitchPresenterMenuItemProps) => {
  const isPresenter = useAppSelector(
    (state) =>
      participantsSelector.selectById(state, userId)?.metadata.isPresenter,
  );

  const togglePresenterStatus = async () => {
    const body = create(SwitchPresenterReqSchema, {
      userId: userId,
      task: isPresenter
        ? SwitchPresenterTask.DEMOTE
        : SwitchPresenterTask.PROMOTE,
    });

    const r = await sendAPIRequest(
      'switchPresenter',
      toBinary(SwitchPresenterReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (res.status) {
      toast('Đã thay đổi trạng thái người thuyết trình thành công.', {
        toastId: 'lock-setting-status',
        type: 'info',
      });
    } else {
      toast(res.msg, {
        toastId: 'lock-setting-status',
        type: 'error',
      });
    }
  };

  return (
    <MenuItem>
      {() => (
        <button
          className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-foreground px-3 rounded-lg transition-all duration-300 hover:bg-muted"
          onClick={togglePresenterStatus}
        >
          {isPresenter
            ? 'Hủy tư cách người thuyết trình'
            : 'Chỉ định làm người thuyết trình'}
        </button>
      )}
    </MenuItem>
  );
};

export default SwitchPresenterMenuItem;
