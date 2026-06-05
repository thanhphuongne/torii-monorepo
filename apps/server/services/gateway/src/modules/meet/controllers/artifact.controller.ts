/**
 * Artifact Controller (Gateway)
 *
 * Handles artifact-related API endpoints via Gateway -> NATS -> Meet Service
 */

import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create } from '@bufbuild/protobuf';
import {
  FetchArtifactsReq,
  FetchArtifactsReqSchema,
  FetchArtifactsResSchema,
  ArtifactInfoReq,
  ArtifactInfoReqSchema,
  DeleteArtifactReq,
  DeleteArtifactReqSchema,
  GetArtifactDownloadTokenReq,
  GetArtifactDownloadTokenReqSchema,
  GetArtifactDownloadTokenResSchema,
} from '@workspace/protocol';
import {
  sendCommonProtoJsonResponse,
  sendProtoJsonResponse,
  parseAndValidateRequest,
  ApiKeyGuard,
} from '@server/shared';

/**
 * ArtifactController handles artifact operations (ApiKeyGuard routes)
 * Routes under /auth/artifact
 */
@Controller('auth/artifact')
@UseGuards(ApiKeyGuard)
export class ArtifactController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleFetchArtifacts fetches a paginated list of artifacts
   * @route POST /auth/artifact/fetch
   */
  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  async handleFetchArtifacts(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: FetchArtifactsReq;
    try {
      request = parseAndValidateRequest<FetchArtifactsReq>(
        body,
        FetchArtifactsReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call artifact service via NATS
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.fetch' }, request),
      );

      if (Number(result.result?.totalArtifacts) === 0) {
        sendCommonProtoJsonResponse(res, false, 'Không có artifact nào');
        return;
      }

      const response = create(FetchArtifactsResSchema, {
        status: true,
        msg: 'success',
        result: result.result,
      });

      res.status(200);
      sendProtoJsonResponse(res, FetchArtifactsResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi tải danh sách artifact',
      );
    }
  }

  /**
   * HandleGetArtifactInfo gets information about a specific artifact
   * @route POST /auth/artifact/info
   */
  @Post('info')
  @HttpCode(HttpStatus.OK)
  async handleGetArtifactInfo(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: ArtifactInfoReq;
    try {
      request = parseAndValidateRequest<ArtifactInfoReq>(
        body,
        ArtifactInfoReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call artifact service via NATS
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.info' }, request),
      );

      res.status(200);
      sendProtoJsonResponse(res, result.$typeName, result);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi lấy thông tin artifact',
      );
    }
  }

  /**
   * HandleDeleteArtifact deletes an artifact
   * @route POST /auth/artifact/delete
   */
  @Post('delete')
  @HttpCode(HttpStatus.OK)
  async handleDeleteArtifact(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: DeleteArtifactReq;
    try {
      request = parseAndValidateRequest<DeleteArtifactReq>(
        body,
        DeleteArtifactReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call artifact service via NATS
    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.delete' }, request),
      );

      sendCommonProtoJsonResponse(res, true, 'success');
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi xóa artifact',
      );
    }
  }

  /**
   * HandleGetArtifactDownloadToken generates a download token for an artifact
   * @route POST /auth/artifact/getDownloadToken
   */
  @Post('getDownloadToken')
  @HttpCode(HttpStatus.OK)
  async handleGetArtifactDownloadToken(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: GetArtifactDownloadTokenReq;
    try {
      request = parseAndValidateRequest<GetArtifactDownloadTokenReq>(
        body,
        GetArtifactDownloadTokenReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call artifact service via NATS
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'artifact.getDownloadToken' }, request),
      );

      const response = create(GetArtifactDownloadTokenResSchema, {
        status: true,
        msg: 'success',
        token: result.token,
      });

      res.status(200);
      sendProtoJsonResponse(res, GetArtifactDownloadTokenResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error
          ? error.message
          : 'Lỗi khi tạo token tải xuống',
      );
    }
  }
}
