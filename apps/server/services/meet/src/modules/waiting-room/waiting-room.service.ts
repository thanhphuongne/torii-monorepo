/**
 * Waiting Room Service
 *
 * Handles waiting room operations:
 * - Approving users from waiting room
 * - Updating waiting room messages
 */

import { Injectable, Logger } from '@nestjs/common';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import type {
  ApproveWaitingUsersReq,
  UpdateWaitingRoomMessageReq,
} from '@workspace/protocol';

/**
 * Service for managing waiting room operations
 */
@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);

  constructor(
    private readonly natsService: NatsService,
    private readonly natsUserInfoService: NatsUserInfoService,
    private readonly natsUserService: NatsUserService,
    private readonly natsRoomService: NatsRoomService,
    private readonly natsRoomEventsService: NatsRoomEventsService,
  ) {}

  /**
   * approveWaitingUsers approves one or all users from the waiting room
   *
   * @param req - Approval request containing roomId and userId (or "all")
   */
  async approveWaitingUsers(req: ApproveWaitingUsersReq): Promise<void> {
    const log = this.logger;
    log.log(
      `Approving waiting users in room ${req.roomId}, userId: ${req.userId}`,
    );

    // If approving all users
    if (req.userId === 'all') {
      log.log('Approving all waiting users');

      // Get all online users
      const participants = await this.natsUserInfoService.getOnlineUsersList(
        req.roomId,
      );
      if (!participants || participants.length === 0) {
        log.warn('No participants found in room');
        return;
      }

      // Approve each user
      for (const p of participants) {
        try {
          await this.approveUser(req.roomId, p.userId, p.metadata);
        } catch (error) {
          log.error(`Error approving user ${p.userId}: ${error.message}`);
        }
      }

      return;
    }

    // Approve single user
    const userInfo = await this.natsUserInfoService.getUserInfo(
      req.roomId,
      req.userId,
    );
    if (!userInfo) {
      throw new Error('Không tìm thấy người dùng');
    }

    await this.approveUser(req.roomId, req.userId, userInfo.metadata);
  }

  /**
   * approveUser approves a single user by updating their metadata
   *
   * @param roomId - Room ID
   * @param userId - User ID to approve
   * @param metadata - User metadata JSON string
   */
  private async approveUser(
    roomId: string,
    userId: string,
    metadata: string,
  ): Promise<void> {
    // Unmarshal user metadata
    const mt = this.natsService.unmarshalUserMetadata(metadata);
    if (!mt) {
      throw new Error('Không đọc được metadata người dùng');
    }

    // Set waitForApproval to false (user doesn't need to wait anymore)
    mt.waitForApproval = false;

    // Update and broadcast user metadata
    try {
      await this.natsUserService.updateAndBroadcastUserMetadata(
        roomId,
        userId,
        mt,
        undefined,
      );
    } catch (error) {
      throw new Error('Duyệt người dùng thất bại. Vui lòng thử lại.');
    }
  }

  /**
   * updateWaitingRoomMessage updates the waiting room message for a room
   *
   * @param req - Request containing roomId and new message
   */
  async updateWaitingRoomMessage(
    req: UpdateWaitingRoomMessageReq,
  ): Promise<void> {
    this.logger.log(`Updating waiting room message for room ${req.roomId}`);

    // Get room metadata
    const roomMeta = await this.natsRoomService.getRoomMetadataStruct(
      req.roomId,
    );
    if (!roomMeta) {
      throw new Error('Thông tin metadata phòng không hợp lệ hoặc thiếu');
    }

    // Update waiting room message
    if (!roomMeta.roomFeatures?.waitingRoomFeatures) {
      throw new Error('Phòng chờ chưa được cấu hình');
    }

    roomMeta.roomFeatures.waitingRoomFeatures.waitingRoomMsg = req.msg;

    // Update and broadcast room metadata
    await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
      req.roomId,
      roomMeta,
    );

    this.logger.log('Successfully updated waiting room message');
  }
}
