import { Module } from '@nestjs/common';
import { ClassAttendanceService } from './class-attendance.service';
import { ClassAttendanceHandler } from './class-attendance.handler';

@Module({
  providers: [ClassAttendanceService],
  controllers: [ClassAttendanceHandler],
  exports: [ClassAttendanceService],
})
export class ClassAttendanceModule { }
