import { createSelector } from '@reduxjs/toolkit';

import { useAppDispatch, useAppSelector } from '@/store';
import { updateShowManageWaitingRoomModal } from '@/store/slices/bottom-icons-activity-slice';
import { participantsSelector } from '@/store/slices/participant-slice';
import Modal from '@/helpers/ui/modal';
import UpdateRoomMessage from '@/components/waiting-room/update-room-message';
import BulkAction from '@/components/waiting-room/bulk-action';
import ParticipantsList from '@/components/waiting-room/participants-list';

const selectWaitingParticipants = createSelector(
  [participantsSelector.selectAll],
  (participants) => participants.filter((p) => p.metadata.waitForApproval),
);

const ManageWaitingRoom = () => {
  const dispatch = useAppDispatch();
  const waitingParticipants = useAppSelector(selectWaitingParticipants);

  const closeModal = () => {
    dispatch(updateShowManageWaitingRoomModal(false));
  };

  return (
    <Modal
      show={true}
      onClose={closeModal}
      title="Quản lý phòng chờ"
      customClass="showManageWaitingRoomModal overflow-hidden"
      maxWidth="max-w-xl"
    >
      {waitingParticipants.length ? (
        <>
          <UpdateRoomMessage />
          <ParticipantsList waitingParticipants={waitingParticipants} />
          <BulkAction waitingParticipants={waitingParticipants} />
        </>
      ) : (
        <p className="text-foreground">
          Không có yêu cầu tham gia nào đang chờ
        </p>
      )}
    </Modal>
  );
};

export default ManageWaitingRoom;
