import { IParticipant } from '@/store/slices/interfaces/participant';
import WaitingParticipantItem from '@/components/waiting-room/waiting-participant-item';

interface IParticipantsListProps {
  waitingParticipants: IParticipant[];
}

const ParticipantsList = ({ waitingParticipants }: IParticipantsListProps) => {
  return (
    <div className="waiting-list-wrap">
      <p className="text-lg my-4 text-foreground font-medium ltr:text-left rtl:text-right">
        Danh sách đang chờ ({waitingParticipants.length})
      </p>
      <div className="waiting-list scrollBar h-[122px] overflow-auto">
        <div className="waiting-list-inner pb-0.5 pr-0.5">
          {waitingParticipants.length > 0 ? (
            waitingParticipants.map((p) => (
              <WaitingParticipantItem key={p.userId} participant={p} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Không có người dùng nào đang chờ
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
