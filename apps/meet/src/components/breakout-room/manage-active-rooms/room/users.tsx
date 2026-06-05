import React, { useMemo } from 'react';
import { BreakoutRoomUser, DataMsgBodyType } from '@workspace/protocol';
import { chunk } from 'es-toolkit';
import { Button } from '@workspace/ui/components/button';

import { generateAvatarInitial } from '@/helpers/utils';
import { getNatsConn } from '@/helpers/nats';
import { BreakoutRoomMessage } from '@/components/breakout-room/index';

interface IBreakoutRoomUsersProps {
  users: Array<BreakoutRoomUser>;
  breakoutRoomId: string;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}
const BreakoutRoomUsers = ({
  users,
  breakoutRoomId,
  setMessage,
}: IBreakoutRoomUsersProps) => {

  const userChunks = useMemo(() => {
    const sortedUsers = [...users].sort(
      (a, b) => Number(b.joined) - Number(a.joined),
    );
    return chunk(sortedUsers, 5);
  }, [users]);

  const pushUser = (name: string, userId: string) => {
    const conn = getNatsConn();
    conn.sendDataMessage(
      DataMsgBodyType.PUSH_JOIN_BREAKOUT_ROOM,
      breakoutRoomId,
      userId,
    );
    setMessage({
      text: `Bạn đã mời ${name}`,
      type: 'info',
    });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="flex flex-nowrap items-start -mx-2 mt-5">
      {userChunks.map((chunk, i) => (
        <ul
          key={`chunk-${i}`}
          className="flex flex-col gap-y-2 px-2 border-r border-solid border-border last:border-r-0"
        >
          {chunk.map((user) => (
            <li key={user.id} className="flex items-center gap-2 text-sm">
              <div
                className={`thumb h-6 w-6 rounded-full text-xs font-medium text-white flex items-center justify-center overflow-hidden shrink-0 ${user.joined ? 'bg-green-500' : 'bg-red-500'
                  }`}
                title={
                  user.joined
                    ? "Người dùng đã tham gia"
                    : "Chưa tham gia"
                }
              >
                {generateAvatarInitial(user.name)}
              </div>
              <span className="text-foreground break-all">
                {user.name}
              </span>
              {!user.joined && (
                <Button
                  size="xs"
                  onClick={() => pushUser(user.name, user.id)}
                  className="ml-auto rounded-full"
                >
                  Mời
                </Button>
              )}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
};

export default BreakoutRoomUsers;
