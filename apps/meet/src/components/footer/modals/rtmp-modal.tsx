import React, { useCallback, useEffect, useState } from 'react';
import {
  CommonResponseSchema,
  RecordingReqSchema,
  RecordingTasks,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { updateShowRtmpModal } from '@/store/slices/bottom-icons-activity-slice';
import sendAPIRequest from '@/helpers/api/api-client';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import Dropdown from '@/helpers/ui/dropdown';
import FormattedInputField from '@/helpers/ui/formatted-input-field';
import ConfirmationModal from '@/helpers/ui/confirmation-modal';
import ActionButton from '@/helpers/ui/action-button';
import Modal from '@/helpers/ui/modal';
import { DESIGN_CUSTOMIZATION } from '@/config';

const RtmpModal = () => {
  const dispatch = useAppDispatch();
  const isActiveRtmpBroadcasting = useAppSelector(
    (state) => state.session.isActiveRtmpBroadcasting,
  );
  const [provider, setProvider] = useState<string>('youtube');
  const [showServerUrl, setShowServerUrl] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [serverKey, setServerKey] = useState<string>('');
  const [displayError, setDisplayError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const providers = {
    youtube: 'rtmp://a.rtmp.youtube.com/live2',
    facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
  };

  useEffect(() => {
    if (provider === 'other') {
      setShowServerUrl(true);
    } else {
      setShowServerUrl(false);
    }
  }, [provider]);

  const closeStartModal = () => {
    dispatch(updateShowRtmpModal(false));
  };

  const startBroadcasting = useCallback(
    async (e: React.FormEvent | React.MouseEvent) => {
      e.preventDefault();
      setDisplayError('');

      if (provider === 'other' && serverUrl.trim() === '') {
        setDisplayError('Yêu cầu URL trình phát đa phương tiện bên ngoài');
        return;
      }
      if (serverKey.trim() === '') {
        setDisplayError('Yêu cầu mã khóa luồng RTMP');
        return;
      }
      let url: string;
      if (provider === 'other') {
        url = serverUrl;
      } else {
        url = providers[provider];
      }

      const rtmpUrlRegex = /^rtmps?:\/\/[^\s/$.?#].\S*$/i;
      if (!rtmpUrlRegex.test(url)) {
        setDisplayError('URL RTMP không hợp lệ');
        return;
      }

      setIsLoading(true);
      const body = create(RecordingReqSchema, {
        task: RecordingTasks.START_RTMP,
        sid: store.getState().session.currentRoom.sid,
        rtmpUrl: [url.replace(/\/$/, ''), serverKey].join('/'),
      });

      const customDesign = DESIGN_CUSTOMIZATION;
      if (customDesign) {
        const designStr = typeof customDesign === 'object' ? JSON.stringify(customDesign) : customDesign;
        body.customDesign = (designStr as string).replace(/\s/g, '');
      }

      const r = await sendAPIRequest(
        'rtmp',
        toBinary(RecordingReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      let msg = 'Đang chuẩn bị phát trực tiếp...';

      if (!res.status) {
        msg = res.msg;
      }
      dispatch(
        addUserNotification({
          message: msg,
          typeOption: 'info',
        }),
      );

      dispatch(updateShowRtmpModal(false));
      setIsLoading(false);
    },
    // oxlint-disable-next-line exhaustive-deps
    [provider, serverUrl, serverKey, dispatch],
  );

  const renderStartBroadcastModal = () => {
    return (
      <Modal
        show={!isActiveRtmpBroadcasting}
        onClose={closeStartModal}
        title="Phát trực tiếp (RTMP)"
        renderButtons={() => (
          <ActionButton onClick={startBroadcasting} isLoading={isLoading}>
            Bắt đầu phát
          </ActionButton>
        )}
        customClass="StartBroadcastModal"
      >
        <div className="flex flex-col gap-1 min-h-[150px]">
          {displayError && (
            <div className="mb-2 rounded-lg bg-destructive/10 p-2 text-sm text-destructive">
              {displayError}
            </div>
          )}
          <Dropdown
            label="Chọn nền tảng"
            id="provider"
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'youtube', text: 'YouTube' },
              { value: 'facebook', text: 'Facebook' },
              { value: 'other', text: 'Khác' },
            ]}
            direction="horizontal"
          />
          {showServerUrl && (
            <FormattedInputField
              label="URL máy chủ"
              id="stream-url"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.currentTarget.value);
                setDisplayError('');
              }}
            />
          )}
          <FormattedInputField
            label="Mã khóa luồng"
            id="stream-key"
            value={serverKey}
            onChange={(e) => {
              setServerKey(e.currentTarget.value);
              setDisplayError('');
            }}
          />
        </div>
      </Modal>
    );
  };

  const handleStopBroadcast = async () => {
    const body = create(RecordingReqSchema, {
      task: RecordingTasks.STOP_RTMP,
      sid: store.getState().session.currentRoom.sid,
    });

    const r = await sendAPIRequest(
      'rtmp',
      toBinary(RecordingReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    let msg = 'Đang dừng phát trực tiếp...';

    if (!res.status) {
      msg = res.msg;
    }
    dispatch(
      addUserNotification({
        message: msg,
        typeOption: 'info',
      }),
    );
    dispatch(updateShowRtmpModal(false));
  };

  return !isActiveRtmpBroadcasting ? (
    renderStartBroadcastModal()
  ) : (
    <ConfirmationModal
      show={isActiveRtmpBroadcasting}
      onClose={() => dispatch(updateShowRtmpModal(false))}
      onConfirm={handleStopBroadcast}
      title="Xác nhận"
      text="Bạn có chắc chắn muốn dừng phát trực tiếp?"
    />
  );
};

export default RtmpModal;
