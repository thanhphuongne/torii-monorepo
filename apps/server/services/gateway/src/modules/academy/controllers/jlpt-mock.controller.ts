import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  GatewayAuthGuard,
  ReqWithRequester,
  successResponse,
  errorResponse,
} from '@server/shared';
import { firstValueFrom } from 'rxjs';

@UseGuards(GatewayAuthGuard)
@Controller('api/academy/jlpt-mock')
export class JlptMockController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Get('templates')
  async findTemplates(@Req() req: ReqWithRequester, @Query() query: any) {
    try {
      const items = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.findAll' },
          {
            level: query.levelCode,
            status: 'PUBLISHED',
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ items });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('templates/:id')
  async findTemplateById(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.findById' },
          { id, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('attempts/start')
  async startAttempt(@Req() req: ReqWithRequester, @Body() body: any) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.attempt.start' },
          {
            templateId: body.templateId,
            userId: req.requester.sub,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('attempts/save-answers')
  async saveAnswers(@Req() req: ReqWithRequester, @Body() body: any) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.attempt.saveAnswers' },
          {
            attemptId: body.attemptId,
            answers: body.answers,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('attempts/next-section')
  async nextSection(@Req() req: ReqWithRequester, @Body() body: any) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.attempt.nextSection' },
          {
            attemptId: body.attemptId,
            currentSectionOrder: body.currentSectionOrder,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('attempts/history')
  async findAttemptHistory(@Req() req: ReqWithRequester) {
    try {
      const items = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.attempt.findHistory' },
          {
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ items });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('attempts/:id/answers')
  async getAttemptAnswers(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const items = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.attempt.answers' },
          {
            attemptId: id,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ items });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('attempts/submit')
  async submitAttempt(@Req() req: ReqWithRequester, @Body() body: any) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.attempt.submit' },
          {
            attemptId: body.attemptId,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('attempts/:id')
  async getAttemptResult(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.attempt.result' },
          {
            attemptId: id,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  // --- Admin Endpoints ---

  @Get('admin/config/levels')
  async adminListLevels(@Req() req: ReqWithRequester) {
    try {
      const items = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.config.level.list' },
          { requesterId: req.requester.sub },
        ),
      );
      return successResponse({ items });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/config/levels')
  async adminEnsureLevelConfig(
    @Req() req: ReqWithRequester,
    @Body() body: any,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.config.level.ensure' },
          { ...body, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('admin/config/active-scoring-profile')
  async adminGetActiveScoringProfile(
    @Req() req: ReqWithRequester,
    @Query() query: { level: string },
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.config.scoringProfile.active' },
          { level: query.level, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/config/scoring-profiles')
  async adminCreateScoringProfile(
    @Req() req: ReqWithRequester,
    @Body() body: any,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.config.scoringProfile.create' },
          { ...body, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('admin/config/levels/:level/sections')
  async adminListSectionsForLevel(
    @Req() req: ReqWithRequester,
    @Param('level') level: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.config.level.sections.list' },
          { level, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/config/scoring-mappings')
  async adminUpsertScoringMappings(
    @Req() req: ReqWithRequester,
    @Body() body: any,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.config.scoringMapping.upsert' },
          { ...body, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('admin/config/scoring-mappings')
  async adminListScoringMappings(
    @Req() req: ReqWithRequester,
    @Query('profileId') profileId: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.config.scoringMapping.list' },
          { profileId, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('admin/templates')
  async adminFindAllTemplates(
    @Req() req: ReqWithRequester,
    @Query() query: any,
  ) {
    try {
      const items = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.findAll' },
          { ...query, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ items });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('admin/templates/:id')
  async adminFindTemplateById(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.findById' },
          { id, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/templates')
  async adminCreateTemplate(@Req() req: ReqWithRequester, @Body() body: any) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.create' },
          { ...body, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Patch('admin/templates/:id')
  async adminUpdateTemplate(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.update' },
          { id, input: body, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Delete('admin/templates/:id')
  async adminDeleteTemplate(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.delete' },
          { id, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/templates/:id/attach-questions')
  async adminAttachQuestions(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.attachQuestions' },
          { templateId: id, items: body.items, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Delete('admin/templates/questions/:id')
  async adminDeleteTemplateQuestion(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.deleteQuestion' },
          { id, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/templates/:id/assemble-random')
  async adminAssembleTemplateFromBank(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() body: { perMondaiCount?: number; clearExisting?: boolean },
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.template.assembleFromBank' },
          {
            templateId: id,
            perMondaiCount: body.perMondaiCount,
            clearExisting: body.clearExisting,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('admin/bank-questions')
  async adminFindBankQuestions(
    @Req() req: ReqWithRequester,
    @Query() query: any,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.bankQuestion.findAll' },
          { ...query, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  /** Mondai theo cấp độ + phần thi (dùng cho bộ lọc ngân hàng câu). */
  @Get('admin/bank-questions/mondai-options')
  async adminBankMondaiOptions(
    @Req() req: ReqWithRequester,
    @Query() query: { level?: string; sectionCode?: string },
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.bankQuestion.mondaiList' },
          {
            level: query.level,
            sectionCode: query.sectionCode,
            requesterId: req.requester.sub,
          },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Get('admin/bank-questions/:id')
  async adminFindBankQuestionById(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.bankQuestion.findById' },
          { id, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/bank-questions')
  async adminCreateBankQuestion(
    @Req() req: ReqWithRequester,
    @Body() body: any,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.bankQuestion.create' },
          { ...body, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Patch('admin/bank-questions/:id')
  async adminUpdateBankQuestion(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.bankQuestion.update' },
          { id, input: body, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Delete('admin/bank-questions/:id')
  async adminDeleteBankQuestion(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.bankQuestion.delete' },
          { id, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Post('admin/mondai')
  async adminCreateMondai(@Req() req: ReqWithRequester, @Body() body: any) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.mondai.create' },
          { ...body, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Patch('admin/mondai/:id')
  async adminUpdateMondai(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    try {
      const item = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.mondai.update' },
          { id, input: body, requesterId: req.requester.sub },
        ),
      );
      return successResponse({ item });
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }

  @Delete('admin/mondai/:id')
  async adminDeleteMondai(
    @Req() req: ReqWithRequester,
    @Param('id') id: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.jlptMock.mondai.delete' },
          { id, requesterId: req.requester.sub },
        ),
      );
      return successResponse(result);
    } catch (e: any) {
      return errorResponse(e.message);
    }
  }
}
