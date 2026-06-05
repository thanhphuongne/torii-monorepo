import React from 'react';
interface IParticipantNameProps {
  name: string;
  isCurrentUser: boolean;
}
const ParticipantName = ({ name, isCurrentUser }: IParticipantNameProps) => {
  return (
    <p className="text-xs 3xl:text-sm font-medium text-foreground">
      {name} {isCurrentUser ? '(Bạn)' : null}
    </p>
  );
};

export default ParticipantName;
