import type { Dispatch, SetStateAction } from 'react';
import { once } from 'es-toolkit';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  NatsSubjects,
  VerifyTokenReqSchema,
  VerifyTokenResSchema,
} from '@workspace/protocol';

import sendAPIRequest from '@/helpers/api/api-client';
import { IErrorPageProps } from '@/components/extra-pages/error';
import { getAccessToken } from '@/helpers/utils';
import { store } from '@/store';
import { updateIsCloud } from '@/store/slices/session-slice';

declare const IS_PRODUCTION: boolean;

export type roomConnectionStatus =
  | 'loading'
  | 'connecting'
  | 'checking'
  | 'connected'
  | 'disconnected'
  | 're-connecting'
  | 'error'
  | 'receiving-data'
  | 'ready'
  | 'media-server-conn-start'
  | 'media-server-conn-established';

export interface InfoToOpenConn {
  accessToken: string;
  serverVersion: string;
  natsWsUrls: string[];
  roomId: string;
  userId: string;
  roomStreamName: string;
  natsSubjects: NatsSubjects;
}

export const verifyToken = once(
  async (
    setLoading: Dispatch<SetStateAction<boolean>>,
    setError: Dispatch<SetStateAction<IErrorPageProps | undefined>>,
    setOpenConnInfo: Dispatch<SetStateAction<InfoToOpenConn | undefined>>,
  ) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setLoading(false);
      setError({
        title: 'Thiếu mã truy cập',
        text: 'Không tìm thấy mã truy cập hợp lệ. Vui lòng thử lại.',
      });
      return;
    } else if (
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost'
    ) {
      setLoading(false);
      setError({
        title: 'Yêu cầu kết nối bảo mật (SSL)',
        text: 'Ứng dụng yêu cầu kết nối HTTPS để hoạt động.',
      });
      return;
    }

    const r = await sendAPIRequest(
      'verifyToken',
      toBinary(
        VerifyTokenReqSchema,
        create(VerifyTokenReqSchema, {
          isProduction: IS_PRODUCTION,
        }),
      ),
      false,
      'application/protobuf',
      'arraybuffer',
    );
    const res = fromBinary(VerifyTokenResSchema, new Uint8Array(r));

    if (
      res.status &&
      res.natsWsUrls.length &&
      res.roomId &&
      res.userId &&
      res.roomStreamName &&
      res.natsSubjects
    ) {
      setOpenConnInfo({
        accessToken: accessToken,
        natsWsUrls: res.natsWsUrls,
        roomStreamName: res.roomStreamName,
        natsSubjects: res.natsSubjects,
        roomId: res.roomId,
        userId: res.userId,
        serverVersion: res.serverVersion ?? '',
      });
      store.dispatch(updateIsCloud(!!res.isCloud));
    } else {
      setLoading(false);
      setError({
        title: 'Xác thực thất bại',
        text: res.msg,
      });
    }
  },
);