import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import {
  FetchRecordingsReq,
  FetchRecordingsResult,
  RecordingInfo,
  RecordingInfoRes,
  RecordingInfoReq,
  RoomArtifactType,
  RoomArtifactMetadataSchema,
  FetchRecordingsResultSchema,
  RecordingInfoSchema,
  RecordingInfoResSchema,
} from '@workspace/protocol';
import { create, fromJson } from '@bufbuild/protobuf';

@Injectable()
export class RecordingInfoService {
  private readonly logger = new Logger(RecordingInfoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async fetchRecordings(
    req: FetchRecordingsReq,
  ): Promise<FetchRecordingsResult> {
    const limit = req.limit > 0 && req.limit <= 100 ? Number(req.limit) : 20;
    const from = req.from ? Number(req.from) : 0;
    const orderBy = req.orderBy || 'DESC';

    const where: any = {
      type: {
        in: [
          (RoomArtifactType as any).CLOUD_RECORDING,
          (RoomArtifactType as any).RTMP_RECORDING,
        ].filter(Boolean),
      },
    };

    if (req.roomIds && req.roomIds.length > 0) {
      where.roomId = { in: req.roomIds };
    }
    if (req.roomSid) {
      where.roomInfo = { sid: req.roomSid };
    }

    const [artifacts, total] = await Promise.all([
      this.prisma.roomArtifact.findMany({
        where,
        skip: from,
        take: limit,
        orderBy: { created: orderBy === 'ASC' ? 'asc' : 'desc' },
        include: { roomInfo: true }, // Need room info for sid
      }),
      this.prisma.roomArtifact.count({ where }),
    ]);

    const recordingsList: RecordingInfo[] = artifacts.map((a) => {
      const meta = fromJson(RoomArtifactMetadataSchema, a.metadata as any);
      const size = meta.fileInfo?.fileSize
        ? parseFloat(meta.fileInfo.fileSize)
        : 0;

      return create(RecordingInfoSchema, {
        recordId: a.artifactId,
        roomId: a.roomId,
        roomSid: a.roomInfo?.sid || '',
        filePath: meta.fileInfo?.filePath || '',
        fileSize: parseFloat(size.toFixed(2)),
        creationTime: Math.floor(a.created.getTime() / 1000).toString(),
        roomCreationTime: a.roomInfo
          ? Math.floor(a.roomInfo.created.getTime() / 1000).toString()
          : '0',
      });
    });

    return create(FetchRecordingsResultSchema, {
      totalRecordings: total.toString(),
      from: from,
      limit: limit,
      orderBy: orderBy,
      recordingsList: recordingsList,
    });
  }

  async fetchRecording(recordId: string): Promise<RecordingInfo> {
    const artifact = await this.prisma.roomArtifact.findUnique({
      where: { artifactId: recordId },
      include: { roomInfo: true },
    });

    if (!artifact) {
      throw new Error('Không tìm thấy thông tin');
    }

    const meta = fromJson(RoomArtifactMetadataSchema, artifact.metadata as any);
    const size = meta.fileInfo?.fileSize
      ? parseFloat(meta.fileInfo.fileSize)
      : 0;

    return create(RecordingInfoSchema, {
      recordId: artifact.artifactId,
      roomId: artifact.roomId,
      roomSid: artifact.roomInfo?.sid || '',
      filePath: meta.fileInfo?.filePath || '',
      fileSize: parseFloat(size.toFixed(2)),
      creationTime: Math.floor(artifact.created.getTime() / 1000).toString(),
      roomCreationTime: artifact.roomInfo
        ? Math.floor(artifact.roomInfo.created.getTime() / 1000).toString()
        : '0',
    });
  }

  async recordingInfo(req: RecordingInfoReq): Promise<RecordingInfoRes> {
    try {
      const recording = await this.fetchRecording(req.recordId);

      return create(RecordingInfoResSchema, {
        status: true,
        msg: 'success',
        recordingInfo: recording,
      });
    } catch (error) {
      return create(RecordingInfoResSchema, {
        status: false,
        msg: error.message,
      });
    }
  }
}
