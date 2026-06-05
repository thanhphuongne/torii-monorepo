import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClassAttendanceService } from './class-attendance.service';
import {
  ClassAttendanceCreateDto,
  ClassAttendanceQueryDto,
  ClassAttendanceUpdateDto,
} from './dto/class-attendance.dto';

@Controller()
export class ClassAttendanceHandler {
  constructor(private readonly attendanceService: ClassAttendanceService) { }

  @MessagePattern({ cmd: 'academy.classAttendance.findAll' })
  findAll(@Payload() query: ClassAttendanceQueryDto) {
    return this.attendanceService.findAll(query);
  }

  @MessagePattern({ cmd: 'academy.classAttendance.findById' })
  findById(@Payload() data: { id: string }) {
    return this.attendanceService.findById(data.id);
  }

  @MessagePattern({ cmd: 'academy.classAttendance.create' })
  create(
    @Payload()
    data: ClassAttendanceCreateDto & {
      requesterId?: string;
      requesterRole?: string;
    },
  ) {
    const { requesterId, requesterRole, ...input } = data;
    return this.attendanceService.create(input, requesterId, requesterRole);
  }

  @MessagePattern({ cmd: 'academy.classAttendance.update' })
  update(
    @Payload()
    data: {
      id: string;
      input: ClassAttendanceUpdateDto;
      requesterId?: string;
      requesterRole?: string;
    },
  ) {
    return this.attendanceService.update(
      data.id,
      data.input,
      data.requesterId,
      data.requesterRole,
    );
  }

  @MessagePattern({ cmd: 'academy.classAttendance.delete' })
  delete(@Payload() data: { id: string; requesterId?: string }) {
    return this.attendanceService.delete(data.id, data.requesterId);
  }
}
