import { Module } from '@nestjs/common';
import { JlptMockService } from './jlpt-mock.service';
import { JlptMockHandler } from './jlpt-mock.handler';
import { JlptDefaultSeederService } from './jlpt-default-seeder.service';

@Module({
  providers: [JlptMockService, JlptDefaultSeederService],
  controllers: [JlptMockHandler],
  exports: [JlptMockService],
})
export class JlptMockModule {}
