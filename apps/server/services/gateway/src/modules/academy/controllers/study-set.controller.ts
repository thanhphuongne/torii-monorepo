import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Inject,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  GatewayAuthGuard,
  Permissions,
  PermissionsGuard,
  Public,
  ReqWithRequester,
  ZodValidationPipe,
  successResponse,
  errorResponse,
} from '@server/shared';
import { firstValueFrom } from 'rxjs';
import {
  CreateStudySetDto,
  UpdateStudySetDto,
  CreateSetCardDto,
  UpdateSetCardDto,
  ReviewSetCardDto,
  ClonePublicStudySetDto,
  ShareStudySetDto,
  createStudySetSchema,
  updateStudySetSchema,
  createSetCardSchema,
  updateSetCardSchema,
  reviewSetCardSchema,
  clonePublicStudySetSchema,
  shareStudySetSchema,
} from '../../../../../academy/src/modules/study-set/study-set.dto';

@Controller('api/academy')
export class StudySetController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  @Get('study-set-catalogs')
  @Public()
  async findPublicCatalogSets(@Req() req: any) {
    try {
      const q = req.query.q as string | undefined;
      const items = await firstValueFrom(
        this.natsClient.send('academy.study-set.findPublicCatalogSets', { q }),
      );
      return successResponse({ items });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Get('study-set-catalogs/admin')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.read')
  async adminFindSystemSets() {
    try {
      const items = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminFindSystemSets', {}),
      );
      return successResponse({ items });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Post('study-set-catalogs/admin')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.create')
  async adminCreateSystemSet(
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(createStudySetSchema))
    createDto: CreateStudySetDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminCreateSystemSet', {
          requesterId: req.requester.sub,
          data: createDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Patch('study-set-catalogs/admin/:id')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.update')
  async adminUpdateSystemSet(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudySetSchema))
    updateDto: UpdateStudySetDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminUpdateSystemSet', {
          id,
          data: updateDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Delete('study-set-catalogs/admin/:id')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.delete')
  async adminDeleteSystemSet(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminDeleteSystemSet', { id }),
      );
      return successResponse({ result });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Get('study-set-catalogs/admin/:id')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.read')
  async adminFindSystemSetById(@Param('id') id: string) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminFindSystemSetById', { id }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Post('study-set-catalogs/admin/:id/cards')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.update')
  async adminCreateCard(
    @Param('id') setId: string,
    @Body(new ZodValidationPipe(createSetCardSchema))
    createDto: CreateSetCardDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminCreateCard', { setId, data: createDto }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Patch('study-set-catalogs/admin/cards/:cardId')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.update')
  async adminUpdateCard(
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(updateSetCardSchema))
    updateDto: UpdateSetCardDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminUpdateCard', { cardId, data: updateDto }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Delete('study-set-catalogs/admin/cards/:cardId')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('lms.catalog.update')
  async adminDeleteCard(@Param('cardId') cardId: string) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('academy.study-set.adminDeleteCard', { cardId }),
      );
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Get('study-set-catalogs/:id')
  @Public()
  async findPublicCatalogSetById(@Param('id') id: string) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.findPublicCatalogSetById', {
          id,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Post('study-set-catalogs/:id/clone')
  @UseGuards(GatewayAuthGuard)
  async clonePublicSetToUser(
    @Param('id') sourceSetId: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(clonePublicStudySetSchema.partial()))
    payload: Partial<ClonePublicStudySetDto>,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.clonePublicSetToUser', {
          userId: req.requester.sub,
          data: {
            sourceSetId,
            title: payload.title,
          },
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  // --- Study Set Endpoints ---

  @Post('study-sets')
  @UseGuards(GatewayAuthGuard)
  async createSet(
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(createStudySetSchema))
    createDto: CreateStudySetDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.createSet', {
          userId: req.requester.sub,
          data: createDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Get('study-sets')
  @UseGuards(GatewayAuthGuard)
  async findAllSets(@Req() req: ReqWithRequester) {
    try {
      const items = await firstValueFrom(
        this.natsClient.send('academy.study-set.findAllSets', {
          userId: req.requester.sub,
        }),
      );
      return successResponse({ items });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Patch('study-sets/:id/share')
  @UseGuards(GatewayAuthGuard)
  async updateSetSharing(
    @Param('id') id: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(shareStudySetSchema))
    shareDto: ShareStudySetDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.updateSharing', {
          id,
          userId: req.requester.sub,
          data: shareDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Get('study-sets/public/:token')
  @Public()
  async findPublicSharedSetByToken(@Param('token') token: string) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.findPublicSharedSetByToken', {
          token,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Get('study-sets/:id')
  @UseGuards(GatewayAuthGuard)
  async findSetById(@Param('id') id: string, @Req() req: ReqWithRequester) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.findSetById', {
          id,
          userId: req.requester.sub,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Patch('study-sets/:id')
  @UseGuards(GatewayAuthGuard)
  async updateSet(
    @Param('id') id: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(updateStudySetSchema))
    updateDto: UpdateStudySetDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.updateSet', {
          id,
          userId: req.requester.sub,
          data: updateDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Delete('study-sets/:id')
  @UseGuards(GatewayAuthGuard)
  async deleteSet(@Param('id') id: string, @Req() req: ReqWithRequester) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('academy.study-set.deleteSet', {
          id,
          userId: req.requester.sub,
        }),
      );
      return successResponse({ result });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  // --- Set Card Endpoints ---

  @Post('study-sets/:id/cards')
  @UseGuards(GatewayAuthGuard)
  async createCard(
    @Param('id') setId: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(createSetCardSchema))
    createDto: CreateSetCardDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.createCard', {
          setId,
          userId: req.requester.sub,
          data: createDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Patch('set-cards/:id')
  @UseGuards(GatewayAuthGuard)
  async updateCard(
    @Param('id') cardId: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(updateSetCardSchema))
    updateDto: UpdateSetCardDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.updateCard', {
          cardId,
          userId: req.requester.sub,
          data: updateDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Delete('set-cards/:id')
  @UseGuards(GatewayAuthGuard)
  async deleteCard(@Param('id') cardId: string, @Req() req: ReqWithRequester) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send('academy.study-set.deleteCard', {
          cardId,
          userId: req.requester.sub,
        }),
      );
      return successResponse({ result });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  // --- Study Flow / SRS Endpoints ---

  @Get('study-sets/:id/study')
  @UseGuards(GatewayAuthGuard)
  async getStudyCards(
    @Param('id') setId: string,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const items = await firstValueFrom(
        this.natsClient.send('academy.study-set.getStudyCards', {
          setId,
          userId: req.requester.sub,
        }),
      );
      return successResponse({ items });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Post('set-cards/:id/review')
  @UseGuards(GatewayAuthGuard)
  async reviewCard(
    @Param('id') cardId: string,
    @Req() req: ReqWithRequester,
    @Body(new ZodValidationPipe(reviewSetCardSchema))
    reviewDto: ReviewSetCardDto,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send('academy.study-set.reviewCard', {
          cardId,
          userId: req.requester.sub,
          data: reviewDto,
        }),
      );
      return successResponse({ item });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  // --- Extra Study Modes Endpoints ---

  @Get('study-sets/:id/study-modes/test')
  @UseGuards(GatewayAuthGuard)
  async getTestQuiz(
    @Param('id') setId: string,
    @Req() req: ReqWithRequester,
    @Req() request: any, // To extract query params easily if we don't import Query
  ) {
    try {
      const count = request.query.count
        ? parseInt(request.query.count, 10)
        : 20;
      const types = request.query.types || 'multiple_choice,true_false';

      const items = await firstValueFrom(
        this.natsClient.send('academy.study-set.getTestQuiz', {
          setId,
          userId: req.requester.sub,
          count,
          types,
        }),
      );
      return successResponse({ items });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }

  @Get('study-sets/:id/study-modes/match')
  @UseGuards(GatewayAuthGuard)
  async getMatchGame(
    @Param('id') setId: string,
    @Req() req: ReqWithRequester,
    @Req() request: any,
  ) {
    try {
      const count = request.query.count ? parseInt(request.query.count, 10) : 6;

      const items = await firstValueFrom(
        this.natsClient.send('academy.study-set.getMatchGame', {
          setId,
          userId: req.requester.sub,
          count,
        }),
      );
      return successResponse({ items });
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }
}
