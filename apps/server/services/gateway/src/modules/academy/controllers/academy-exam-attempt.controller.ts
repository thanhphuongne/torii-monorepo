import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  PermissionsGuard,
  ZodValidationPipe,
  successResponse,
  ReqWithRequester,
} from '@server/shared';
import {
  AcademyExamAttemptStartDTO,
  academyExamAttemptStartDTOSchema,
  AcademyExamAttemptSaveAnswersDTO,
  academyExamAttemptSaveAnswersDTOSchema,
  AcademyExamAttemptSubmitDTO,
  academyExamAttemptSubmitDTOSchema,
  AcademyExamAttemptQueryDTO,
  academyExamAttemptQueryDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy/exam-attempts')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class AcademyExamAttemptController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async start(
    @Body(new ZodValidationPipe(academyExamAttemptStartDTOSchema))
    dto: AcademyExamAttemptStartDTO,
    @Req() req: ReqWithRequester,
  ) {
    const item = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.examAttempt.start' },
        { ...dto, userId: req.requester?.sub },
      ),
    );
    return successResponse({ item });
  }

  @Post('save-draft')
  async saveDraft(
    @Body(new ZodValidationPipe(academyExamAttemptSaveAnswersDTOSchema))
    dto: AcademyExamAttemptSaveAnswersDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.examAttempt.saveDraft' }, dto),
    );
    return successResponse({ item });
  }

  @Post('submit')
  async submit(
    @Body(new ZodValidationPipe(academyExamAttemptSubmitDTOSchema))
    dto: AcademyExamAttemptSubmitDTO,
  ) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.examAttempt.submit' }, dto),
    );
    return successResponse({ item });
  }

  @Get()
  async findMany(
    @Query(new ZodValidationPipe(academyExamAttemptQueryDTOSchema))
    query: AcademyExamAttemptQueryDTO,
    @Req() req: ReqWithRequester,
  ) {
    const items = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.examAttempt.findAll' },
        { ...query, userId: query.userId || req.requester?.sub },
      ),
    );
    return successResponse({ items });
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const item = await firstValueFrom(
      this.nats.send({ cmd: 'academy.examAttempt.findById' }, { id }),
    );
    return successResponse({ item });
  }
}
