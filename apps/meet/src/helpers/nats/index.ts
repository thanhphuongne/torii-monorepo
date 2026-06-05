import { Dispatch } from 'react';
import { NatsSubjects } from '@workspace/protocol';
import { once } from 'es-toolkit';

import ConnectNats from '@/helpers/nats/connect-nats';
import { IErrorPageProps } from '@/components/extra-pages/error';
import { IConnectLivekit } from '@/helpers/livekit/types';
import { roomConnectionStatus } from '@/components/app/helper';

let conn: ConnectNats | undefined = undefined;

export const startNatsConn = once(
    async (
        natsWSUrl: string[],
        token: string,
        roomId: string,
        userId: string,
        roomStreamName: string,
        subjects: NatsSubjects,
        errorState: Dispatch<IErrorPageProps>,
        roomConnectionStatusState: Dispatch<roomConnectionStatus>,
        setCurrentMediaServerConn: Dispatch<IConnectLivekit>,
    ) => {
      conn = new ConnectNats(
          natsWSUrl,
          token,
          roomId,
          userId,
          roomStreamName,
          subjects,
          errorState,
          roomConnectionStatusState,
          setCurrentMediaServerConn,
      );
      await conn.openConn();
    },
);

export const getNatsConn = () => {
  return conn as ConnectNats;
};