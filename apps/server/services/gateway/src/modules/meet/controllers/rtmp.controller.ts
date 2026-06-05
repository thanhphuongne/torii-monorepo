import {
  Controller,
  Post,
  Body,
  Inject,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { RecordingTasks } from '@workspace/protocol';

/**
 * Controller to handle RTMP server webhooks (e.g. NGINX-RTMP)
 * Matches /api/rtmp endpoint
 */
@Controller('api/rtmp')
export class RtmpController {
  private readonly logger = new Logger(RtmpController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleRtmpWebhook(@Body() body: any, @Res() res: Response) {
    let roomId = '';
    let isActive = false;
    let nodeId = '';

    try {
      // Check if body is a Buffer or JSON-representation of Buffer
      let buffer: Uint8Array | undefined;

      if (Buffer.isBuffer(body)) {
        buffer = body;
      } else if (body && body.type === 'Buffer' && Array.isArray(body.data)) {
        // Handle JSON-serialized Buffer (e.g. from bodyParser.json)
        buffer = new Uint8Array(body.data);
      }

      if (buffer) {
        // Protobuf path (Manual Parsing)
        try {
          const request = this.parseRtmpProto(buffer);
          this.logger.debug(`Parsed RTMP Proto: ${JSON.stringify(request)}`);

          roomId = request.room_id;
          const task = request.task;
          nodeId = '';

          // 2 = START_RTMP, 3 = STOP_RTMP, 5 = END_RTMP
          if (task === RecordingTasks.START_RTMP) {
            isActive = true;
          } else if (
            task === RecordingTasks.STOP_RTMP ||
            task === RecordingTasks.END_RTMP
          ) {
            isActive = false;
          } else {
            // Default fallback or ignore
            this.logger.log(`Ignored RTMP protobuf task: ${task}`);
            if (!roomId) return res.status(400).send('Thiếu room_id');
            return res.status(200).send('Ignored');
          }
        } catch (e) {
          this.logger.error(`Failed to parse protobuf: ${e.message}`);
          return res.status(400).send('Protobuf không hợp lệ');
        }
      } else {
        // Fallback: NGINX-RTMP standard format (x-www-form-urlencoded)
        const action = body.call;
        roomId = body.name;
        nodeId = body.addr || '';

        if (roomId && action) {
          if (action === 'publish') isActive = true;
          else if (action === 'publish_done') isActive = false;
          else return res.status(200).send('Ignored');
        } else {
          // Unknown format
          this.logger.warn(
            `Received unknown body format: ${JSON.stringify(body).slice(0, 100)}...`,
          );
          return res.status(400).send('Định dạng yêu cầu không hợp lệ');
        }
      }

      if (!roomId) {
        this.logger.warn('RTMP webhook missing room_id');
        return res.status(400).send('Thiếu room_id');
      }

      // Send to NATS
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'room.updateRTMP' },
          {
            roomId: roomId,
            isActive: isActive,
            nodeId: nodeId,
          },
        ),
      );

      if (result && result.success) {
        return res.status(200).send('OK');
      } else {
        this.logger.warn(
          `Failed to update RTMP status for room ${roomId}: ${result?.message}`,
        );
        if (isActive) {
          return res.status(404).send('Không tìm thấy phòng hoặc phòng không hoạt động');
        }
        return res.status(200).send('OK');
      }
    } catch (error) {
      this.logger.error(`Error handling RTMP webhook: ${error.message}`);
      return res.status(500).send('Lỗi máy chủ nội bộ');
    }
  }

  private parseRtmpProto(buffer: Uint8Array) {
    let offset = 0;
    const result = { task: 0, room_id: '', rtmp_url: '' };

    while (offset < buffer.length) {
      try {
        const tag = this.readVarint(buffer, offset);
        offset = tag.newOffset;
        const fieldNo = Number(tag.value >> 3n);
        const wireType = Number(tag.value & 7n);

        if (wireType === 0) {
          // Varint
          const val = this.readVarint(buffer, offset);
          offset = val.newOffset;
          if (fieldNo === 1) result.task = Number(val.value);
        } else if (wireType === 2) {
          // Length Delimited
          const len = this.readVarint(buffer, offset);
          offset = len.newOffset;
          const length = Number(len.value);
          if (offset + length > buffer.length) break; // Safety check
          const bytes = buffer.subarray(offset, offset + length);
          offset += length;
          const str = new TextDecoder().decode(bytes);
          if (fieldNo === 4) result.room_id = str;
          else if (fieldNo === 5) result.rtmp_url = str;
        } else {
          // Simple skipper: assumes standard types
          if (wireType === 1)
            offset += 8; // 64-bit
          else if (wireType === 5)
            offset += 4; // 32-bit
          else break; // Unknown or group, stop
        }
      } catch (e) {
        break; // Stop parsing on error
      }
    }
    return result;
  }

  private readVarint(buffer: Uint8Array, offset: number) {
    let value = 0n;
    let shift = 0n;
    let count = 0;

    while (offset < buffer.length) {
      const b = BigInt(buffer[offset++]);
      value |= (b & 0x7fn) << shift;
      if ((b & 0x80n) === 0n) break;
      shift += 7n;
      count++;
      if (count > 10) throw new Error('Varint too long');
    }
    return { value, newOffset: offset };
  }
}
