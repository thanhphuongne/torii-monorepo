import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  Public,
  GatewayAuthGuard,
  Permissions,
  PermissionsGuard,
  ZodValidationPipe,
  successResponse,
  successPaginatedResponse,
  ReqWithRequester,
} from '@server/shared';
import {
  AcademyCohortCreateDTO,
  AcademyCohortQueryDTO,
  AcademyCohortUpdateDTO,
  academyCohortCreateDTOSchema,
  academyCohortQueryDTOSchema,
  academyCohortUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/cohorts')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class CohortController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) { }

  @Public()
  @Get('public')
  async findAllPublic(
    @Query(new ZodValidationPipe(academyCohortQueryDTOSchema))
    query: AcademyCohortQueryDTO,
  ) {
    const items = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.cohort.findAll' },
        { ...query, status: 'OPENING', onlyAvailable: true },
      ),
    );
    return successResponse(items);
  }

  @Public()
  @Get('public/:id')
  async findByIdPublic(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.cohort.findByIdPublic' }, { id }),
    );
    return successResponse({ item });
  }

  @Get()
  @Permissions('lms.commerce.read')
  async findAll(
    @Query(new ZodValidationPipe(academyCohortQueryDTOSchema))
    query: AcademyCohortQueryDTO,
  ) {
    const items = await firstValueFrom(
      this.nats.send({ cmd: 'academy.cohort.findAll' }, query),
    );
    return successResponse(items);
  }

  @Get(':id')
  @Permissions('lms.commerce.read')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.cohort.findById' }, { id }),
    );
    return successResponse(item);
  }

  @Post()
  @Permissions('lms.commerce.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyCohortCreateDTOSchema))
    dto: AcademyCohortCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.cohort.create' },
        { ...dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(item);
  }

  @Post(':id/submit-for-approval')
  @Permissions('lms.commerce.submit')
  async submitForApproval(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.cohort.update' },
        {
          id,
          input: { status: 'PENDING_APPROVAL' },
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse(item);
  }

  @Put(':id')
  @Permissions('lms.commerce.update')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyCohortUpdateDTOSchema))
    dto: AcademyCohortUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.cohort.update' },
        { id, input: dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(item);
  }

  @Delete(':id')
  @Permissions('lms.commerce.delete')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.cohort.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }

  @Get(':id/orders')
  @Permissions('lms.commerce.read')
  async findOrders(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: any,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.admin.findByCohort' },
        { cohortId: id, query },
      ),
    );
    return successPaginatedResponse(result);
  }

  @Get(':id/stats')
  @Permissions('lms.commerce.read')
  async getStats(@Param('id', new ParseUUIDPipe()) id: string) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.order.admin.getStatsByCohort' },
        { cohortId: id },
      ),
    );
    return successResponse(result);
  }

  @Post(':id/approve')
  @Permissions('lms.commerce.approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.cohort.update' },
        {
          id,
          input: { status: 'OPENING' },
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse(item);
  }

  @Post(':id/reject')
  @Permissions('lms.commerce.approve')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason: string },
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.cohort.update' },
        {
          id,
          input: { status: 'DRAFT', rejectionReason: body.reason },
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse(item);
  }
}
