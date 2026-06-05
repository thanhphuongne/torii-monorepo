import React, { memo } from 'react';

import Avatar from '@/components/participants/participant/avatar';
import ParticipantName from '@/components/participants/participant/name';
import RaiseHandIcon from '@/components/participants/participant/icons/raise-hand';
import MicIcon from '@/components/participants/participant/icons/mic';
import WebcamIcon from '@/components/participants/participant/icons/webcam';
import ScreenShareIcon from '@/components/participants/participant/icons/screen-share';
import MenuIcon from '@/components/participants/participant/icons/menu';
import VisibilityIcon from '@/components/participants/participant/icons/visibility';
import PresenterIcon from '@/components/participants/participant/icons/presenter-icon';
import WaitingApproval from '@/components/participants/participant/waiting-approval';

import { ICurrentUser } from '@/store/slices/interfaces/session';
import { IVisibleParticipantInfo } from '@/store/slices/interfaces/participant';

interface IParticipantComponentProps {
  participant: IVisibleParticipantInfo;
  currentUser: ICurrentUser | undefined;
  isRemoteParticipant: boolean;
  openRemoveParticipantAlert(name: string, userId: string, type: string): void;
}

const ParticipantComponent = ({
  participant,
  currentUser,
  isRemoteParticipant,
  openRemoveParticipantAlert,
}: IParticipantComponentProps) => {
  const onOpenRemoveParticipantAlert = (user_id: string, type: string) => {
    if (user_id === participant.userId) {
      openRemoveParticipantAlert(participant.name, user_id, type);
    }
  };

  return (
    <div className="flex items-center justify-between relative w-full gap-2">
      <div className="left flex items-center gap-1.5 3xl:gap-[10px]">
        <Avatar participant={participant} />
        <ParticipantName
          name={participant.name}
          isCurrentUser={currentUser?.userId === participant.userId}
        />
      </div>
      <div className="right flex-auto flex items-center justify-end ml-2">
        <div className="icon-group flex items-center justify-center gap-1">
          <RaiseHandIcon userId={participant.userId} />
          <VisibilityIcon userId={participant.userId} />
          <PresenterIcon userId={participant.userId} />
          <WebcamIcon userId={participant.userId} />
          <ScreenShareIcon userId={participant.userId} />
          <MicIcon
            userId={participant.userId}
            isRemoteParticipant={isRemoteParticipant}
          />
          {currentUser?.userId !== participant.userId && (
            <MenuIcon
              userId={participant.userId}
              name={participant.name}
              isAdmin={participant.isAdmin}
              openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
            />
          )}
        </div>
      </div>
      {currentUser?.metadata?.isAdmin && (
        <WaitingApproval
          userId={participant.userId}
          name={participant.name}
          openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
        />
      )}
    </div>
  );
};

export default memo(ParticipantComponent);
