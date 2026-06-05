import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  updateIsActiveWebcam,
  updateShowVideoShareModal,
} from '@/store/slices/bottom-icons-activity-slice';
import { getInputMediaDevices } from '@/helpers/utils';
import PreviewWebcam from '@/components/footer/modals/webcam/preview-webcam';
import { addVideoDevices } from '@/store/slices/roomSettingsSlice';
import Modal from '@/helpers/ui/modal';
import Dropdown from '@/helpers/ui/dropdown';
import ActionButton from '@/helpers/ui/action-button';
import { Button } from '@workspace/ui/components/button';
import { IMediaDevice } from '@/store/slices/interfaces/room-settings';

interface IShareWebcamModal {
  onSelectedDevice: (deviceId: string) => void;
  displayWebcamSelection: boolean;
  selectedDeviceId: string;
}

const ShareWebcamModal = ({
  onSelectedDevice,
  displayWebcamSelection,
  selectedDeviceId,
}: IShareWebcamModal) => {
  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );
  const [selectedWebcam, setSelectWebcam] = useState<string>(selectedDeviceId);
  const [devices, setDevices] = useState<IMediaDevice[]>([]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const getDeviceWebcams = async () => {
      const inputDevices = await getInputMediaDevices('video');
      if (!inputDevices.video.length) {
        return;
      }

      setDevices(inputDevices.video);
      if (selectedDeviceId !== '') {
        setSelectWebcam(selectedDeviceId);
      } else {
        setSelectWebcam(inputDevices.video[0].id);
      }
      dispatch(addVideoDevices(inputDevices.video));
    };
    getDeviceWebcams().then();
    //eslint-disable-next-line
  }, []);

  const shareWebcam = async () => {
    onClose();
    if (!selectedWebcam) {
      return;
    }
    onSelectedDevice(selectedWebcam);
  };

  const onClose = () => {
    dispatch(updateShowVideoShareModal(false));
    dispatch(updateIsActiveWebcam(false));
  };

  return (
    showVideoShareModal && (
      <Modal
        show={showVideoShareModal}
        onClose={onClose}
        title="Chọn máy ảnh"
        customClass="ChooseBackgroud"
        renderButtons={() => (
          <div className="grid grid-cols-2 gap-5">
            <Button
              className="h-9 px-4 flex items-center justify-center cursor-pointer text-sm font-semibold bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Hủy
            </Button>
            <ActionButton onClick={shareWebcam}>Chia sẻ</ActionButton>
          </div>
        )}
      >
        {displayWebcamSelection && (
          <div className="webcam-dropdown mb-4">
            <Dropdown
              id="webcam"
              value={selectedWebcam}
              onChange={setSelectWebcam}
              options={devices.map((d) => ({
                value: d.id,
                text: d.label,
              }))}
            />
          </div>
        )}
        <div className="w-full">
          <PreviewWebcam deviceId={selectedWebcam} />
        </div>
      </Modal>
    )
  );
};

export default ShareWebcamModal;
