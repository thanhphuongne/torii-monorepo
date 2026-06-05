import {
  Controller,
  Post,
  Body,
  Inject,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  ReqWithRequester,
  GatewayAuthGuard,
} from '@server/shared';
import {
  onboardingSurveyDTOSchema,
  OnboardingSurveyDTO,
} from '@workspace/schemas';

@Controller('api/onboarding')
@UseGuards(GatewayAuthGuard)
export class OnboardingController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('survey')
  async saveSurvey(
    @Req() req: ReqWithRequester,
    @Body() dto: OnboardingSurveyDTO,
  ) {
    try {
      // Validate with zod
      const dtoValidated = onboardingSurveyDTOSchema.parse(dto);

      const response = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'identity.users.saveOnboardingSurvey' },
          { userId: req.requester.sub, dto: dtoValidated },
        ),
      );

      return successResponse(response);
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error.message : 'Failed to save survey',
      );
    }
  }
}
