import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BreakoutService } from '@server/meet/modules/breakout/breakout.service';
import {
  CreateBreakoutRoomsReq,
  JoinBreakoutRoomReq,
  EndBreakoutRoomReq,
  IncreaseBreakoutRoomDurationReq,
  BroadcastBreakoutRoomMsgReq,
} from '@workspace/protocol';

@Controller()
export class BreakoutNatsController {
  private readonly logger = new Logger(BreakoutNatsController.name);

  constructor(private readonly breakoutService: BreakoutService) {}

  @MessagePattern({ cmd: 'breakout.create' })
  async createBreakoutRooms(@Payload() data: CreateBreakoutRoomsReq) {
    try {
      await this.breakoutService.createBreakoutRooms(data);
      return {
        status: true,
        msg: 'success',
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }

  @MessagePattern({ cmd: 'breakout.join' })
  async joinBreakoutRoom(@Payload() data: JoinBreakoutRoomReq) {
    try {
      const token = await this.breakoutService.joinBreakoutRoom(data);
      return {
        status: true,
        msg: 'success',
        token: token,
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }

  @MessagePattern({ cmd: 'breakout.end' })
  async endBreakoutRoom(@Payload() data: EndBreakoutRoomReq) {
    try {
      await this.breakoutService.endBreakoutRoom(data);
      return {
        status: true,
        msg: 'success',
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }

  @MessagePattern({ cmd: 'breakout.get' })
  async getBreakoutRooms(@Payload() roomId: any) {
    try {
      const rId =
        typeof roomId === 'object' && roomId?.roomId ? roomId.roomId : roomId;
      const rooms = await this.breakoutService.getBreakoutRoomsInfo(rId);
      return {
        status: true,
        msg: 'success',
        rooms: rooms,
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }

  @MessagePattern({ cmd: 'breakout.increaseDuration' })
  async increaseDuration(@Payload() data: IncreaseBreakoutRoomDurationReq) {
    try {
      await this.breakoutService.increaseBreakoutRoomDuration(data);
      return {
        status: true,
        msg: 'success',
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }

  @MessagePattern({ cmd: 'breakout.broadcast' })
  async broadcastMsg(@Payload() data: BroadcastBreakoutRoomMsgReq) {
    try {
      await this.breakoutService.broadcastBreakoutRoomMsg(data);
      return {
        status: true,
        msg: 'success',
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }

  @MessagePattern({ cmd: 'breakout.my' })
  async getMyBreakoutRoom(@Payload() data: { roomId: string; userId: string }) {
    try {
      const result = await this.breakoutService.getMyBreakoutRoom(
        data.roomId,
        data.userId,
      );
      return {
        status: true,
        msg: 'success',
        room: result,
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }

  @MessagePattern({ cmd: 'breakout.endAll' })
  async endAllBreakoutRooms(@Payload() roomId: any) {
    try {
      const rId =
        typeof roomId === 'object' && roomId?.roomId ? roomId.roomId : roomId;
      await this.breakoutService.endAllBreakoutRooms(rId);
      return {
        status: true,
        msg: 'success',
      };
    } catch (e) {
      this.logger.error(e);
      return {
        status: false,
        msg: e.message,
      };
    }
  }
}

