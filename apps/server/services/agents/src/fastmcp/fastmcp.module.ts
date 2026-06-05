import { Module } from '@nestjs/common';
import { SharedModule } from '@server/shared';
import { FastMcpService } from './fastmcp.service';

@Module({
  imports: [SharedModule],
  providers: [FastMcpService],
  exports: [FastMcpService],
  controllers: [],
})
export class FastMcpModule {}
