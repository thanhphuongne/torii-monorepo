import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RecordingService } from '@server/meet/modules/recording/recording.service';
import { RecordingInfoService } from '@server/meet/modules/recording/recording-info.service';
import {
  RecordingReqSchema,
  CommonResponseSchema,
  RecorderToWajlcSchema,
  FetchRecordingsReqSchema,
  RecordingInfoReqSchema,
  FetchRecordingsResultSchema,
  RecordingInfoResSchema,
} from '@workspace/protocol';
import { fromBinary, create, toBinary } from '@bufbuild/protobuf';

@Controller()
export class RecordingNatsController {
  private readonly logger = new Logger(RecordingNatsController.name);

  constructor(
    private readonly recordingService: RecordingService,
    private readonly recordingInfoService: RecordingInfoService,
  ) {}

  @MessagePattern('recording')
  async handleRecordingRequest(
    @Payload() data: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      const req = fromBinary(RecordingReqSchema, data);
      await this.recordingService.handleRecordingReq(req);

      // Return success
      const res = create(CommonResponseSchema, {
        status: true,
        msg: 'Request processed successfully',
      });
      return toBinary(CommonResponseSchema, res);
    } catch (error) {
      this.logger.error(`Error handling recording request: ${error.message}`);
      const res = create(CommonResponseSchema, {
        status: false,
        msg: error.message,
      });
      return toBinary(CommonResponseSchema, res);
    }
  }

  @MessagePattern('recording.fetch')
  async fetchActiveRecordings(): Promise<Uint8Array> {
    try {
      const activeRooms = await this.recordingService.getAllActiveRecorders();
      // Return as JSON byte array
      return new TextEncoder().encode(JSON.stringify(activeRooms));
    } catch (error) {
      this.logger.error(`Error fetching active recordings: ${error.message}`);
      return new TextEncoder().encode(JSON.stringify([]));
    }
  }

  @MessagePattern('recording.list')
  async fetchRecordings(@Payload() data: Uint8Array): Promise<Uint8Array> {
    try {
      const req = fromBinary(FetchRecordingsReqSchema, data);
      const result = await this.recordingInfoService.fetchRecordings(req);
      return toBinary(FetchRecordingsResultSchema, result);
    } catch (error) {
      this.logger.error(`Error fetching recordings: ${error.message}`);
      // We'll return empty result with 0 count
      const empty = create(FetchRecordingsResultSchema, {
        totalRecordings: '0',
      });
      return toBinary(FetchRecordingsResultSchema, empty);
    }
  }

  @MessagePattern('recording.info')
  async fetchRecordingInfo(@Payload() data: Uint8Array): Promise<Uint8Array> {
    try {
      const req = fromBinary(RecordingInfoReqSchema, data);
      const result = await this.recordingInfoService.recordingInfo(req);
      return toBinary(RecordingInfoResSchema, result);
    } catch (error) {
      this.logger.error(`Error fetching recording info: ${error.message}`);
      const res = create(RecordingInfoResSchema, {
        status: false,
        msg: error.message,
      });
      return toBinary(RecordingInfoResSchema, res);
    }
  }

  @MessagePattern('recorder.notify')
  async handleRecorderNotify(@Payload() data: Uint8Array): Promise<Uint8Array> {
    try {
      const req = fromBinary(RecorderToWajlcSchema, data);
      await this.recordingService.handleRecorderResp(req);

      const res = create(CommonResponseSchema, {
        status: true,
        msg: 'Notification processed',
      });
      return toBinary(CommonResponseSchema, res);
    } catch (error) {
      this.logger.error(
        `Error handling recorder notification: ${error.message}`,
      );
      const res = create(CommonResponseSchema, {
        status: false,
        msg: error.message,
      });
      return toBinary(CommonResponseSchema, res);
    }
  }
}

