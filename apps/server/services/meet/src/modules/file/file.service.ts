import { Injectable, Logger } from '@nestjs/common';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import {
  RoomUploadedFileType,
  RoomUploadedFileMetadataSchema,
  UploadedFileMergeReq,
  UploadedFileResSchema,
  UploadBase64EncodedDataReq,
  UploadBase64EncodedDataResSchema,
  ChatMessageSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { AppConfigService } from '@server/shared';

const execPromise = promisify(exec);

export interface ResumableUploadReq {
  roomSid: string;
  roomId: string;
  userId: string;
  resumableChunkNumber: number;
  resumableTotalChunks: number;
  resumableTotalSize: number;
  resumableIdentifier: string;
  resumableFilename: string;
  resumableCurrentChunkSize: number;
}

export interface RegisterUploadedFileMetaReq {
  roomId: string;
  fileId: string;
  fileName: string;
  filePath: string;
  fileType: RoomUploadedFileType;
  mimeType: string;
  requestedUserId?: string;
  requestedUserName?: string;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadPath: string;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly natsRoom: NatsRoomService,
    private readonly natsRoomEvents: NatsRoomEventsService,
    private readonly natsSystemEvents: NatsSystemEventsService,
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
   * ResumableFileUpload handles chunked uploads from resumable.js
   */
  async resumableFileUpload(
    req: ResumableUploadReq,
    method: string,
    file?: { buffer: Buffer },
  ): Promise<any> {
    this.logger.debug(
      `ResumableFileUpload: ${method} for room ${req.roomId}, chunk ${req.resumableChunkNumber}`,
    );

    const tempFolder = path.join(this.uploadPath, req.roomSid, 'tmp');
    const chunkDir = path.join(tempFolder, req.resumableIdentifier);
    const chunkPath = path.join(chunkDir, `part${req.resumableChunkNumber}`);

    if (method === 'GET') {
      if (fs.existsSync(chunkPath)) {
        const stats = fs.statSync(chunkPath);
        if (stats.size === Number(req.resumableCurrentChunkSize)) {
          return { status: true, msg: 'part_already_uploaded', code: 201 };
        }
        fs.unlinkSync(chunkPath);
      }
      return { status: true, msg: 'ok_to_upload', code: 204 };
    }

    if (method === 'POST') {
      if (!file) {
        throw new Error('Yêu cầu POST không có tệp');
      }

      if (req.resumableChunkNumber === 1) {
        // Check if room is active
        const roomInfo = await this.natsRoom.getRoomInfo(req.roomId);
        if (!roomInfo || roomInfo.status === 'ended') {
          throw new Error('Phòng không hoạt động');
        }
        // Check max size
        const maxSizeMb = this.appConfig.upload.maxSizeMb;
        if (req.resumableTotalSize > maxSizeMb * 1024 * 1024) {
          throw new Error(`Tệp quá lớn: tối đa cho phép là ${maxSizeMb}MB`);
        }

        // Validate Mime Type (Chunk 1)
        this.detectMimeTypeForValidation(req.resumableFilename);
      }

      if (!fs.existsSync(chunkDir)) {
        fs.mkdirSync(chunkDir, { recursive: true });
      }

      fs.writeFileSync(chunkPath, file.buffer);
      return { status: true, msg: 'part_uploaded', code: 200 };
    }
  }

  /**
   * UploadBase64EncodedData handles base64 encoded file uploads
   */
  async uploadBase64EncodedData(
    req: UploadBase64EncodedDataReq & {
      requestedUserId?: string;
      requestedUserName?: string;
    },
  ): Promise<any> {
    this.logger.debug(
      `UploadBase64EncodedData for file ${req.fileName} in room ${req.roomId}`,
    );

    const roomInfo = await this.natsRoom.getRoomInfo(req.roomId);
    if (!roomInfo) {
      throw new Error('Không tìm thấy phòng');
    }

    const roomSid = roomInfo.roomSid;
    const roomId = roomInfo.roomId;

    const buffer = Buffer.from(req.data, 'base64');

    // Check max size
    const maxSizeMb = this.appConfig.upload.maxSizeMb;
    if (buffer.length > maxSizeMb * 1024 * 1024) {
      throw new Error(`Tệp quá lớn: tối đa cho phép là ${maxSizeMb}MB`);
    }

    // Validate Mime Type
    this.detectMimeTypeForValidation(req.fileName);

    const uploadDir = path.join(this.uploadPath, roomSid);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFilename = path.basename(req.fileName);
    const finalPath = path.join(uploadDir, safeFilename);

    fs.writeFileSync(finalPath, buffer);

    // at present format ${file.id}.png
    const fileId = safeFilename.replace(/\.[^/.]+$/, '');
    const relativePath = path.join(roomSid, safeFilename);
    const mimeType = this.getMimeType(safeFilename);
    await this.registerUploadedFileMetadata({
      roomId,
      fileId,
      fileName: safeFilename,
      filePath: relativePath,
      fileType: req.fileType,
      mimeType,
      requestedUserId: req.requestedUserId,
      requestedUserName: req.requestedUserName,
    });

    return create(UploadBase64EncodedDataResSchema, {
      status: true,
      msg: 'file uploaded successfully',
      filePath: relativePath,
      fileName: safeFilename,
      fileMimeType: mimeType,
      fileExtension: path.extname(safeFilename).replace('.', ''),
    });
  }

  async registerUploadedFileMetadata(
    req: RegisterUploadedFileMetaReq,
  ): Promise<any> {
    const meta = create(RoomUploadedFileMetadataSchema, {
      fileId: req.fileId,
      fileName: req.fileName,
      filePath: req.filePath,
      fileType: req.fileType,
      mimeType: req.mimeType,
    });
    await this.natsRoom.addRoomFile(req.roomId, meta);

    if (req.fileType === RoomUploadedFileType.CHAT_FILE) {
      await this.publishChatMsgForFile(
        req.roomId,
        req.requestedUserId || 'system',
        req.requestedUserName || 'System',
        req.filePath,
        req.fileName,
      );
    }

    return create(UploadBase64EncodedDataResSchema, {
      status: true,
      msg: 'file uploaded successfully',
      filePath: req.filePath,
      fileName: req.fileName,
      fileMimeType: req.mimeType,
      fileExtension: path.extname(req.fileName).replace('.', ''),
    });
  }

  /**
   * UploadedFileMerge combines all chunks into a final file
   */
  async uploadedFileMerge(
    req: UploadedFileMergeReq & {
      requestedUserId?: string;
      requestedUserName?: string;
    },
  ): Promise<any> {
    const safeFilename = path.basename(req.resumableFilename);
    const tempFolder = path.join(this.uploadPath, req.roomSid, 'tmp');
    const chunkDir = path.join(tempFolder, req.resumableIdentifier);

    this.logger.debug(
      `Merging files: sid=${req.roomSid}, ident=${req.resumableIdentifier}, chunkDir=${chunkDir}`,
    );

    if (!fs.existsSync(chunkDir)) {
      this.logger.error(`Chunks not found in path: ${chunkDir}`);
      throw new Error(
        `Không tìm thấy chunk cho ${req.resumableIdentifier} tại ${chunkDir}`,
      );
    }

    const uploadDir = path.join(this.uploadPath, req.roomSid);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const finalPath = path.join(uploadDir, safeFilename);

    // Combining chunks into one file
    const destFile = fs.openSync(finalPath, 'w');

    try {
      for (let i = 1; i <= req.resumableTotalChunks; i++) {
        const chunkPath = path.join(chunkDir, `part${i}`);
        if (!fs.existsSync(chunkPath)) {
          throw new Error(`Thiếu chunk ${i}`);
        }
        const chunkData = fs.readFileSync(chunkPath);
        fs.writeSync(destFile, chunkData);
      }
    } finally {
      fs.closeSync(destFile);
    }

    // Delete chunks
    this.deleteFolderRecursive(chunkDir);

    // Validate Mime Type of merged file
    this.detectMimeTypeForValidation(safeFilename);

    const fileId = uuidv4();
    const relativePath = path.join(req.roomSid, safeFilename);

    // Determine mime type
    const mimeType = this.getMimeType(safeFilename);

    if (req.fileType !== RoomUploadedFileType.WHITEBOARD_CONVERTED_FILE) {
      const meta = create(RoomUploadedFileMetadataSchema, {
        fileId,
        fileName: safeFilename,
        filePath: relativePath,
        fileType: req.fileType,
        mimeType,
      });
      await this.natsRoom.addRoomFile(req.roomId, meta);
    }

    const response = create(UploadedFileResSchema, {
      status: true,
      msg: 'file uploaded successfully',
      fileId,
      fileType: req.fileType,
      fileMimeType: mimeType,
      filePath: relativePath,
      fileName: safeFilename,
      fileExtension: path.extname(safeFilename).replace('.', ''),
    });

    if (req.fileType === RoomUploadedFileType.CHAT_FILE) {
      await this.publishChatMsgForFile(
        req.roomId,
        req.requestedUserId || 'system',
        req.requestedUserName || 'System',
        relativePath,
        safeFilename,
      );
    }

    return response;
  }

  /**
   * ConvertAndBroadcastWhiteboardFile converts files for whiteboard using office and muPDF
   */
  async convertAndBroadcastWhiteboardFile(
    roomId: string,
    roomSid: string,
    filePath: string,
  ): Promise<any> {
    this.logger.log(
      `ConvertAndBroadcastWhiteboardFile: ${filePath} for room ${roomId}`,
    );

    const fullPath = path.join(this.uploadPath, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error('Không tìm thấy tệp');
    }

    const fileId = uuidv4();
    const outputDir = path.join(this.uploadPath, roomSid, fileId);
    fs.mkdirSync(outputDir, { recursive: true });

    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // Check MimeType again
    this.detectMimeTypeForValidation(fileName);

    let pdfPath = fullPath;
    if (ext !== '.pdf') {
      // Convert to PDF using soffice (LibreOffice)
      try {
        // We'll trust the command for now
        await execPromise(
          `soffice --headless --invisible --nologo --nolockcheck --convert-to pdf --outdir "${outputDir}" "${fullPath}"`,
        );
        const pdfName = path.basename(fileName, ext) + '.pdf';
        pdfPath = path.join(outputDir, pdfName);
      } catch (error) {
        this.logger.error(`soffice conversion failed: ${error.message}`);
        throw new Error('Chuyển đổi tệp sang PDF thất bại');
      }
    }

    // Convert PDF to images using mutool
    try {
      await execPromise(
        `mutool convert -O resolution=300 -o "${path.join(outputDir, 'page_%d.png')}" "${pdfPath}"`,
      );
    } catch (error) {
      this.logger.error(`mutool conversion failed: ${error.message}`);
      throw new Error('Chuyển PDF sang ảnh thất bại');
    }

    // Count pages
    const files = fs.readdirSync(outputDir);
    const pages = files.filter(
      (f) => f.startsWith('page_') && f.endsWith('.png'),
    ).length;

    const res = {
      status: true,
      msg: 'success',
      fileName,
      filePath: path.join(roomSid, fileId),
      fileId,
      totalPages: pages,
    };

    // Store in NATS
    const meta = create(RoomUploadedFileMetadataSchema, {
      fileId,
      fileName,
      filePath: res.filePath,
      fileType: RoomUploadedFileType.WHITEBOARD_CONVERTED_FILE,
      totalPages: pages,
    });
    await this.natsRoom.addRoomFile(roomId, meta);

    // Update room metadata
    await this.updateRoomMetadataWithOfficeFile(roomId, {
      fileId,
      fileName,
      filePath: res.filePath,
      totalPages: pages,
    });

    return res;
  }

  /**
   * GetRoomFilesByType retrieves file metadata for a room filtered by type
   */
  async getRoomFilesByType(
    roomId: string,
    fileType: RoomUploadedFileType,
  ): Promise<any[]> {
    const allFiles = await this.natsRoom.getAllRoomFiles(roomId);
    const filtered = Object.values(allFiles).filter(
      (f) => f.fileType === fileType,
    );
    return filtered;
  }

  /**
   * DownloadAndProcessPreUploadWBfile downloads a file from URL and processes it for whiteboard
   */
  async downloadAndProcessPreUploadWBfile(
    roomId: string,
    roomSid: string,
    fileUrl: string,
  ): Promise<any> {
    this.logger.log(
      `Downloading and processing pre-upload whiteboard file: ${fileUrl}`,
    );

    try {
      const headRes = await axios.head(fileUrl);
      const len = headRes.headers['content-length'];
      if (len && Number(len) > 0) {
        const maxSizeMb = this.appConfig.upload.maxWhiteboardFileSizeMb;
        if (Number(len) > maxSizeMb * 1024 * 1024) {
          throw new Error('Tệp quá lớn');
        }
      }
      const cType = headRes.headers['content-type'];
      if (!cType) {
        throw new Error('Thiếu header Content-Type');
      }
    } catch (err) {
      this.logger.error(`Failed to validate remote file: ${err.message}`);
      throw err;
    }

    const downloadDir = path.join(this.uploadPath, roomSid);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const fileName =
      path.basename(new URL(fileUrl).pathname) || 'preloaded.pdf';
    const downloadPath = path.join(downloadDir, fileName);

    // Download file
    try {
      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'stream',
        timeout: 180000, // 3 minutes
      });

      const writer = fs.createWriteStream(downloadPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(true));
        writer.on('error', reject);
      });
    } catch (error) {
      this.logger.error(
        `Failed to download file from ${fileUrl}: ${error.message}`,
      );
      throw new Error(`Tải tệp whiteboard thất bại: ${error.message}`);
    }

    const safeFilename = path.basename(fileName);
    this.detectMimeTypeForValidation(safeFilename);

    // Process file (convert and broadcast)
    const filePath = path.join(roomSid, safeFilename);
    return this.convertAndBroadcastWhiteboardFile(roomId, roomSid, filePath);
  }

  /**
   * DeleteRoomUploadedDir deletes all uploaded files for a room session
   */
  async deleteRoomUploadedDir(roomSid: string): Promise<void> {
    if (!roomSid || roomSid.trim() === '') {
      this.logger.warn(
        'deleteRoomUploadedDir called with empty roomSid, skipping to protect upload root',
      );
      return;
    }

    const roomDir = path.join(this.uploadPath, roomSid);
    const normalizedUploadRoot = path.resolve(this.uploadPath);
    const normalizedRoomDir = path.resolve(roomDir);

    // Never allow deleting the upload root directory itself.
    if (normalizedRoomDir === normalizedUploadRoot) {
      this.logger.error(
        `Refusing to delete upload root directory: ${normalizedRoomDir}`,
      );
      return;
    }

    if (fs.existsSync(roomDir)) {
      this.logger.log(
        `Deleting uploaded files directory for room session: ${roomSid}`,
      );
      this.deleteFolderRecursive(roomDir);
    }
  }

  private deleteFolderRecursive(folderPath: string) {
    if (fs.existsSync(folderPath)) {
      fs.readdirSync(folderPath).forEach((file) => {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(folderPath);
    }
  }

  private async updateRoomMetadataWithOfficeFile(
    roomId: string,
    f: {
      fileId: string;
      fileName: string;
      filePath: string;
      totalPages: number;
    },
  ): Promise<void> {
    try {
      const { metadata } = await this.natsRoom.getRoomInfoWithMetadata(roomId);
      if (!metadata) {
        throw new Error('Không tìm thấy metadata phòng');
      }

      if (!metadata.roomFeatures) {
        metadata.roomFeatures = { whiteboardFeatures: {} } as any;
      }
      if (!metadata.roomFeatures?.whiteboardFeatures) {
        metadata.roomFeatures!.whiteboardFeatures = {} as any;
      }

      const wbf = metadata.roomFeatures!.whiteboardFeatures!;
      wbf.whiteboardFileId = f.fileId;
      wbf.fileName = f.fileName;
      wbf.filePath = f.filePath;
      wbf.totalPages = f.totalPages;

      await this.natsRoom.updateAndBroadcastRoomMetadata(roomId, metadata);
    } catch (error) {
      this.logger.error(
        `Failed to update room metadata with office file: ${error.message}`,
      );
    }
  }

  private async publishChatMsgForFile(
    roomId: string,
    userId: string,
    userName: string,
    filePath: string,
    fileName: string,
  ): Promise<void> {
    const apiUrl = this.appConfig.server.apiUrl;

    const message = `<a class="attachment-message flex items-center gap-3 break-all" href="${apiUrl}/download/uploadedFile/${filePath}" target="_blank" rel="noreferrer">
    <span class="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 12.1817C2.09551 11.5762 1.5 10.5452 1.5 9.375C1.5 7.61732 2.84363 6.17347 4.55981 6.01453C4.91086 3.8791 6.76518 2.25 9 2.25C11.2348 2.25 13.0891 3.8791 13.4402 6.01453C15.1564 6.17347 16.5 7.61732 16.5 9.375C16.5 10.5452 15.9045 11.5762 15 12.1817M6 12.75L9 15.75M9 15.75L12 12.75M9 15.75V9" stroke="#0C131A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg></span><span class="flex-1">${fileName}</span></a>`;

    const chatMsg = create(ChatMessageSchema, {
      id: uuidv4(),
      fromName: userName,
      fromUserId: userId,
      sentAt: Date.now().toString(),
      isPrivate: false,
      message: message,
      fromAdmin: false,
    });

    try {
      await this.natsSystemEvents.broadcastChatEntry(roomId, chatMsg);
      this.logger.debug(
        `Broadcasted chat message for file: ${fileName} in room: ${roomId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast chat message for file: ${error.message}`,
      );
    }
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
      '.rtf': 'application/rtf',
      '.csv': 'text/csv',
      '.xml': 'application/xml',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.webm': 'video/webm',
      '.svg': 'image/svg+xml',
    };
    return mimes[ext] || 'application/octet-stream';
  }

  private detectMimeTypeForValidation(filename: string): void {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const allowedTypes = this.appConfig.upload.allowedTypes;

    if (!ext || !allowedTypes.includes(ext)) {
      throw new Error('Loại tệp không được phép');
    }
  }
}
