import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Inject,
  Req,
  Param,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  GatewayAuthGuard,
  ReqWithRequester,
} from '@server/shared';

@Controller('api/storage')
@UseGuards(GatewayAuthGuard)
export class StorageController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('upload-url')
  async generatePresignedUploadUrl(
    @Body() data: any,
    @Req() req: ReqWithRequester,
  ) {
    try {
      const requester = req.requester;
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.storage.generatePresignedUploadUrl' },
          { ...data, ownerId: requester.sub },
        ),
      );
      // Result from NATS is plain DTO, wrap it in StandardApiResponse
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error.message || 'Failed to generate upload URL');
    }
  }

  @Post('confirm-upload')
  async confirmUpload(@Body() data: any) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'academy.storage.confirmUpload' }, data),
      );
      // Result from NATS is plain DTO, wrap it in StandardApiResponse
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error.message || 'Failed to confirm upload');
    }
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.storage.deleteFile' },
          { fileId: id },
        ),
      );
      // Result from NATS is plain DTO, wrap it in StandardApiResponse
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error.message || 'Failed to delete file');
    }
  }

  @Get('signed-url')
  async getSignedUrl(@Query() data: any) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'academy.storage.getSignedUrl' }, data),
      );
      // Result from NATS is plain DTO, wrap it in StandardApiResponse
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error.message || 'Failed to get signed URL');
    }
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'academy.storage.findById' },
          { fileId: id },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      return errorResponse(error.message || 'Failed to get file');
    }
  }
}
