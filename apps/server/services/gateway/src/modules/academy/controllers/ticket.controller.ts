import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  PermissionsGuard,
  Permissions,
  successResponse,
  successPaginatedResponse,
  ReqWithRequester,
} from '@server/shared';
import {
  CreateTicketDTO,
  TicketQueryDTO,
  UpdateTicketStatusDTO,
} from '@workspace/schemas';

@Controller('api/tickets')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class TicketController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() dto: CreateTicketDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.ticket.create' },
        { userId: requester.sub, dto, requesterId: requester.sub },
      ),
    );
    return successResponse(result, 'Ticket submitted successfully');
  }

  @Get('me')
  async findMyTickets(
    @Query() query: TicketQueryDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.ticket.findAll' },
        { ...query, userId: requester.sub },
      ),
    );
    return successPaginatedResponse(result);
  }

  @Get()
  @Permissions('ops.support.view')
  async getTickets(
    @Query() query: TicketQueryDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;

    // Learners can only see their own tickets
    if (requester.role === 'learner') {
      query.userId = requester.sub;
    }

    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.ticket.findAll' }, query),
    );
    return successPaginatedResponse(result);
  }

  @Get('stats')
  @Permissions('ops.support.view')
  async getTicketStats() {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.analytics.tickets' }, {}),
    );
    return successResponse(result);
  }

  @Get(':id')
  async getTicket(@Param('id') id: string, @Req() req: ReqWithRequester) {
    const requester = req.requester;
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'academy.ticket.findById' }, { id }),
    );

    // Không có quyền xem mọi ticket: chỉ chủ ticket hoặc admin / role có support.view
    const canViewAll =
      requester.role === 'admin' ||
      requester.permissions?.includes('ops.support.view');
    if (!canViewAll && result.userId !== requester.sub) {
      return successResponse(null, 'Not found or permission denied');
    }

    return successResponse(result);
  }

  @Patch(':id/status')
  @Permissions('ops.support.handle')
  async updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDTO,
    @Req() req: ReqWithRequester,
  ) {
    const requester = req.requester;
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.ticket.updateStatus' },
        { id, handlerId: requester.sub, dto, requesterId: requester.sub },
      ),
    );
    return successResponse(result, 'Ticket status updated successfully');
  }

  @Post(':id/cancel')
  async cancelTicket(@Param('id') id: string, @Req() req: ReqWithRequester) {
    const requester = req.requester;
    // For learners, we only allow cancelling their own tickets
    // This ownership is enforced in the Academy service deleteTicket method
    await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.ticket.delete' },
        { id, userId: requester.sub, requesterId: requester.sub },
      ),
    );
    return successResponse(null, 'Ticket cancelled successfully');
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':id/delete')
  @Permissions('ops.support.handle') // Admins can delete
  async deleteTicket(@Param('id') id: string, @Req() req: ReqWithRequester) {
    const requester = req.requester;
    // For admin deletion, we might need a different service method or pass a flag
    // But for now, let's allow it if they are an admin by bypassing the userId check in future
    await firstValueFrom(
      this.natsClient.send(
        { cmd: 'academy.ticket.delete' },
        { id, userId: undefined, requesterId: requester.sub, isAdmin: true },
      ),
    );
    return successResponse(null, 'Ticket deleted successfully');
  }
}
