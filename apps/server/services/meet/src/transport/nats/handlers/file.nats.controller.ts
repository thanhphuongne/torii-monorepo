import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FileService } from '@server/meet/modules/file/file.service';
import {
  UploadedFileMergeReq,
  GetRoomUploadedFilesReq,
  UploadBase64EncodedDataReq,
  RoomUploadedFileType,
} from '@workspace/protocol';
import { RegisterUploadedFileMetaReq } from '@server/meet/modules/file/file.service';

@Controller()
export class FileNatsController {
  constructor(private readonly fileService: FileService) {}

  @MessagePattern({ cmd: 'file.merge' })
  async handleFileMerge(@Payload() req: UploadedFileMergeReq): Promise<any> {
    return this.fileService.uploadedFileMerge(req);
  }

  @MessagePattern({ cmd: 'file.uploadBase64' })
  async handleUploadBase64(
    @Payload() req: UploadBase64EncodedDataReq,
  ): Promise<any> {
    return this.fileService.uploadBase64EncodedData(req);
  }

  @MessagePattern({ cmd: 'file.registerUploadedMeta' })
  async handleRegisterUploadedMeta(
    @Payload()
    req: RegisterUploadedFileMetaReq & { fileType: RoomUploadedFileType },
  ): Promise<any> {
    return this.fileService.registerUploadedFileMetadata(req);
  }

  @MessagePattern({ cmd: 'file.convertWhiteboard' })
  async handleConvertWhiteboard(
    @Payload() data: { roomId: string; roomSid: string; filePath: string },
  ): Promise<any> {
    return this.fileService.convertAndBroadcastWhiteboardFile(
      data.roomId,
      data.roomSid,
      data.filePath,
    );
  }

  @MessagePattern({ cmd: 'file.getByType' })
  async handleGetFilesByType(
    @Payload() req: GetRoomUploadedFilesReq,
  ): Promise<any> {
    return this.fileService.getRoomFilesByType(req.roomId, req.fileType);
  }
}

