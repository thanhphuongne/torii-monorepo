import React, { useCallback } from 'react';
import { RecordingFeatures } from '@workspace/protocol';

import { RecordingType, SelectedRecordingType } from '@/components/footer/icons/recording/i-recording';
import Modal from '@/helpers/ui/modal';
import ActionButton from '@/helpers/ui/action-button';

interface IRecordingModalProps {
  showModal: boolean;
  recordingFeatures?: RecordingFeatures;
  onCloseModal(selected: SelectedRecordingType): void;
}

const RecordingModal = ({
  showModal,
  recordingFeatures,
  onCloseModal,
}: IRecordingModalProps) => {
  const startRecording = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onCloseModal({ type: RecordingType.RECORDING_TYPE_LOCAL });
    },
    [onCloseModal],
  );

  const closeModal = () => {
    onCloseModal({
      type: RecordingType.RECORDING_TYPE_NONE,
    });
  };

  return (
    <Modal
      show={showModal}
      onClose={closeModal}
      title="Ghi hình cục bộ"
      renderButtons={() => (
        <ActionButton
          buttonType="submit"
          onClick={(e) => startRecording(e as any)}
          disabled={!recordingFeatures?.isAllowLocal}
        >
          Bắt đầu ghi hình cục bộ
        </ActionButton>
      )}
    >
      <form
        className="RecorderPop"
        action="#"
        method="POST"
        onSubmit={(e) => startRecording(e)}
      >
        <p className="text-sm text-foreground">
          Bản ghi sẽ được lưu trực tiếp về máy của bạn. Trình duyệt sẽ yêu cầu bạn chọn màn hình/tab để chia sẻ khi bắt đầu.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Khi bạn dừng ghi hình, file sẽ tự động tải xuống.
        </p>
        {!recordingFeatures?.isAllowLocal ? (
          <p className="mt-3 text-sm text-destructive">
            Phòng này hiện không cho phép ghi hình cục bộ.
          </p>
        ) : null}
      </form>
    </Modal>
  );
};

export default RecordingModal;
