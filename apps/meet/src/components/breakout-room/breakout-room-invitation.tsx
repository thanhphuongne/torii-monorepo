import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { LocalAudioTrack, Track } from 'livekit-client';
import {
  Button as HeadlessButton,
  Dialog,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { toast } from 'react-toastify';
import copy from 'copy-text-to-clipboard';
import { JoinBreakoutRoomReqSchema } from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';

import { useAppDispatch, useAppSelector } from '@/store';
import { updateReceivedInvitationFor } from '@/store/slices/breakout-room-slice';
import { useJoinRoomMutation } from '@/store/services/breakout-room-api';
import {
  updateIsActiveWebcam,
  updateIsMicMuted,
  updateVirtualBackground,
} from '@/store/slices/bottom-icons-activity-slice';
import { updateSelectedVideoDevice } from '@/store/slices/roomSettingsSlice';
import { getMediaServerConnRoom } from '@/helpers/livekit/utils';
import { X } from 'lucide-react';

const BreakoutRoomInvitation = () => {
  const dispatch = useAppDispatch();
  const currentRoom = getMediaServerConnRoom();

  const receivedInvitationFor = useAppSelector(
    (state) => state.breakoutRoom.receivedInvitationFor,
  );
  const [joinRoom, { isLoading, isSuccess, isError, data, error }] =
    useJoinRoomMutation();
  const [joinLink, setJoinLink] = useState<string>('');
  const [copyText, setCopyText] = useState<string>(
    'Sao chép',
  );

  const closeLocalTracks = useCallback(() => {
    currentRoom.localParticipant
      .getTrackPublications()
      .forEach(async (publication) => {
        if (!publication.track) {
          return;
        }
        if (publication.track.source === Track.Source.Camera) {
          await currentRoom.localParticipant.unpublishTrack(
            publication.track.mediaStreamTrack,
            true,
          );
          dispatch(updateIsActiveWebcam(false));
          dispatch(updateSelectedVideoDevice(''));
          dispatch(
            updateVirtualBackground({
              type: 'none',
            }),
          );
        } else if (publication.track.source === Track.Source.Microphone) {
          if (!publication.isMuted) {
            const track = publication.audioTrack as LocalAudioTrack;
            await track.mute();
            dispatch(updateIsMicMuted(true));
          }
        }
      });
  }, [currentRoom.localParticipant, dispatch]);

  useEffect(() => {
    if (isSuccess && data?.status && data.token) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('access_token', data.token);
      const url =
        location.protocol +
        '//' +
        location.host +
        window.location.pathname +
        '?' +
        searchParams.toString();

      if (!window.open(url, '_blank')) {
        // If popup was blocked, show the link to the user.
        setJoinLink(url);
        return;
      }

      // If popup opened successfully, close the invitation and local tracks.
      dispatch(updateReceivedInvitationFor(''));
      closeLocalTracks();
    } else if ((isSuccess && !data?.status) || isError) {
      const msg = data?.msg ?? (error as any)?.data?.msg ?? 'Lỗi';
      toast(msg, { type: 'error' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isError, data, error]);

  const closeModal = () => {
    dispatch(updateReceivedInvitationFor(''));
    // we should disable running tracks
    closeLocalTracks();
  };

  const join = () => {
    joinRoom(
      create(JoinBreakoutRoomReqSchema, {
        breakoutRoomId: receivedInvitationFor,
        userId: currentRoom.localParticipant.identity,
      }),
    );
  };

  const copyUrl = () => {
    copy(joinLink);
    setCopyText('Đã sao chép');
    setTimeout(() => {
      setCopyText('Sao chép');
    }, 2000);
  };

  if (receivedInvitationFor === '') {
    return null;
  }

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog
        as="div"
        className="breakoutRoomModalInvite fixed inset-0 w-screen overflow-y-auto z-10 bg-background/80"
        onClose={closeModal}
      >
        <div className="min-h-full flex p-4 items-end justify-end">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-max h-full bg-card border border-border shadow-lg p-4 rounded-xl overflow-hidden duration-300 ease-out">
              <DialogTitle
                as="h3"
                className="flex items-center justify-between text-base font-semibold leading-7 text-foreground mb-2 border-b border-border pb-2"
              >
                <span>Mời tham gia phòng nhóm</span>
                <HeadlessButton className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors" onClick={closeModal}>
                  <X className="w-5 h-5" />
                </HeadlessButton>
              </DialogTitle>
              <div className="mt-2">
                <span className="text-foreground text-sm">
                  Bạn đã được mời tham gia phòng thảo luận riêng.
                </span>

                {joinLink !== '' && (
                  <div className="invite-link mt-2">
                    <Label className="block mb-1 text-sm">
                      Liên kết tham gia
                    </Label>
                    <div className="wrap flex items-center gap-1">
                      <Input
                        type="text"
                        readOnly={true}
                        value={joinLink}
                        className="w-full h-7"
                      />
                      <Button
                        onClick={copyUrl}
                        size="xs"
                      >
                        {copyText}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="button-section flex items-center justify-start mt-4">
                  <Button
                    onClick={join}
                    disabled={isLoading}
                  >
                    Tham gia
                  </Button>
                </div>
              </div>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default React.memo(BreakoutRoomInvitation);
