/**
 * Insights Controller (Gateway)
 *
 * Handles AI-related features like transcription, translation, and meeting summarization
 */

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response, Request } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  InsightsTranscriptionConfigReqSchema,
  InsightsTranscriptionUserSessionReqSchema,
  InsightsGetSupportedLanguagesReqSchema,
  InsightsGetSupportedLanguagesResSchema,
  InsightsChatTranslationConfigReqSchema,
  InsightsTranslateTextReqSchema,
  InsightsTranslateTextResSchema,
  InsightsAITextChatConfigReqSchema,
  InsightsAITextChatContentSchema,
  InsightsAIMeetingSummarizationConfigReqSchema,
} from '@workspace/protocol';
import {
  sendCommonProtobufResponse,
  sendProtobufResponse,
  JwtAuthGuard,
} from '@server/shared';
import { fromBinary } from '@bufbuild/protobuf';

@Controller('api/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('supportedLangs')
  async handleGetSupportedLangs(
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    try {
      const request = fromBinary(
        InsightsGetSupportedLanguagesReqSchema,
        bodyBuffer,
      );
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'insights.getSupportedLangs' }, request),
      );
      sendProtobufResponse(res, InsightsGetSupportedLanguagesResSchema, result);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('transcription/configure')
  async handleTranscriptionConfigure(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const request = fromBinary(
        InsightsTranscriptionConfigReqSchema,
        bodyBuffer,
      );
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.transcription.configure' },
          { ...request, roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('transcription/end')
  async handleEndTranscription(@Req() req: Request, @Res() res: Response) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.transcription.end' },
          { roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('transcription/userSession')
  async handleTranscriptionUserSession(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    try {
      const request = fromBinary(
        InsightsTranscriptionUserSessionReqSchema,
        bodyBuffer,
      );
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.transcription.userSession' },
          {
            ...request,
            roomId: (req as any).roomId,
            userId: (req as any).requestedUserId,
          },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('transcription/userStatus')
  async handleGetTranscriptionUserTaskStatus(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.transcription.getUserStatus' },
          {
            roomId: (req as any).roomId,
            userId: (req as any).requestedUserId,
            serviceType: 'transcription',
          },
        ),
      );
      res.set('Content-Type', 'application/protobuf');
      res.send(Buffer.from(result));
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('translation/chat/configure')
  async handleChatTranslationConfigure(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const request = fromBinary(
        InsightsChatTranslationConfigReqSchema,
        bodyBuffer,
      );
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.translation.chat.configure' },
          { ...request, roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('translation/chat/execute')
  async handleExecuteChatTranslation(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    try {
      const request = fromBinary(InsightsTranslateTextReqSchema, bodyBuffer);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.translation.chat.execute' },
          {
            ...request,
            roomId: (req as any).roomId,
            userId: (req as any).requestedUserId,
          },
        ),
      );
      sendProtobufResponse(res, InsightsTranslateTextResSchema, result);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('translation/chat/end')
  async handleEndChatTranslation(@Req() req: Request, @Res() res: Response) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.translation.chat.end' },
          { roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('ai/textChat/configure')
  async handleAITextChatConfigure(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const request = fromBinary(InsightsAITextChatConfigReqSchema, bodyBuffer);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.ai.textChat.configure' },
          { ...request, roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('ai/textChat/execute')
  async handleExecuteAITextChat(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    try {
      const request = fromBinary(InsightsAITextChatContentSchema, bodyBuffer);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.ai.textChat.execute' },
          {
            ...request,
            roomId: (req as any).roomId,
            userId: (req as any).requestedUserId,
          },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('ai/textChat/end')
  async handleEndAITextChat(@Req() req: Request, @Res() res: Response) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.ai.textChat.end' },
          { roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('ai/meetingSummarization/configure')
  async handleAIMeetingSummarizationConfig(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const request = fromBinary(
        InsightsAIMeetingSummarizationConfigReqSchema,
        bodyBuffer,
      );
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.ai.meetingSummarization.configure' },
          { ...request, roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('ai/meetingSummarization/end')
  async handleEndAIMeetingSummarization(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'insights.ai.meetingSummarization.end' },
          { roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }
}
