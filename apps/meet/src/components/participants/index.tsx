import React, { useCallback, useMemo, useState } from 'react';
import useVirtual from 'react-cool-virtual';
import { Search, X } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';

import ParticipantComponent from '@/components/participants/participant';
import RemoveParticipantAlertModal, {
  IRemoveParticipantAlertModalData,
} from '@/components/participants/remove-participant-alert-modal';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { selectVisibleParticipants } from '@/store/slices/participant-slice';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';

const ParticipantsComponent = () => {
  const dispatch = useAppDispatch();
  const [searchParticipant, setSearchParticipant] = useState<string>('');
  const [removeParticipantData, setRemoveParticipantData] =
    useState<IRemoveParticipantAlertModalData>();

  const {
    currentUser,
    currentIsAdmin,
    currentUserUserId,
    allowViewOtherUsers,
  } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      currentUser,
      currentIsAdmin: !!currentUser?.metadata?.isAdmin,
      currentUserUserId: currentUser?.userId,
      allowViewOtherUsers:
        !!session.currentRoom.metadata?.roomFeatures?.allowViewOtherUsersList,
    };
  }, []);

  const participants = useAppSelector((state) =>
    selectVisibleParticipants(
      state,
      currentIsAdmin,
      searchParticipant,
      allowViewOtherUsers,
      currentUserUserId,
    ),
  );

  const { outerRef, innerRef, items } = useVirtual({
    itemCount: participants.length,
  });

  const onOpenRemoveParticipantAlert = useCallback(
    (name: string, user_id: string, type: string) => {
      setRemoveParticipantData({
        name,
        userId: user_id,
        removeType: type,
      });
    },
    [],
  );

  const onCloseAlertModal = () => {
    setRemoveParticipantData(undefined);
  };

  const closePanel = () => {
    dispatch(setActiveSidePanel(null));
  };

  const renderParticipant = useCallback(
    (index: number) => {
      if (!participants.length || typeof participants[index] === 'undefined') {
        return null;
      }
      const participant = participants[index];
      const isRemoteParticipant = currentUser?.userId !== participant.userId;

      return (
        <ParticipantComponent
          key={participant.userId}
          participant={participant}
          isRemoteParticipant={isRemoteParticipant}
          openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
          currentUser={currentUser}
        />
      );
    },
    [participants, currentUser, onOpenRemoveParticipantAlert],
  );

  return (
    <div className="side-panel-bg-color relative z-10 w-full bg-card border-l border-border h-full">
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute z-50 right-3 3xl:right-5 top-[10px] text-muted-foreground hover:text-foreground p-0"
        onClick={closePanel}
        aria-label="Đóng danh sách thành viên"
      >
        <X className="w-5 h-5" />
      </Button>
      <div className="inner-wrapper relative z-20 w-full">
        <div className="top flex items-center h-10 px-3 3xl:px-5">
          <p className="text-sm text-foreground font-medium leading-tight">
            Thành viên ({participants.length})
          </p>
        </div>
        <div className="search-participants-wrap h-[55px] flex items-center px-3 3xl:px-5 border-y border-border">
          <div className="w-full relative">
            <div className="search-icon text-muted-foreground absolute top-1/2 -translate-y-1/2 left-3 3xl:left-4 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <Input
              type="text"
              name="search-participants"
              id="search-participants"
              placeholder="Tìm kiếm thành viên"
              className="ltr:pl-8 3xl:ltr:pl-10 rtl:pr-8 3xl:rtl:pr-10"
              onChange={(e) => setSearchParticipant(e.target.value)}
            />
          </div>
        </div>

        <div
          ref={outerRef as any}
          className="scrollBar overflow-auto h-[calc(100vh-240px)]"
        >
          <div
            className="all-participants-wrap px-2 xl:px-3 3xl:px-5"
            ref={innerRef as any}
          >
            {items.map(({ index, measureRef }) => (
              <li
                key={index}
                ref={measureRef}
                className="w-full list-none min-h-[40px] 3xl:min-h-[60px] py-1 flex items-center"
              >
                {renderParticipant(index)}
              </li>
            ))}
          </div>
        </div>
      </div>

      {removeParticipantData && (
        <RemoveParticipantAlertModal
          name={removeParticipantData.name}
          userId={removeParticipantData.userId}
          removeType={removeParticipantData.removeType}
          closeAlertModal={onCloseAlertModal}
        />
      )}
    </div>
  );
};

export default ParticipantsComponent;
