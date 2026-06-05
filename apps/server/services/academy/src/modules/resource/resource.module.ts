import { Module } from '@nestjs/common';
import { ResourceService } from './resource.service';
import { ResourceHandler } from './resource.handler';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [StorageModule],
    providers: [ResourceService],
    controllers: [ResourceHandler],
    exports: [ResourceService],
})
export class ResourceModule { }
