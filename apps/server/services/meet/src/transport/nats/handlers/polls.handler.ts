/**
 * Polls NATS Handler (Meet Service)
 *
 * Handles NATS message patterns for poll operations
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PollsService } from '@server/meet/modules/polls/polls.service';
import type {
  ActivatePollsReq,
  CreatePollReq,
  SubmitPollResponseReq,
  ClosePollReq,
} from '@workspace/protocol';

@Controller()
export class PollsHandler {
  private readonly logger = new Logger(PollsHandler.name);

  constructor(private readonly pollsService: PollsService) {}

  @MessagePattern({ cmd: 'polls.activate' })
  async handleActivatePolls(@Payload() data: ActivatePollsReq) {
    try {
      await this.pollsService.manageActivation(data);
      return {
        status: true,
        msg: 'success',
      };
    } catch (error) {
      this.logger.error(`Error activating polls: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.create' })
  async handleCreatePoll(@Payload() data: CreatePollReq) {
    try {
      const pollId = await this.pollsService.createPoll(data);
      return {
        status: true,
        msg: 'success',
        pollId,
      };
    } catch (error) {
      this.logger.error(`Error creating poll: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.listPolls' })
  async handleListPolls(@Payload() data: { roomId: string }) {
    try {
      const polls = await this.pollsService.listPolls(data.roomId);
      return {
        status: true,
        msg: 'success',
        polls,
      };
    } catch (error) {
      this.logger.error(`Error listing polls: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.countTotalResponses' })
  async handleCountPollTotalResponses(
    @Payload() data: { roomId: string; pollId: string },
  ) {
    try {
      const responses = await this.pollsService.getPollTotalResponses(
        data.roomId,
        data.pollId,
      );
      return {
        status: true,
        msg: 'success',
        pollId: data.pollId,
        totalResponses: responses,
      };
    } catch (error) {
      this.logger.error(`Error getting total responses: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.userSelectedOption' })
  async handleUserSelectedOption(
    @Payload() data: { roomId: string; pollId: string; userId: string },
  ) {
    try {
      const voted = await this.pollsService.userSelectedOption(
        data.roomId,
        data.pollId,
        data.userId,
      );
      return {
        status: true,
        msg: 'success',
        pollId: data.pollId,
        voted: voted.toString(),
      };
    } catch (error) {
      this.logger.error(`Error getting user selected option: ${error.message}`);
      return {
        status: true,
        msg: 'success',
        pollId: data.pollId,
        voted: '0',
      };
    }
  }

  @MessagePattern({ cmd: 'polls.submitResponse' })
  async handleUserSubmitResponse(@Payload() data: SubmitPollResponseReq) {
    try {
      await this.pollsService.userSubmitResponse(data);
      return {
        status: true,
        msg: 'success',
        pollId: data.pollId,
      };
    } catch (error) {
      this.logger.error(`Error submitting response: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.closePoll' })
  async handleClosePoll(@Payload() data: ClosePollReq) {
    try {
      await this.pollsService.closePoll(data);
      return {
        status: true,
        msg: 'success',
        pollId: data.pollId,
      };
    } catch (error) {
      this.logger.error(`Error closing poll: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.pollResponsesDetails' })
  async handleGetPollResponsesDetails(
    @Payload() data: { roomId: string; pollId: string },
  ) {
    try {
      const responses = await this.pollsService.getPollResponsesDetails(
        data.roomId,
        data.pollId,
      );
      return {
        status: true,
        msg: 'success',
        pollId: data.pollId,
        responses,
      };
    } catch (error) {
      this.logger.error(
        `Error getting poll responses details: ${error.message}`,
      );
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.pollResponsesResult' })
  async handleGetResponsesResult(
    @Payload() data: { roomId: string; pollId: string },
  ) {
    try {
      const result = await this.pollsService.getResponsesResult(
        data.roomId,
        data.pollId,
      );
      return {
        status: true,
        msg: 'success',
        pollId: data.pollId,
        pollResponsesResult: result,
      };
    } catch (error) {
      this.logger.error(
        `Error getting poll responses result: ${error.message}`,
      );
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  @MessagePattern({ cmd: 'polls.pollsStats' })
  async handleGetPollsStats(@Payload() data: { roomId: string }) {
    try {
      const stats = await this.pollsService.getPollsStats(data.roomId);
      return {
        status: true,
        msg: 'success',
        stats,
      };
    } catch (error) {
      this.logger.error(`Error getting polls stats: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }
}

