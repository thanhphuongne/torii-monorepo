/**
 * Waiting Room NATS Handler (Meet Service)
 *
 * Handles NATS message patterns for waiting room operations
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WaitingRoomService } from '@server/meet/modules/waiting-room/waiting-room.service';
import type {
  ApproveWaitingUsersReq,
  UpdateWaitingRoomMessageReq,
} from '@workspace/protocol';

/**
 * Controller for waiting room NATS message patterns
 */
@Controller()
export class WaitingRoomHandler {
  private readonly logger = new Logger(WaitingRoomHandler.name);

  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  /**
   * Handle approving users from waiting room
   *
   * @pattern waitingRoom.approveUsers
   */
  @MessagePattern({ cmd: 'waitingRoom.approveUsers' })
  async handleApproveUsers(
    @Payload() req: ApproveWaitingUsersReq,
  ): Promise<{ status: boolean; msg: string }> {
    this.logger.log(
      `Received waitingRoom.approveUsers: ${JSON.stringify(req)}`,
    );

    try {
      await this.waitingRoomService.approveWaitingUsers(req);
      return { status: true, msg: 'success' };
    } catch (error) {
      this.logger.error(`Failed to approve users: ${error.message}`);
      return { status: false, msg: error.message };
    }
  }

  /**
   * Handle updating waiting room message
   *
   * @pattern waitingRoom.updateMsg
   */
  @MessagePattern({ cmd: 'waitingRoom.updateMsg' })
  async handleUpdateWaitingRoomMessage(
    @Payload() req: UpdateWaitingRoomMessageReq,
  ): Promise<{ status: boolean; msg: string }> {
    this.logger.log(`Received waitingRoom.updateMsg: ${JSON.stringify(req)}`);

    try {
      await this.waitingRoomService.updateWaitingRoomMessage(req);
      return { status: true, msg: 'success' };
    } catch (error) {
      this.logger.error(
        `Failed to update waiting room message: ${error.message}`,
      );
      return { status: false, msg: error.message };
    }
  }
}

