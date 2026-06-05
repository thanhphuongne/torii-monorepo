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
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices/client';
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
  academyCourseReviewCreateDTOSchema,
  academyCourseReviewUpdateDTOSchema,
  academyCourseReviewQueryDTOSchema,
  academyCourseReviewAdminQueryDTOSchema,
  academyCourseReviewModerateDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/reviews')
@UseGuards(GatewayAuthGuard)
export class CourseReviewController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  // ── Public routes ──────────────────────────────────────────────────────────

  @Get('live-classes/:liveClassId')
  async listByLiveClass(
    @Param('liveClassId', new ParseUUIDPipe()) liveClassId: string,
    @Query(new ZodValidationPipe(academyCourseReviewQueryDTOSchema)) query: any,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseReview.listByLiveClass' },
        { liveClassId, query },
      ),
    );
    return successResponse(result);
  }

  @Get('vod-packages/:vodPackageId')
  async listByVodPackage(
    @Param('vodPackageId', new ParseUUIDPipe()) vodPackageId: string,
    @Query(new ZodValidationPipe(academyCourseReviewQueryDTOSchema)) query: any,
  ) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseReview.listByVodPackage' },
        { vodPackageId, query },
      ),
    );
    return successResponse(result);
  }

  @Get('me')
  async listMine(@Req() req: ReqWithRequester) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseReview.listMine' }, { userId }),
    );
    return successResponse(result);
  }

  // ── Learner write routes ───────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(academyCourseReviewCreateDTOSchema)) dto: any,
    @Req() req: ReqWithRequester,
  ) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseReview.create' }, { userId, dto }),
    );
    return successResponse(result);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyCourseReviewUpdateDTOSchema)) dto: any,
    @Req() req: ReqWithRequester,
  ) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseReview.update' },
        { id, userId, dto },
      ),
    );
    return successResponse(result);
  }

  @Delete(':id')
  async hide(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseReview.hide' }, { id, userId }),
    );
    return successResponse(result);
  }

  /**
   * Some environments/proxies can be picky about DELETE requests.
   * Provide a POST alias for the same "hide" operation.
   */
  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  async hideViaPost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseReview.hide' }, { id, userId }),
    );
    return successResponse(result);
  }

  @Delete(':id/hard')
  async hardDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseReview.delete' }, { id, userId }),
    );
    return successResponse(result);
  }

  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  async hardDeleteViaPost(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const userId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseReview.delete' }, { id, userId }),
    );
    return successResponse(result);
  }

  // ── Admin routes ───────────────────────────────────────────────────────────

  @Get('admin')
  @UseGuards(PermissionsGuard)
  @Permissions('lms.delivery.update')
  async adminList(
    @Query(new ZodValidationPipe(academyCourseReviewAdminQueryDTOSchema))
    query: any,
  ) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.courseReview.adminList' }, query),
    );
    return successResponse(result);
  }

  @Post('admin/:id/moderate')
  @UseGuards(PermissionsGuard)
  @Permissions('lms.delivery.update')
  @HttpCode(HttpStatus.OK)
  async moderate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(academyCourseReviewModerateDTOSchema)) dto: any,
    @Req() req: ReqWithRequester,
  ) {
    const moderatorId = req.requester.sub;
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.courseReview.moderate' },
        { id, moderatorId, dto },
      ),
    );
    return successResponse(result);
  }
}
