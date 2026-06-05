import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Inject,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  ReqWithRequester,
  Permissions,
  PermissionsGuard,
  GatewayAuthGuard,
} from '@server/shared';

@Controller('api/gamification')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class GamificationController {
  private readonly logger = new Logger(GamificationController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Get('profile')
  async getProfile(@Req() req: ReqWithRequester) {
    const user = req.requester;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.getProfile', { userId: user.sub }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to get gamification profile for user ${user?.sub}`,
        error.stack,
      );
      return errorResponse(
        error.message || 'Failed to fetch gamification profile',
      );
    }
  }

  @Get('streak')
  async getStreak(@Req() req: ReqWithRequester) {
    const user = req.requester;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.getStreak', { userId: user.sub }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to get streak for user ${user?.sub}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to fetch streak');
    }
  }

  @Post('mark-toast-shown')
  async markToastShown(@Req() req: ReqWithRequester) {
    const user = req.requester;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.markToastShown', {
          userId: user.sub,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to mark toast shown for user ${user?.sub}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to mark toast shown');
    }
  }

  @Post('record-activity')
  async recordActivity(
    @Req() req: ReqWithRequester,
    @Body() body: { activityType: any; meta?: any },
  ) {
    const user = req.requester;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.recordActivity', {
          userId: user.sub,
          activityType: body.activityType,
          meta: body.meta ?? {},
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to record activity for user ${user?.sub}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to record activity');
    }
  }

  @Get('leaderboard')
  async getLeaderboard(@Req() req: ReqWithRequester) {
    const user = req.requester;
    const { type } = req.query as any;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.getLeaderboard', {
          userId: user.sub,
          type,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to get leaderboard`, error.stack);
      return errorResponse(error.message || 'Failed to fetch leaderboard');
    }
  }

  @Get('history')
  async getHistory(@Req() req: ReqWithRequester) {
    const user = req.requester;
    const query = req.query;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.getHistory', {
          userId: user.sub,
          ...query,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to get gamification history for user ${user?.sub}`,
        error.stack,
      );
      return errorResponse(
        error.message || 'Failed to fetch gamification history',
      );
    }
  }

  @Get('rewards')
  async getAvailableRewards(@Req() req: ReqWithRequester) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.getAvailableRewards', {}),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to get available rewards`, error.stack);
      return errorResponse(error.message || 'Failed to fetch rewards');
    }
  }

  @Post('redeem')
  async redeemPoints(
    @Req() req: ReqWithRequester,
    @Body() body: { rewardId: string },
  ) {
    const user = req.requester;
    const { rewardId } = body;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.redeemPoints', {
          userId: user.sub,
          dealId: rewardId,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to redeem points for user ${user?.sub}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to redeem points');
    }
  }

  @Get('achievements')
  async getAchievements(@Req() req: ReqWithRequester) {
    const user = req.requester;
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.getAchievements', {
          userId: user.sub,
        }),
      );
      return successResponse({ achievements: result });
    } catch (error: any) {
      this.logger.error(
        `Failed to get achievements for user ${user?.sub}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to fetch achievements');
    }
  }

  // --- Admin CRUD ---

  @Get('admin/rewards')
  @Permissions('ops.gamification.manage')
  async admin_getAllRewards() {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.getAllRewards', {}),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to get all rewards for admin`, error.stack);
      return errorResponse(error.message || 'Failed to fetch rewards');
    }
  }

  @Post('admin/rewards')
  @Permissions('ops.gamification.manage')
  async admin_createReward(@Body() body: any, @Req() req: ReqWithRequester) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.createReward', {
          ...body,
          requesterId: req.requester?.sub,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to create reward`, error.stack);
      return errorResponse(error.message || 'Failed to create reward');
    }
  }

  @Patch('admin/rewards/:id')
  @Permissions('ops.gamification.manage')
  async admin_updateReward(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.updateReward', {
          id,
          data: body,
          requesterId: req.requester?.sub,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to update reward ${id}`, error.stack);
      return errorResponse(error.message || 'Failed to update reward');
    }
  }

  @Delete('admin/rewards/:id')
  @Permissions('ops.gamification.manage')
  async admin_deleteReward(
    @Param('id') id: string,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.deleteReward', {
          id,
          requesterId: req.requester?.sub,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to delete reward ${id}`, error.stack);
      return errorResponse(error.message || 'Failed to delete reward');
    }
  }

  // --- Admin Achievement CRUD ---

  @Get('admin/achievements')
  @Permissions('ops.gamification.manage')
  async admin_getAllAchievements() {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.getAllAchievements', {}),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to get all achievements for admin`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to fetch achievements');
    }
  }

  @Post('admin/achievements')
  @Permissions('ops.gamification.manage')
  async admin_createAchievement(
    @Body() body: any,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.createAchievement', {
          ...body,
          requesterId: req.requester?.sub,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to create achievement`, error.stack);
      return errorResponse(error.message || 'Failed to create achievement');
    }
  }

  @Patch('admin/achievements/:id')
  @Permissions('ops.gamification.manage')
  async admin_updateAchievement(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.updateAchievement', {
          id,
          data: body,
          requesterId: req.requester?.sub,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to update achievement ${id}`, error.stack);
      return errorResponse(error.message || 'Failed to update achievement');
    }
  }

  @Delete('admin/achievements/:id')
  @Permissions('ops.gamification.manage')
  async admin_deleteAchievement(
    @Param('id') id: string,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('gamification.admin.deleteAchievement', {
          id,
          requesterId: req.requester?.sub,
        }),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to delete achievement ${id}`, error.stack);
      return errorResponse(error.message || 'Failed to delete achievement');
    }
  }
}
