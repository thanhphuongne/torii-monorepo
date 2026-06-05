import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BreakoutRoom,
  BreakoutRoomSchema,
  CreateBreakoutRoomsReq,
  CreateBreakoutRoomsReqSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';

import RoomNumberSelector from '@/components/breakout-room/form/room-number-selector';
import RoomBox from '@/components/breakout-room/form/room-box';
import { store, useAppDispatch, useAppSelector } from '@/store';
import { RoomType, UserType } from '@/components/breakout-room/form/types';
import { BreakoutRoomMessage } from '..';
import { selectBasicParticipants } from '@/store/slices/participant-slice';
import useStorePreviousInt from '@/helpers/hooks/use-store-previous-int';
import { updateBreakoutRoomDroppedUser } from '@/store/slices/breakout-room-slice';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Textarea } from '@workspace/ui/components/textarea';

interface IFromElemsProps {
  createBreakoutRooms: (req: CreateBreakoutRoomsReq) => void;
  isLoading: boolean;
  setMessage: (message: BreakoutRoomMessage | null) => void;
}

const FromElems = ({
  createBreakoutRooms,
  isLoading,
  setMessage,
}: IFromElemsProps) => {
  const dispatch = useAppDispatch();
  const participants = useAppSelector(selectBasicParticipants);
  const droppedUser = useAppSelector((state) => state.breakoutRoom.droppedUser);

  const [totalRooms, setTotalRooms] = useState<number>(1);
  const preTotalRooms = useStorePreviousInt(totalRooms);
  const [roomDuration, setRoomDuration] = useState<number>(15);
  const [welcomeMsg, setWelcomeMsg] = useState<string>(
    () => store.getState().session.currentRoom.metadata?.welcomeMessage ?? '',
  );
  const [users, setUsers] = useState<Array<UserType>>([]);

  // we'll clean during unmount
  useEffect(() => {
    return () => {
      dispatch(
        updateBreakoutRoomDroppedUser({
          id: '',
          roomId: 0,
        }),
      );
    };
  }, [dispatch]);

  useEffect(() => {
    // Sync users state with participants from the store
    const existingUsersMap = new Map(users.map((u) => [u.id, u]));
    const newUsers = participants.map((p) => {
      const existingUser = existingUsersMap.get(p.userId);
      if (existingUser) {
        return existingUser;
      }
      return { id: p.userId, name: p.name, roomId: 0, joined: false };
    });
    setUsers(newUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  // if room number decreases then we'll reset otherwise user will be missing
  useEffect(() => {
    if (totalRooms >= preTotalRooms) {
      return;
    }
    // Move users from deleted rooms back to the main room
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.roomId > totalRooms ? { ...user, roomId: 0 } : user,
      ),
    );
  }, [totalRooms, preTotalRooms]);

  const roomList = useMemo(() => {
    const generatedRooms: Array<RoomType> = [
      {
        id: 0,
        name: 'Phòng chính',
      },
    ];
    for (let i = 0; i < totalRooms; i++) {
      generatedRooms.push({
        id: i + 1,
        name: `Phòng ${i + 1}`,
      });
    }
    return generatedRooms;
  }, [totalRooms]);

  useEffect(() => {
    if (droppedUser.id === '') {
      return;
    }
    const newUsers = users.map((user) => {
      if (user.id === droppedUser.id) {
        user.roomId = droppedUser.roomId;
      }
      return user;
    });

    setUsers(newUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedUser]); // users is intentionally omitted

  const randomSelection = () => {
    if (!users.length || !roomList.length) {
      return;
    }
    const tmp = [...users];
    const tmpRooms = [...roomList];
    tmpRooms.shift();

    for (let i = 0; i < tmp.length; i++) {
      const r = Math.floor(Math.random() * tmpRooms.length);
      tmp[i].roomId = tmpRooms[r].id;
    }

    setUsers(tmp);
  };

  const handleStartBreakoutRooms = useCallback(() => {
    const tmp: Array<BreakoutRoom> = [];
    roomList.forEach((r) => {
      if (r.id !== 0) {
        const u = users.filter((u) => u.roomId === r.id);
        if (u.length) {
          const room = create(BreakoutRoomSchema, {
            id: `${r.id}`,
            title: r.name,
            users: u,
            duration: String(roomDuration),
            started: false,
            created: String(Date.now()),
          });
          tmp.push(room);
        }
      }
    });

    if (!tmp.length) {
      setMessage({ text: 'Cần ít nhất một người ở phòng thảo luận riêng', type: 'error' });
      return;
    }

    const req = create(CreateBreakoutRoomsReqSchema, {
      duration: String(roomDuration),
      welcomeMsg: welcomeMsg,
      rooms: tmp,
    });
    createBreakoutRooms(req);
  }, [
    roomList,
    users,
    roomDuration,
    welcomeMsg,
    createBreakoutRooms,
    setMessage,
  ]);

  return (
    <div className="break-out-room-main-area">
      <div className="row flex flex-wrap justify-start items-end">
        <RoomNumberSelector
          totalRooms={totalRooms}
          setTotalRooms={setTotalRooms}
        />
        <div className="room-durations w-full sm:w-56 mb-4">
          <Label
            className="block text-sm font-medium text-foreground mb-2"
            htmlFor="breakout-room-duration"
          >
            Thời hạn (phút)
          </Label>
          <Input
            className="h-10 rounded-xl text-foreground border border-border bg-card shadow-sm w-full px-3 outline-hidden focus:border-primary"
            id="breakout-room-duration"
            type="number"
            value={roomDuration}
            onChange={(e) => setRoomDuration(Number(e.currentTarget.value))}
          />
        </div>
      </div>
      <div className="row flex flex-wrap justify-between items-end">
        <div className="room-welcome-messages w-full sm:max-w-122 mb-4 sm:ltr:mr-10 sm:rtl:ml-10">
          <Label
            className="block text-sm font-medium text-foreground mb-1"
            htmlFor="breakout-room-welcome"
          >
            Lời chào mừng
          </Label>
          <Textarea
            className="h-20 rounded-xl text-foreground border border-border bg-card shadow-sm w-full px-3 py-2 outline-hidden focus:border-primary"
            id="breakout-room-welcome"
            onChange={(e) => setWelcomeMsg(e.currentTarget.value)}
            value={welcomeMsg}
          />
        </div>
        <div className="random-room-select mb-4 rtl:ml-6">
          <Button
            className="h-9 w-auto ml-auto px-5 cursor-pointer text-sm font-semibold bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground transition-all duration-300 shadow-sm"
            onClick={randomSelection}
          >
            Chọn ngẫu nhiên
          </Button>
        </div>
      </div>
      <div className="draggable-room-area overflow-hidden clear-both flex flex-wrap">
        {roomList.map((room) => {
          return (
            <div
              className="room-box-wrap w-[calc(50%-6px)] m-[3px] sm:m-0 sm:w-auto"
              key={room.id}
            >
              <RoomBox
                roomId={room.id}
                name={room.name}
                users={users.filter((user) => user.roomId === room.id)}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-4">
        <Button
          className="h-9 w-auto px-5 cursor-pointer text-sm font-semibold bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground transition-all duration-300 shadow-sm disabled:opacity-50"
          onClick={handleStartBreakoutRooms}
          disabled={isLoading}
        >
          Bắt đầu
        </Button>
      </div>
    </div>
  );
};

export default FromElems;
