import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Inject,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ZodValidationPipe,
  successResponse,
  errorResponse,
  successPaginatedResponse,
  GatewayAuthGuard,
  ReqWithRequester,
} from '@server/shared';
import {
  NotificationQueryDTO,
  notificationQueryDTOSchema,
  NotificationCreateDTO,
  notificationCreateDTOSchema,
} from '@workspace/schemas';

@Controller('api/notifications')
@UseGuards(GatewayAuthGuard)
export class NotificationController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Get()
  @UsePipes(new ZodValidationPipe(notificationQueryDTOSchema)) // Optional: if query validation is needed here
  async findAll(
    @Req() req: ReqWithRequester,
    @Query() query: NotificationQueryDTO,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.notification.findAll' },
          { query, requester: req.requester },
        ),
      );
      // The service returns PaginatedResponseDTO. existing users controller behaves as if this needs wrapping.
      // But verify if successPaginatedResponse is compatible with what service returns.
      // If service returns { data: [], meta: {} }, successPaginatedResponse({ data: [], meta: {} }) -> { success: true, data: { data: [], meta: {} } }
      // This matches strict frontend expectation of response.data.success.
      return successPaginatedResponse(result);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to fetch notifications');
    }
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: ReqWithRequester) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.notification.getUnreadCount' },
          { requester: req.requester },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to get unread count');
    }
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.notification.markAsRead' },
          { notificationId, requester: req.requester },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(
        error?.message || 'Failed to mark notification as read',
      );
    }
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: ReqWithRequester) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.notification.markAllAsRead' },
          { requester: req.requester },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to mark all as read');
    }
  }

  @Delete(':id')
  async delete(
    @Param('id') notificationId: string,
    @Req() req: ReqWithRequester,
  ) {
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.notification.delete' },
          { notificationId, requester: req.requester },
        ),
      );
      return successResponse(null, 'Notification deleted successfully');
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to delete notification');
    }
  }

  @Post('register-token')
  async registerToken(
    @Req() req: ReqWithRequester,
    @Body() body: { token: string; platform?: string; deviceName?: string },
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.notification.registerToken' },
          { ...body, requester: req.requester },
        ),
      );
      return successResponse(result, 'Device token registered successfully');
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to register device token');
    }
  }

  @Post()
  @UsePipes(new ZodValidationPipe(notificationCreateDTOSchema))
  async create(@Body() payload: NotificationCreateDTO) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'identity.notification.create' }, payload),
      );
      return successResponse(result, 'Notification created successfully');
    } catch (error: any) {
      return errorResponse(error?.message || 'Failed to create notification');
    }
  }
}
