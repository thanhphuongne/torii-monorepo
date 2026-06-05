import { Dispatch } from 'react';
import { once } from 'es-toolkit';

import { IConnectLivekit } from '@/helpers/livekit/types';
import { IErrorPageProps } from '@/components/extra-pages/error';
import ConnectLivekit from '@/helpers/livekit/connect-livekit';
import { roomConnectionStatus } from '@/components/app/helper';

let currentConnect: IConnectLivekit;

export const createLivekitConnection = once(
  (
    errorState: Dispatch<IErrorPageProps>,
    roomConnectionStatusState: Dispatch<roomConnectionStatus>,
    localUserId: string,
    enabledE2EE: boolean,
    encryptionKey?: string,
  ) => {
    currentConnect = new ConnectLivekit(
      errorState,
      roomConnectionStatusState,
      localUserId,
      enabledE2EE,
      encryptionKey,
    );

    return currentConnect;
  },
);

export const getMediaServerConn = () => {
  if (typeof currentConnect === 'undefined') {
    throw new Error('connection not created');
  }
  return currentConnect;
};

export const getMediaServerConnRoom = () => {
  return getMediaServerConn().room;
};
