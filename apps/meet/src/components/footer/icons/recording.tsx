import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import { store } from '@/store';
import { IRoomMetadata } from '@/store/slices/interfaces/session';
import RecordingModal from '@/components/footer/icons/recording/recording-modal';
import { RecordingEvent, RecordingType } from '@/components/footer/icons/recording/i-recording';
import useLocalRecording from '@/components/footer/icons/recording/use-local-recording';
import { CircleDot } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

const RecordingIcon = () => {
  const {
    hasError: localRecordingError,
    recordingEvent: localRecordingEvent,
    startRecording: startLocalRecording,
    stopRecording: stopLocalRecording,
    resetError: resetLocalRecordingError,
  } = useLocalRecording();

  const { roomMetadata, isAllowLocalRecording, isAdmin, showTooltip } =
    useMemo(() => {
      const session = store.getState().session;
      const roomMetadata = session.currentRoom.metadata as IRoomMetadata;
      return {
        roomMetadata,
        isAllowLocalRecording:
          roomMetadata.roomFeatures?.recordingFeatures?.isAllowLocal,
        isAdmin: !!session.currentUser?.metadata?.isAdmin,
        showTooltip: session.userDeviceType === 'desktop',
      };
    }, []);

  const [disable, setDisable] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  useEffect(() => {
    if (localRecordingEvent === RecordingEvent.STARTED_RECORDING) {
      setDisable(false);
      setIsRecording(true);
    } else if (localRecordingEvent === RecordingEvent.STOPPED_RECORDING) {
      setDisable(false);
      setIsRecording(false);
    }
  }, [localRecordingEvent]);

  useEffect(() => {
    const reset = () => {
      setDisable(false);
      setIsRecording(false);
    };

    if (localRecordingError) {
      reset();
      resetLocalRecordingError();
    }
    //eslint-disable-next-line
  }, [localRecordingError]);

  const onClickRecordingBtn = () => {
    if (!isRecording) {
      setOpenModal(true);
    } else {
      setOpenModal(false);
      setDisable(true);
      stopLocalRecording();
    }
  };

  const onCloseModal = (selectedRecordingType: { type: RecordingType }) => {
    setOpenModal(false);
    if (selectedRecordingType.type === RecordingType.RECORDING_TYPE_LOCAL) {
      setDisable(true);
      startLocalRecording();
    }
  };

  if (!isAllowLocalRecording || !isAdmin) {
    return null;
  }

  return (
    <>
      {openModal && (
        <RecordingModal
          showModal={openModal}
          recordingFeatures={roomMetadata.roomFeatures?.recordingFeatures}
          onCloseModal={onCloseModal}
        />
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onClickRecordingBtn()}
        className={clsx(
          'recorder-icon footer-icon relative h-10 w-10 rounded-full border-border bg-card shadow-sm hover:bg-muted md:h-11 md:w-11 3xl:h-[52px] 3xl:w-[52px]',
          {
            'has-tooltip': showTooltip,
            'bg-muted': isRecording,
            'opacity-50 pointer-events-none': disable,
          },
        )}
      >
        <span className="tooltip">
          {isRecording ? 'Dừng ghi âm/hình' : 'Bắt đầu ghi âm/hình'}
        </span>
        <CircleDot
          className={clsx('h-4 w-4 transition-colors duration-300 md:h-5 md:w-5 3xl:h-6 3xl:w-6', {
            'text-destructive animate-pulse': isRecording,
            'text-foreground': !isRecording,
          })}
        />
      </Button>
    </>
  );
};

export default RecordingIcon;
