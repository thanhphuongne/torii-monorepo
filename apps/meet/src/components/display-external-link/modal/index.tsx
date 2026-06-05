import React, { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CommonResponseSchema,
  ExternalDisplayLinkReqSchema,
  ExternalDisplayLinkTask,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '@/store';
import {
  updateDisplayExternalLinkRoomModal,
  updateIsActiveWhiteboard,
} from '@/store/slices/bottom-icons-activity-slice';
import sendAPIRequest from '@/helpers/api/api-client';
import Modal from '@/helpers/ui/modal';
import ActionButton from '@/helpers/ui/action-button';
import Checkbox from '@/helpers/ui/checkbox';
import SavedLinks from '@/components/display-external-link/modal/saved-links';

const DisplayExternalLinkModal = () => {
  const dispatch = useAppDispatch();
  const isActive = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.isActive,
  );
  const lastLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.displayExternalLinkFeatures?.link,
  );
  const [link, setLink] = useState<string>(lastLink ?? '');
  const [extraValues, setExtraValues] = useState({
    name: false,
    userId: false,
    role: false,
    meetingId: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const closeStartModal = () => {
    dispatch(updateDisplayExternalLinkRoomModal(false));
  };

  const handleCheckboxChange = useCallback((key: keyof typeof extraValues) => {
    setExtraValues((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let url: URL;
    try {
      url = new URL(link);
    } catch (e) {
      console.error(e);
      toast.error('Liên kết không hợp lệ');
      return;
    }

    const session = store.getState().session;
    if (extraValues.name) {
      url.searchParams.set('name', session.currentUser?.name ?? '');
    }
    if (extraValues.userId) {
      url.searchParams.set('userId', session.currentUser?.userId ?? '');
    }
    if (extraValues.role) {
      url.searchParams.set(
        'role',
        session.currentUser?.metadata?.isAdmin ? 'admin' : 'participant',
      );
    }
    if (extraValues.meetingId) {
      url.searchParams.set('meetingId', session.currentRoom.roomId);
    }

    setIsLoading(true);
    const id = toast.loading('Vui lòng đợi', {
      type: 'info',
    });

    const body = create(ExternalDisplayLinkReqSchema, {
      task: ExternalDisplayLinkTask.START_EXTERNAL_LINK,
      url: url.toString(),
    });
    const r = await sendAPIRequest(
      'externalDisplayLink',
      toBinary(ExternalDisplayLinkReqSchema, body),
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
        autoClose: 1000,
      });
    }

    toast.dismiss(id);
    setIsLoading(false);
    // hide whiteboard to make this visible
    dispatch(updateIsActiveWhiteboard(false));
    dispatch(updateDisplayExternalLinkRoomModal(false));
  };

  const renderDisplayForm = () => {
    return (
      <Modal
        show={!isActive}
        onClose={closeStartModal}
        title="Hiển thị liên kết ngoài"
        customClass="externalDisplayLink"
      >
        <form method="POST" onSubmit={onSubmit}>
          <SavedLinks link={link} setLink={setLink} />

          <div className="mt-4">
            <fieldset>
              <div
                className="text-sm font-medium text-foreground"
                aria-hidden="true"
              >
                Gửi thêm giá trị
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Checkbox
                  id="name"
                  label="Tên"
                  description="Tên người tham gia"
                  checked={extraValues.name}
                  onChange={() => handleCheckboxChange('name')}
                />
                <Checkbox
                  id="user-id"
                  label="ID người dùng"
                  description="ID người tham gia"
                  checked={extraValues.userId}
                  onChange={() => handleCheckboxChange('userId')}
                />
                <Checkbox
                  id="user-role"
                  label="Vai trò"
                  description="Vai trò người tham gia"
                  checked={extraValues.role}
                  onChange={() => handleCheckboxChange('role')}
                />
                <Checkbox
                  id="meeting-id"
                  label="ID cuộc họp"
                  description="ID cuộc họp hiện tại"
                  checked={extraValues.meetingId}
                  onChange={() => handleCheckboxChange('meetingId')}
                />
              </div>
            </fieldset>
          </div>

          <div className="mt-8 flex justify-end">
            <ActionButton isLoading={isLoading} disabled={!link}>
              Hiển thị
            </ActionButton>
          </div>
        </form>
      </Modal>
    );
  };

  return !isActive && renderDisplayForm();
};

export default DisplayExternalLinkModal;
