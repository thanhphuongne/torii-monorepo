/**
 * Download Controller (Gateway)
 *
 * Handles file downloads (Recordings, Artifacts, etc.)
 */

import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('download')
export class DownloadController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleDownloadRecording handles the download of a recording file
   * @route GET /download/recording/:token
   */
  @Get('recording/:token')
  async handleDownloadRecording(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token || token.length === 0) {
      res.status(HttpStatus.UNAUTHORIZED).send('Thiếu token hoặc URL không hợp lệ');
      return;
    }

    try {
      const verifyRes = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'recording.verifyDownloadToken' },
          { token },
        ),
      );

      if (!verifyRes.status) {
        res
          .status(verifyRes.httpStatus || HttpStatus.BAD_REQUEST)
          .send(verifyRes.msg || 'Token không hợp lệ');
        return;
      }

      const { filePath, fileName } = verifyRes;

      res.attachment(fileName || filePath);
      res.sendFile(filePath);
    } catch (error) {
      res
        .status(HttpStatus.BAD_REQUEST)
        .send(
          error instanceof Error
            ? error.message
            : 'Lỗi khi tải bản ghi',
        );
    }
  }

  /**
   * HandleDownloadArtifact handles the download of an artifact file
   * @route GET /download/artifact/:token
   */
  @Get('artifact/:token')
  async handleDownloadArtifact(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token || token.length === 0) {
      res.status(HttpStatus.UNAUTHORIZED).send('Thiếu token hoặc URL không hợp lệ');
      return;
    }

    try {
      const verifyRes = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'artifact.verifyDownloadToken' },
          { token },
        ),
      );

      if (!verifyRes.status) {
        res
          .status(HttpStatus.BAD_REQUEST)
          .send(verifyRes.msg || 'Token không hợp lệ');
        return;
      }

      const { absolutePath, fileName } = verifyRes;

      res.attachment(fileName);
      res.sendFile(absolutePath);
    } catch (error) {
      res
        .status(HttpStatus.BAD_REQUEST)
        .send(
          error instanceof Error ? error.message : 'Lỗi khi tải artifact',
        );
    }
  }
}
