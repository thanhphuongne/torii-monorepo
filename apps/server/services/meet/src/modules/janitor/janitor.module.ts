import { Module, forwardRef } from '@nestjs/common';
import { JanitorService } from './janitor.service';
import { JanitorRoomService } from './janitor-room.service';
import { JanitorUserService } from './janitor-user.service';
import { JanitorFilesystemService } from './janitor-filesystem.service';
import { NatsModule } from '@server/meet/services/nats.module';
import { RoomModule } from '@server/meet/modules/room/room.module';
import { RedisModule } from '@server/meet/infrastructure/redis/redis.module';
import { LiveKitModule } from '@server/meet/infrastructure/livekit/livekit.module';
import { PrismaModule } from '@server/shared';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => NatsModule),
    forwardRef(() => RoomModule),
    LiveKitModule,
  ],
  providers: [
    JanitorService,
    JanitorRoomService,
    JanitorUserService,
    JanitorFilesystemService,
  ],
  exports: [JanitorService],
})
export class JanitorModule {}
