import { Request } from 'express';
import { Requester } from '@workspace/schemas';

/**
 * Server-side version of ReqWithRequester that integrates with Express.Request.
 * Use this in Controllers to get full type safety for both Express properties (headers, cookies)
 * and the 'requester' object.
 */
export type ReqWithRequester = Request & {
  requester: Requester;
};
