import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  Inject,
  Param,
  UploadedFile,
  UseInterceptors,
  Logger,
  Query,
  All,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create, fromBinary } from '@bufbuild/protobuf';
import {
  UploadedFileMergeReq,
  UploadedFileMergeReqSchema,
  UploadedFileResSchema,
  GetRoomUploadedFilesReqSchema,
  GetRoomUploadedFilesResSchema,
  UploadBase64EncodedDataReqSchema,
  UploadBase64EncodedDataResSchema,
  GetClientFilesResSchema,
  RoomUploadedFileType,
} from '@workspace/protocol';
import {
  sendProtoJsonResponse,
  sendProtobufResponse,
  sendCommonProtoJsonResponse,
  sendCommonProtobufResponse,
  JwtAuthGuard,
  AppConfigService,
} from '@server/shared';
import * as fs from 'fs';
import * as path from 'path';

/**
 * FileController handles file-related operations in the Gateway
 * Routes: /file/*
 */
@Controller()
export class FileController {
  private readonly logger = new Logger(FileController.name);
  private readonly uploadPath: string;

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
    private readonly appConfig: AppConfigService,
  ) {
    const rawPath = this.appConfig.server.uploadPath;
    this.uploadPath = path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(process.cwd(), rawPath);

    this.logger.log(`Resolved uploadPath: ${this.uploadPath}`);

    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * handleFileUpload handles resumable.js chunked uploads
   * GET: check if chunk exists
   * POST: upload chunk
   */
  @Get('api/fileUpload')
  @UseGuards(JwtAuthGuard)
  async handleChunkCheck(@Query() query: any, @Res() res: Response) {
    const req = this.mapResumableQuery(query);
    const jwtRoomId = (res.req as any).roomId;
    const jwtUserId = (res.req as any).requestedUserId;

    if (req.roomId !== jwtRoomId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: false,
        msg: 'roomId trong token không khớp với yêu cầu',
      });
    }
    if (req.userId !== jwtUserId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: false,
        msg: 'userId trong token không khớp với yêu cầu',
      });
    }

    const tempFolder = path.join(this.uploadPath, req.roomSid, 'tmp');
    const chunkDir = path.join(tempFolder, req.resumableIdentifier);
    const chunkPath = path.join(chunkDir, `part${req.resumableChunkNumber}`);

    this.logger.debug(
      `Chunk check: sid=${req.roomSid}, ident=${req.resumableIdentifier}, path=${chunkPath}`,
    );

    if (fs.existsSync(chunkPath)) {
      const stats = fs.statSync(chunkPath);
      if (stats.size === Number(req.resumableCurrentChunkSize)) {
        this.logger.debug(
          `Chunk found and size matches, skipping upload: ${chunkPath}`,
        );
        // Return 200 to indicate chunk already exists (standard resumable.js success)
        return res.status(HttpStatus.OK).send('part_already_uploaded');
      }
      this.logger.warn(`Chunk size mismatch, deleting: ${chunkPath}`);
      fs.unlinkSync(chunkPath);
    }

    // Return 404 to indicate chunk does not exist (standard resumable.js trigger for upload)
    this.logger.debug(`Chunk not found, requesting upload: ${chunkPath}`);
    return res.status(HttpStatus.NOT_FOUND).send('ok_to_upload');
  }

  @Post('api/fileUpload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async handleChunkUpload(
    @Query() query: any,
    @Body() body: any,
    @UploadedFile() file: { buffer: Buffer },
    @Res() res: Response,
  ) {
    if (!file) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: false, msg: 'Không có phần tệp tải lên' });
    }

    // Resumable.js sends params in body for POST requests
    const params = { ...query, ...body };
    const req = this.mapResumableQuery(params);

    if (!req.resumableIdentifier || !req.roomSid) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: false, msg: 'Thiếu tham số resumable' });
    }

    const jwtRoomId = (res.req as any).roomId;
    const jwtUserId = (res.req as any).requestedUserId;

    if (req.roomId !== jwtRoomId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: false,
        msg: 'roomId trong token không khớp với yêu cầu',
      });
    }
    if (req.userId !== jwtUserId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: false,
        msg: 'userId trong token không khớp với yêu cầu',
      });
    }

    // Chunk 1 validation
    if (req.resumableChunkNumber === 1) {
      const maxSizeMb = this.appConfig.upload.maxSizeMb;
      if (req.resumableTotalSize > maxSizeMb * 1024 * 1024) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          status: false,
          msg: `Tệp quá lớn: tối đa cho phép là ${maxSizeMb}MB`,
        });
      }
      // Basic extension validation
      const ext = path
        .extname(req.resumableFilename)
        .toLowerCase()
        .replace('.', '');
      const allowedTypes = this.appConfig.upload.allowedTypes;
      if (!ext || !allowedTypes.includes(ext)) {
        return res
          .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
          .json({ status: false, msg: 'Loại tệp không được phép' });
      }
    }

    const tempFolder = path.join(this.uploadPath, req.roomSid, 'tmp');
    const chunkDir = path.join(tempFolder, req.resumableIdentifier);
    const chunkPath = path.join(chunkDir, `part${req.resumableChunkNumber}`);

    this.logger.debug(
      `Chunk upload: sid=${req.roomSid}, ident=${req.resumableIdentifier}, chunk=${req.resumableChunkNumber}, path=${chunkPath}`,
    );

    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    fs.writeFileSync(chunkPath, file.buffer);
    return res.status(HttpStatus.OK).send('part_uploaded');
  }

  /**
   * handleFileMerge merges chunks into a final file
   */
  @Post('api/uploadedFileMerge')
  @UseGuards(JwtAuthGuard)
  async handleFileMerge(@Body() body: any, @Res() res: Response) {
    try {
      let req: UploadedFileMergeReq;
      if (Buffer.isBuffer(body)) {
        req = fromBinary(UploadedFileMergeReqSchema, body);
      } else {
        req = create(UploadedFileMergeReqSchema, body);
      }

      this.logger.debug(
        `Merge request received: sid=${req.roomSid}, roomId=${req.roomId}, ident=${req.resumableIdentifier}`,
      );
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'file.merge' },
          {
            ...req,
            requestedUserId: (res.req as any).requestedUserId,
            requestedUserName: (res.req as any).requestedUserName,
          },
        ),
      );

      this.logger.debug(`Merge result: ${JSON.stringify(result)}`);
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, UploadedFileResSchema, result);
    } catch (error) {
      sendCommonProtoJsonResponse(res, false, error.message);
    }
  }

  /**
   * handleUploadBase64 handles base64 encoded file uploads
   */
  @Post('api/uploadBase64EncodedData')
  @UseGuards(JwtAuthGuard)
  async handleUploadBase64(
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    let savedFilePath: string | null = null;
    try {
      let protoReq: any;
      if (Buffer.isBuffer(body)) {
        protoReq = fromBinary(UploadBase64EncodedDataReqSchema, body);
      } else {
        protoReq = create(UploadBase64EncodedDataReqSchema, body);
      }
      const roomId = (req as any).roomId;
      const roomInfo = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'room.getRoomInfoByRoomId' },
          { roomId, isRunning: true },
        ),
      );
      if (!roomInfo?.sid) {
        throw new Error('Không tìm thấy phòng');
      }

      const buffer = Buffer.from(protoReq.data, 'base64');
      const maxSizeMb = this.appConfig.upload.maxSizeMb;
      if (buffer.length > maxSizeMb * 1024 * 1024) {
        throw new Error(`Tệp quá lớn: tối đa cho phép là ${maxSizeMb}MB`);
      }

      const safeFilename = path.basename(protoReq.fileName);
      this.validateFileNameAgainstAllowedTypes(safeFilename);

      const uploadDir = path.join(this.uploadPath, roomInfo.sid);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      savedFilePath = path.join(uploadDir, safeFilename);
      fs.writeFileSync(savedFilePath, buffer);

      const relativePath = path.join(roomInfo.sid, safeFilename);
      const mimeType = this.getMimeType(safeFilename);
      const fileId = safeFilename.replace(/\.[^/.]+$/, '');
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'file.registerUploadedMeta' },
          {
            roomId,
            fileId,
            fileName: safeFilename,
            filePath: relativePath,
            fileType: protoReq.fileType as RoomUploadedFileType,
            mimeType,
            requestedUserId: (req as any).requestedUserId,
            requestedUserName: (req as any).requestedUserName,
          },
        ),
      );

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, UploadBase64EncodedDataResSchema, result);
    } catch (error) {
      if (savedFilePath && fs.existsSync(savedFilePath)) {
        try {
          fs.unlinkSync(savedFilePath);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to cleanup uploaded file after metadata registration failure: ${cleanupError.message}`,
          );
        }
      }
      sendCommonProtoJsonResponse(res, false, error.message);
    }
  }

  /**
   * handleDownloadUploadedFile serves files for download
   */
  @Get('download/uploadedFile/*path')
  async handleDownload(
    @Param('path') filePath: string | string[],
    @Res() res: Response,
  ) {
    const pathStr = Array.isArray(filePath) ? filePath.join('/') : filePath;
    const fullPath = path.join(this.uploadPath, pathStr);
    const exists = fs.existsSync(fullPath);
    const isDirectory = exists ? fs.lstatSync(fullPath).isDirectory() : false;

    this.logger.debug(
      `[download.uploadedFile] requestPath="${pathStr}" fullPath="${fullPath}" exists=${exists} isDirectory=${isDirectory}`,
    );

    if (!exists || isDirectory) {
      return res.status(HttpStatus.NOT_FOUND).send('Không tìm thấy tệp');
    }

    const fileName = path.basename(fullPath);
    const mimeType = this.getMimeType(fileName);
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
    );
    res.setHeader('Content-Type', mimeType);

    res.sendFile(path.resolve(fullPath));
  }

  /**
   * handleConvertWhiteboardFile triggers conversion for whiteboard
   */
  @Post('api/convertWhiteboardFile')
  @UseGuards(JwtAuthGuard)
  async handleConvertWhiteboard(@Body() body: any, @Res() res: Response) {
    try {
      let data: any = body;
      if (Buffer.isBuffer(body)) {
        // Since this is likely a JSON object encoded in a buffer if it's conversion info
        // or it could be a proto if we had one.
        // For now, let's try JSON if it's a buffer and not matched elsewhere.
        try {
          data = JSON.parse(body.toString());
        } catch (e) {
          data = body;
        }
      }
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'file.convertWhiteboard' }, data),
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: false, msg: error.message });
    }
  }

  @All('api/getRoomFilesByType')
  @UseGuards(JwtAuthGuard)
  async handleGetFilesByType(@Body() body: any, @Res() res: Response) {
    try {
      let req: any;
      if (Buffer.isBuffer(body)) {
        req = fromBinary(GetRoomUploadedFilesReqSchema, body);
      } else {
        req = create(GetRoomUploadedFilesReqSchema, body);
      }

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'file.getByType' }, req),
      );

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, GetRoomUploadedFilesResSchema, result);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  /**
   * handleGetClientFiles gets the client CSS and JS files
   */
  @Post('auth/getClientFiles')
  @UseGuards(JwtAuthGuard)
  async getClientFiles(@Res() res: Response) {
    const result = create(GetClientFilesResSchema, {
      status: true,
      msg: 'success',
      css: [],
      js: [],
      jsFiles: [],
      cssFiles: [],
      staticAssetsPath: '',
    });

    return sendProtoJsonResponse(res, GetClientFilesResSchema, result);
  }

  /**
   * handleListOfficeFiles serves whiteboard converted images
   */
  @Get('api/whiteboard/listOfficeFiles/*path')
  async handleListOfficeFiles(
    @Param('path') filePath: string | string[],
    @Res() res: Response,
  ) {
    const pathStr = Array.isArray(filePath) ? filePath.join('/') : filePath;
    const fullPath = path.join(this.uploadPath, pathStr);
    const exists = fs.existsSync(fullPath);
    const isDirectory = exists ? fs.lstatSync(fullPath).isDirectory() : false;

    this.logger.debug(
      `[whiteboard.listOfficeFiles] requestPath="${pathStr}" fullPath="${fullPath}" exists=${exists} isDirectory=${isDirectory}`,
    );

    if (!exists || isDirectory) {
      return res.status(HttpStatus.NOT_FOUND).send('Không tìm thấy tệp');
    }

    const fileName = path.basename(fullPath);
    res.setHeader('Content-Type', this.getMimeType(fileName));
    res.sendFile(path.resolve(fullPath));
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    };
    return mimes[ext] || 'application/octet-stream';
  }

  private validateFileNameAgainstAllowedTypes(filename: string) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const allowedTypes = this.appConfig.upload.allowedTypes;
    if (!ext || !allowedTypes.includes(ext)) {
      throw new Error('Loại tệp không được phép');
    }
  }

  private mapResumableQuery(query: any) {
    return {
      roomSid: query.roomSid,
      roomId: query.roomId,
      userId: query.userId,
      resumableChunkNumber: Number(query.resumableChunkNumber),
      resumableTotalChunks: Number(query.resumableTotalChunks),
      resumableTotalSize: Number(query.resumableTotalSize),
      resumableIdentifier: query.resumableIdentifier,
      resumableFilename: query.resumableFilename,
      resumableCurrentChunkSize: Number(query.resumableCurrentChunkSize),
    };
  }
}
