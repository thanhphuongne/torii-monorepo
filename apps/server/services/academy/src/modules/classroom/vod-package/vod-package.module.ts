import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';
import { VodPackageService } from './vod-package.service';
import { VodPackageHandler } from './vod-package.handler';

@Module({
  imports: [NatsClientModule],
  providers: [VodPackageService],
  controllers: [VodPackageHandler],
  exports: [VodPackageService],
})
export class VodPackageModule {}
