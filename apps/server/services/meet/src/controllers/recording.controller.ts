/**
 * Recording Controller (Gateway)
 *
 * Handles recording-related API endpoints via Gateway -> NATS -> Meet Service
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
  FetchRecordingsReq,
  FetchRecordingsReqSchema,
  FetchRecordingsResSchema,
  RecordingInfoReq,
  RecordingInfoReqSchema,
  UpdateRecordingMetadataReq,
  UpdateRecordingMetadataReqSchema,
  DeleteRecordingReq,
  DeleteRecordingReqSchema,
  GetDownloadTokenReq,
  GetDownloadTokenReqSchema,
  GetDownloadTokenResSchema,
} from '@workspace/protocol';
import {
  sendCommonProtoJsonResponse,
  sendProtoJsonResponse,
  parseAndValidateRequest,
  ApiKeyGuard,
} from '@server/shared';

/**
 * RecordingController handles recording management operations (ApiKeyGuard routes)
 * Routes under /auth/recording
 */
@Controller('auth/recording')
@UseGuards(ApiKeyGuard)
export class RecordingController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleFetchRecordings fetches a list of recordings
   * @route POST /auth/recording/fetch
   */
  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  async handleFetchRecordings(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    let request: FetchRecordingsReq;
    try {
      request = parseAndValidateRequest<FetchRecordingsReq>(
        body,
        FetchRecordingsReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'recording.fetch' }, request),
      );

      if (Number(result.totalRecordings) === 0) {
        sendCommonProtoJsonResponse(res, false, 'Không có bản ghi nào');
        return;
      }

      const response = create(FetchRecordingsResSchema, {
        status: true,
        msg: 'success',
        result: result,
      });

      res.status(200);
      sendProtoJsonResponse(res, FetchRecordingsResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi tải danh sách bản ghi',
      );
    }
  }

  /**
   * HandleRecordingInfo gets information about a recording
   * @route POST /auth/recording/info
   */
  @Post('info')
  @HttpCode(HttpStatus.OK)
  async handleRecordingInfo(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    let request: RecordingInfoReq;
    try {
      request = parseAndValidateRequest<RecordingInfoReq>(
        body,
        RecordingInfoReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'recording.info' }, request),
      );
      res.status(200);
      sendProtoJsonResponse(res, result.$typeName, result);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi lấy thông tin bản ghi',
      );
    }
  }

  /**
   * HandleUpdateRecordingMetadata updates recording metadata
   * @route POST /auth/recording/updateMetadata
   */
  @Post('updateMetadata')
  @HttpCode(HttpStatus.OK)
  async handleUpdateRecordingMetadata(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    let request: UpdateRecordingMetadataReq;
    try {
      request = parseAndValidateRequest<UpdateRecordingMetadataReq>(
        body,
        UpdateRecordingMetadataReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'recording.updateMetadata' }, request),
      );
      sendCommonProtoJsonResponse(res, true, 'success');
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error
          ? error.message
          : 'Lỗi khi cập nhật metadata bản ghi',
      );
    }
  }

  /**
   * HandleDeleteRecording deletes a recording
   * @route POST /auth/recording/delete
   */
  @Post('delete')
  @HttpCode(HttpStatus.OK)
  async handleDeleteRecording(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    let request: DeleteRecordingReq;
    try {
      request = parseAndValidateRequest<DeleteRecordingReq>(
        body,
        DeleteRecordingReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'recording.delete' }, request),
      );
      sendCommonProtoJsonResponse(res, true, 'success');
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi xóa bản ghi',
      );
    }
  }

  /**
   * HandleGetDownloadToken generates a download token
   * @route POST /auth/recording/getDownloadToken
   */
  @Post('getDownloadToken')
  @HttpCode(HttpStatus.OK)
  async handleGetDownloadToken(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    let request: GetDownloadTokenReq;
    try {
      request = parseAndValidateRequest<GetDownloadTokenReq>(
        body,
        GetDownloadTokenReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'recording.getDownloadToken' }, request),
      );

      const response = create(GetDownloadTokenResSchema, {
        status: true,
        msg: 'success',
        token: result.token,
      });

      res.status(200);
      sendProtoJsonResponse(res, GetDownloadTokenResSchema, response);
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
