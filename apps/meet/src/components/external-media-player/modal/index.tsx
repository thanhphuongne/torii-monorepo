import React, { useState } from 'react';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  ExternalMediaPlayerReqSchema,
  ExternalMediaPlayerTask,
} from '@workspace/protocol';

import { useAppDispatch, useAppSelector } from '@/store';
import {
  updateIsActiveWhiteboard,
  updateShowExternalMediaPlayerModal,
} from '@/store/slices/bottom-icons-activity-slice';

import DirectLink from '@/components/external-media-player/modal/direct-link';
import Upload from '@/components/external-media-player/modal/upload';
import Modal from '@/helpers/ui/modal';
import ActionButton from '@/helpers/ui/action-button';
import sendAPIRequest from '@/helpers/api/api-client';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs';

const ExternalMediaPlayerModal = () => {
  const dispatch = useAppDispatch();

  const isActive = useAppSelector(
    (state) =>
      !!state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.isActive,
  );
  const lastLink = useAppSelector(
    (state) =>
      state.session.currentRoom.metadata?.roomFeatures
        ?.externalMediaPlayerFeatures?.url,
  );

  const [selectedUrl, setSelectedUrl] = useState<string>(lastLink ?? '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'direct' | 'upload'>('direct');

  const handleStartPlayingUrl = async () => {
    setIsLoading(true);
    setErrorMsg(undefined);

    const body = create(ExternalMediaPlayerReqSchema, {
      task: ExternalMediaPlayerTask.START_PLAYBACK,
      url: selectedUrl,
    });
    const r = await sendAPIRequest(
      'externalMediaPlayer',
      toBinary(ExternalMediaPlayerReqSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));

    if (!res.status) {
      setErrorMsg(res.msg);
    }

    setIsLoading(false);
    // hide whiteboard to make this visible
    dispatch(updateIsActiveWhiteboard(false));
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  const closeStartModal = () => {
    dispatch(updateShowExternalMediaPlayerModal(false));
  };

  return (
    !isActive && (
      <Modal
        show={!isActive}
        onClose={closeStartModal}
        title="Trình phát đa phương tiện"
        customClass="min-h-[30rem]"
      >
        {errorMsg && (
          <div className="error-msg text-xs text-destructive py-1">{errorMsg}</div>
        )}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'direct' | 'upload')}
          className="w-full min-w-0"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">Liên kết trực tiếp</TabsTrigger>
            <TabsTrigger value="upload">Tải lên tệp</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="min-w-0 pt-3">
            <DirectLink setSelectedUrl={setSelectedUrl} selectedUrl={selectedUrl} />
          </TabsContent>
          <TabsContent value="upload" className="min-w-0 pt-3">
            <Upload setSelectedUrl={setSelectedUrl} isPlayBtnLoading={isLoading} />
          </TabsContent>
        </Tabs>
        <div className="mt-8 flex justify-end">
          <ActionButton
            isLoading={isLoading}
            buttonType="submit"
            disabled={selectedUrl === ''}
            onClick={handleStartPlayingUrl}
          >
            Phát
          </ActionButton>
        </div>
      </Modal>
    )
  );
};

export default ExternalMediaPlayerModal;
