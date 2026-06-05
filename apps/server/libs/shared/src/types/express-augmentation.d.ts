import { Requester } from '@workspace/schemas';

declare global {
  namespace Express {
    interface Request {
      requester: Requester;
    }
  }
}
