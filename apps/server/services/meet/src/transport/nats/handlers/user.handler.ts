/**
 * User NATS Handler (Meet Service)
 *
 * Handles NATS message patterns for user operations
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoomUserService } from '@server/meet/modules/room/room-user.service';

/**
 * UserHandler - NATS Message Handler for User Operations
 */
@Controller()
export class UserHandler {
  private readonly logger = new Logger(UserHandler.name);

  constructor(private readonly roomUserService: RoomUserService) {}

  @MessagePattern({ cmd: 'user.isUserInBlockList' })
  async isUserInBlockList(
    @Payload() data: { roomId: string; userId: string },
  ): Promise<boolean> {
    try {
      return await this.roomUserService.isUserInBlockList(
        data.roomId,
        data.userId,
      );
    } catch (error) {
      this.logger.error(
        `Error checking block list: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  @MessagePattern({ cmd: 'user.getUserStatus' })
  async getUserStatus(
    @Payload() data: { roomId: string; userId: string },
  ): Promise<string> {
    try {
      return await this.roomUserService.getUserStatus(data.roomId, data.userId);
    } catch (error) {
      this.logger.error(
        `Error getting user status: ${error.message}`,
        error.stack,
      );
      return 'offline';
    }
  }

  @MessagePattern({ cmd: 'user.getOnlineUsersCount' })
  async getOnlineUsersCount(
    @Payload() data: { roomId: string },
  ): Promise<number> {
    try {
      return await this.roomUserService.getOnlineUsersCount(data.roomId);
    } catch (error) {
      this.logger.error(
        `Error getting online users count: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  @MessagePattern({ cmd: 'user.generateJoinToken' })
  async generateJoinToken(@Payload() data: any): Promise<any> {
    try {
      return await this.roomUserService.getWajlcJoinToken(data);
    } catch (error) {
      this.logger.error(
        `Error generating join token: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'user.updateLockSettings' })
  async updateLockSettings(@Payload() data: any): Promise<any> {
    try {
      return await this.roomUserService.updateUserLockSettings(data);
    } catch (error) {
      this.logger.error(
        `Error updating lock settings: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'user.muteUnMuteTrack' })
  async muteUnMuteTrack(@Payload() data: any): Promise<any> {
    try {
      return await this.roomUserService.handleMuteUnMuteTrack(data);
    } catch (error) {
      this.logger.error(
        `Error muting/unmuting track: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'user.removeParticipant' })
  async removeParticipant(@Payload() data: any): Promise<any> {
    try {
      return await this.roomUserService.handleRemoveParticipant(data);
    } catch (error) {
      this.logger.error(
        `Error removing participant: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern({ cmd: 'user.switchPresenter' })
  async switchPresenter(@Payload() data: any): Promise<any> {
    try {
      return await this.roomUserService.handleSwitchPresenter(data);
    } catch (error) {
      this.logger.error(
        `Error switching presenter: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

