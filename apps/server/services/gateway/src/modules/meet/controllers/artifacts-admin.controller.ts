/**
 * Artifacts Controller for Web Admin (Gateway)
 *
 * Wraps meet artifacts API with standard JWT auth and JSON responses
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create, toJson } from '@bufbuild/protobuf';
import {
  FetchArtifactsReqSchema,
  ArtifactInfoReqSchema,
  DeleteArtifactReqSchema,
  GetArtifactDownloadTokenReqSchema,
  RoomArtifactType,
} from '@workspace/protocol';
import { JwtAuthGuard } from '@server/shared';

/**
 * ArtifactsAdminController handles artifact operations for web-admin
 * Routes under /meet/artifacts
 */
@Controller('meet/artifacts')
@UseGuards(JwtAuthGuard)
export class ArtifactsAdminController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * Fetch artifacts with filters and pagination
   * @route POST /meet/artifacts/fetch
   */
  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  async fetchArtifacts(
    @Body()
    body: {
      roomIds?: string[];
      roomSid?: string;
      type?: number;
      limit?: string;
      from?: string;
      orderBy?: string;
    },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const request = create(FetchArtifactsReqSchema, {
        roomIds: body.roomIds || [],
        roomSid: body.roomSid,
        type:
          body.type !== undefined
            ? body.type
            : RoomArtifactType.UNKNOWN_ARTIFACT,
        limit: body.limit || '20',
        from: body.from || '0',
        orderBy: body.orderBy || 'DESC',
      });

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.fetch' }, request),
      );

      // Convert protobuf to JSON
      const artifacts =
        result.result?.artifactsList?.map((artifact: any) => ({
          artifactId: artifact.artifactId,
          roomId: artifact.roomId,
          type: artifact.type,
          metadata: toJson(artifact.metadata.$typeName, artifact.metadata),
          created: artifact.created,
        })) || [];

      res.status(200).json({
        success: true,
        data: {
          artifacts,
          totalArtifacts: parseInt(result.result?.totalArtifacts || '0'),
          from: parseInt(result.result?.from || '0'),
          limit: parseInt(result.result?.limit || '20'),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Lỗi khi tải danh sách artifact',
      });
    }
  }

  /**
   * Get artifact information
   * @route POST /meet/artifacts/info
   */
  @Post('info')
  @HttpCode(HttpStatus.OK)
  async getArtifactInfo(
    @Body() body: { artifactId: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const request = create(ArtifactInfoReqSchema, {
        artifactId: body.artifactId,
      });

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.info' }, request),
      );

      // Convert protobuf to JSON
      const artifact = result.artifactInfo
        ? {
            artifactId: result.artifactInfo.artifactId,
            roomId: result.artifactInfo.roomId,
            type: result.artifactInfo.type,
            metadata: toJson(
              result.artifactInfo.metadata.$typeName,
              result.artifactInfo.metadata,
            ),
            created: result.artifactInfo.created,
          }
        : null;

      const roomInfo = result.roomInfo
        ? {
            roomTitle: result.roomInfo.roomTitle,
            roomId: result.roomInfo.roomId,
            roomSid: result.roomInfo.roomSid,
            joinedParticipants: parseInt(
              result.roomInfo.joinedParticipants || '0',
            ),
            created: result.roomInfo.created,
            ended: result.roomInfo.ended,
          }
        : undefined;

      res.status(200).json({
        success: true,
        data: {
          artifact,
          roomInfo,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Lỗi khi lấy thông tin artifact',
      });
    }
  }

  /**
   * Get download token for artifact
   * @route POST /meet/artifacts/download-token
   */
  @Post('download-token')
  @HttpCode(HttpStatus.OK)
  async getDownloadToken(
    @Body() body: { artifactId: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const request = create(GetArtifactDownloadTokenReqSchema, {
        artifactId: body.artifactId,
      });

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.getDownloadToken' }, request),
      );

      res.status(200).json({
        success: true,
        data: {
          token: result.token,
          expiresIn: 3600, // 1 hour
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Lỗi khi tạo token tải xuống',
      });
    }
  }

  /**
   * Download artifact file
   * @route GET /meet/artifacts/download?token=xxx
   */
  @Get('download')
  async downloadArtifact(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Cần có token',
      });
      return;
    }

    try {
      // Forward to meet service download endpoint
      // This would need to be implemented in meet service
      // For now, return error
      res.status(501).json({
        success: false,
        message: 'Chức năng tải xuống chưa được triển khai',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Lỗi khi tải artifact',
      });
    }
  }

  /**
   * Delete artifact
   * @route POST /meet/artifacts/delete
   */
  @Post('delete')
  @HttpCode(HttpStatus.OK)
  async deleteArtifact(
    @Body() body: { artifactId: string },
    @Res() res: Response,
  ): Promise<void> {
    try {
      const request = create(DeleteArtifactReqSchema, {
        artifactId: body.artifactId,
      });

      await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.delete' }, request),
      );

      res.status(200).json({
        success: true,
        message: 'Artifact deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : 'Lỗi khi xóa artifact',
      });
    }
  }
}
