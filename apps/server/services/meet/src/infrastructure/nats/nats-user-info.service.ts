/**
 * NATS User Info Service
 *
 * @deprecated Use NatsUserService for new code.
 * This service is now a delegating wrapper for NatsUserService to support
 * the consolidated bucket strategy while maintaining backward compatibility.
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsKvUserInfo } from '@workspace/protocol';

export const USER_METADATA_KEY = 'metadata';
@Injectable()
export class NatsUserInfoService {
  private readonly logger = new Logger(NatsUserInfoService.name);

  constructor(
    @Inject(forwardRef(() => NatsUserService))
    private readonly natsUserService: NatsUserService,
  ) {}

  async getRoomUserStatus(roomId: string, userId: string): Promise<string> {
    return this.natsUserService.getRoomUserStatus(roomId, userId);
  }

  async getUserInfo(
    roomId: string,
    userId: string,
  ): Promise<NatsKvUserInfo | null> {
    return this.natsUserService.getUserInfo(roomId, userId);
  }

  async getUserKeyValue(
    roomId: string,
    userId: string,
    key: string,
  ): Promise<any | null> {
    // NATS.js internal entry - mostly used for value/revision
    // NatsUserService.getStringValue or similar is preferred
    // But for compatibility we return the raw value if needed by caller
    // Note: Generic updateUserKeyValue returns void, but some callers might expect a KvEntry
    return this.natsUserService.getUserKeyValue(roomId, userId, key);
  }

  async getOnlineUsersId(roomId: string): Promise<string[]> {
    return this.natsUserService.getOnlineUsersId(roomId);
  }

  async getRoomAllUsersFromStatusBucket(
    roomId: string,
  ): Promise<Record<string, any> | null> {
    // This was used to list all user statuses.
    return this.natsUserService.getRoomUserIds(roomId).then((ids) => {
      const result: Record<string, any> = {};
      ids.forEach((id) => (result[id] = { value: id })); // Fake entry for compatibility
      return result;
    });
  }

  async isUserPresenter(roomId: string, userId: string): Promise<boolean> {
    return this.natsUserService.isUserPresenter(roomId, userId);
  }

  async isUserExistInBlockList(
    roomId: string,
    userId: string,
  ): Promise<boolean> {
    return this.natsUserService.isUserExistInBlockList(roomId, userId);
  }

  async getUsersIdFromRoomStatusBucket(roomId: string): Promise<string[]> {
    return this.natsUserService.getRoomUserIds(roomId);
  }

  async getOnlineUsersList(roomId: string): Promise<NatsKvUserInfo[] | null> {
    const list = await this.natsUserService.getOnlineUsersList(roomId);
    return list.length > 0 ? list : null;
  }

  async getOnlineUsersListAsJson(roomId: string): Promise<string | null> {
    return this.natsUserService.getOnlineUsersListAsJson(roomId);
  }

  async getUserMetadataStruct(
    roomId: string,
    userId: string,
  ): Promise<any | null> {
    return this.natsUserService.getUserMetadataStruct(roomId, userId);
  }

  async getUserWithMetadata(
    roomId: string,
    userId: string,
  ): Promise<{
    info: NatsKvUserInfo | null;
    metadata: any | null;
  }> {
    return this.natsUserService.getUserWithMetadata(roomId, userId);
  }

  async getUserLastPing(roomId: string, userId: string): Promise<number> {
    return this.natsUserService.getUserLastPing(roomId, userId);
  }

  async updateUserKeyValue(
    roomId: string,
    userId: string,
    key: string,
    value: string,
  ): Promise<void> {
    return this.natsUserService.updateUserKeyValue(roomId, userId, key, value);
  }
}
