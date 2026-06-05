import { Module } from '@nestjs/common';
import { StorageController } from './controllers/storage.controller';
import { NatsClientModule, SharedStorageModule } from '@server/shared';

@Module({
  imports: [NatsClientModule, SharedStorageModule],
  controllers: [StorageController],
  providers: [],
})
export class StorageModule {}
