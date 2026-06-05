import { useCallback, useMemo, useState } from 'react';
import {
  CloudRecordingVariants,
  CommonResponseSchema,
  RecordingReqSchema,
  RecordingTasks,
} from '@workspace/protocol';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { IUseCloudRecordingReturn, RecordingType } from '@/components/footer/icons/recording/i-recording';
import sendAPIRequest from '@/helpers/api/api-client';
import { store, useAppDispatch } from '@/store';
import { addUserNotification } from '@/store/slices/roomSettingsSlice';
import { DESIGN_CUSTOMIZATION } from '@/config';

const useCloudRecording = (): IUseCloudRecordingReturn => {
  const TYPE_OF_RECORDING = RecordingType.RECORDING_TYPE_CLOUD;
  const [hasError, setHasError] = useState<boolean>(false);
  const dispatch = useAppDispatch();

  const { currentRoom, isCloud, e2eeFeatures } = useMemo(() => {
    const session = store.getState().session;
    return {
      currentRoom: session.currentRoom,
      isCloud: session.isCloud,
      e2eeFeatures:
        session.currentRoom.metadata?.roomFeatures?.endToEndEncryptionFeatures,
    };
  }, []);

  const startRecording = useCallback(
    async (variant?: CloudRecordingVariants) => {
      const body = create(RecordingReqSchema, {
        task: RecordingTasks.START_RECORDING,
        sid: currentRoom.sid,
        recordingVariant: CloudRecordingVariants.FULL_SCREEN_CLOUD_RECORDING,
      });

      if (
        isCloud &&
        variant &&
        variant === CloudRecordingVariants.MEDIA_ONLY_CLOUD_RECORDING
      ) {
        if (e2eeFeatures?.isEnabled) {
          dispatch(
            addUserNotification({
              message:
                'Chỉ ghi hình đa phương tiện không được hỗ trợ khi bật mã hóa đầu cuối.',
              typeOption: 'info',
            }),
          );
          return;
        }
        body.recordingVariant =
          CloudRecordingVariants.MEDIA_ONLY_CLOUD_RECORDING;
      }

      const customDesign = DESIGN_CUSTOMIZATION;
      if (customDesign) {
        const designStr =
          typeof customDesign === 'object'
            ? JSON.stringify(customDesign)
            : customDesign;
        body.customDesign = (designStr as string).replace(/\s/g, '');
      }
      const r = await sendAPIRequest(
        'recording',
        toBinary(RecordingReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      let msg = 'Yêu cầu bắt đầu ghi hình đang được xử lý...';
      if (!res.status) {
        setHasError(true);
        msg = res.msg;
      }

      dispatch(
        addUserNotification({
          message: msg,
          typeOption: 'info',
        }),
      );
    },
    [currentRoom, isCloud, e2eeFeatures, dispatch],
  );

  const stopRecording = useCallback(async () => {
    if (currentRoom.sid) {
      const body = create(RecordingReqSchema, {
        task: RecordingTasks.STOP_RECORDING,
        roomId: currentRoom.roomId,
        sid: currentRoom.sid,
      });
      const r = await sendAPIRequest(
        'recording',
        toBinary(RecordingReqSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );
      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      let msg = 'Yêu cầu dừng dịch vụ ghi hình đang được xử lý...';

      if (!res.status) {
        setHasError(true);
        msg = res.msg;
      }

      dispatch(
        addUserNotification({
          message: msg,
          typeOption: 'info',
        }),
      );
    }
  }, [currentRoom, dispatch]);

  const resetError = () => {
    if (hasError) {
      setHasError(false);
    }
  };

  return {
    TYPE_OF_RECORDING,
    hasError,
    startRecording,
    stopRecording,
    resetError,
  };
};

export default useCloudRecording;
