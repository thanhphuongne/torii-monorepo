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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  Permissions,
  PermissionsGuard,
  ZodValidationPipe,
  successResponse,
  ReqWithRequester,
} from '@server/shared';
import {
  AcademyCourseProfileCreateDTO,
  academyCourseProfileCreateDTOSchema,
  AcademyCourseProfileDuplicateDTO,
  academyCourseProfileDuplicateDTOSchema,
  AcademyCourseProfileQueryDTO,
  academyCourseProfileQueryDTOSchema,
  AcademyCourseProfileUpdateDTO,
  academyCourseProfileUpdateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/course-profiles')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class CourseProfileController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  @Get()
  @Permissions('lms.catalog.read')
  async findAll(
    @Query(new ZodValidationPipe(academyCourseProfileQueryDTOSchema))
    query: AcademyCourseProfileQueryDTO,
  ) {
    const items = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseProfile.findAll' }, query),
    );
    return successResponse({ items });
  }

  @Get(':id')
  @Permissions('lms.catalog.read')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseProfile.findById' }, { id }),
    );
    return successResponse({ item });
  }

  @Post()
  @Permissions('lms.catalog.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyCourseProfileCreateDTOSchema))
    dto: AcademyCourseProfileCreateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.create' },
        { ...dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Put(':id')
  @Permissions('lms.catalog.update')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyCourseProfileUpdateDTOSchema))
    dto: AcademyCourseProfileUpdateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.update' },
        { id, input: dto, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/submit-for-approval')
  @Permissions('lms.catalog.submit')
  async submitForApproval(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.submitForApproval' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/approve')
  @Permissions('lms.catalog.approve')
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.approve' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/reject')
  @Permissions('lms.catalog.approve')
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason: string },
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.reject' },
        { id, reason: body.reason, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/duplicate')
  @Permissions('lms.catalog.update')
  async duplicate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyCourseProfileDuplicateDTOSchema))
    dto: AcademyCourseProfileDuplicateDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.duplicate' },
        {
          id,
          newCode: dto.newCode,
          newTitle: dto.newTitle,
          requesterId: req.requester?.sub,
        },
      ),
    );
    return successResponse({ item });
  }

  @Post(':id/archive')
  @Permissions('lms.catalog.update')
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.archive' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Delete(':id')
  @Permissions('lms.catalog.update')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseProfile.delete' },
        { id, requesterId: req.requester?.sub },
      ),
    );
    return successResponse(result);
  }
}
