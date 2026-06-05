import axios, { AxiosError, ResponseType } from 'axios';
import {
  CommonResponseSchema,
  NatsMsgClientToServerEvents,
  NatsMsgClientToServerSchema,
} from '@workspace/protocol';
import { create, toBinary } from '@bufbuild/protobuf';

import { getAccessToken } from '@/helpers/utils';
import { SERVER_URL } from '@/config';
import { store } from '@/store';
import { getNatsConn } from '@/helpers/nats';

const API = axios.create({
  baseURL: SERVER_URL + '/api',
});

const getToken = () => {
  const token = store.getState().session.token;
  if (token) {
    return store.getState().session.token;
  }

  // this mostly happened during the first time before validation
  return getAccessToken();
};

export const requestToRenewWajlcToken = () => {
  const token = getToken();
  if (token) {
    const conn = getNatsConn();
    if (conn) {
      conn.sendMessageToSystemWorker(
        create(NatsMsgClientToServerSchema, {
          event: NatsMsgClientToServerEvents.REQ_RENEW_WAJLC_TOKEN,
          msg: token,
        }),
      );
    }
  }
};

const sendAPIRequest = async (
  path: string,
  body: any,
  json_encode = true,
  content_type = 'application/json',
  response_type: ResponseType = 'json',
) => {
  try {
    if (json_encode) {
      body = JSON.stringify(body);
    }
    const res = await API.post(path, body, {
      headers: {
        Authorization: 'Bearer ' + getToken(),
        'Content-Type': content_type,
      },
      responseType: response_type,
    });
    return res.data;
  } catch (e: any) {
    const err = e as AxiosError;
    console.error(err.message);

    // if status = 401 then we'll try to renew token
    // so that next try will not be failing because of the expired token
    if (err.status === 401) {
      console.info(`Got status: ${err.status}, trying to renew token.`);
      requestToRenewWajlcToken();
    }
    const output = {
      status: false,
      msg: err.code + ': ' + err.message,
    };

    // @ts-expect-error we'll check if the value is undefined
    if (typeof err.response?.data?.msg !== 'undefined') {
      // @ts-expect-error we checked if the value is undefined
      output.msg = err.response?.data?.msg.replace(
        'go-jose/go-jose/jwt',
        err.response.statusText,
      );
    }

    if (!json_encode) {
      const res = create(CommonResponseSchema, output);
      return toBinary(CommonResponseSchema, res);
    } else {
      return output;
    }
  }
};

export default sendAPIRequest;
