import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResourceService } from './resource.service';

@Controller()
export class ResourceHandler {
    constructor(private readonly service: ResourceService) { }

    @MessagePattern({ cmd: 'academy.resource.getFoldersForLearner' })
    getFoldersForLearner(@Payload() data: { userId: string; role?: string; deliveryScopeId?: string }) {
        return this.service.getFoldersForLearner(data.userId, data.role, data.deliveryScopeId);
    }

    @MessagePattern({ cmd: 'academy.resource.getResourcesForLearner' })
    getResourcesForLearner(@Payload() data: { folderId?: string; deliveryScopeId?: string; userId: string; role?: string }) {
        return this.service.getResourcesForLearner(data);
    }


    @MessagePattern({ cmd: 'academy.resource.createFolder' })
    createFolder(@Payload() data: any) {
        return this.service.createFolder(data);
    }

    @MessagePattern({ cmd: 'academy.resource.createResource' })
    createResource(@Payload() data: { input: any; creatorId: string }) {
        return this.service.createResource(data.input, data.creatorId);
    }

    @MessagePattern({ cmd: 'academy.resource.updateResource' })
    updateResource(@Payload() data: { id: string; input: any; userId: string }) {
        return this.service.updateResource(data.id, data.input, data.userId);
    }


    @MessagePattern({ cmd: 'academy.resource.deleteResource' })
    deleteResource(@Payload() data: { id: string; userId: string }) {
        return this.service.deleteResource(data.id, data.userId);
    }


    @MessagePattern({ cmd: 'academy.resource.deleteFolder' })
    deleteFolder(@Payload() data: { id: string; userId: string }) {
        return this.service.deleteFolder(data.id, data.userId);
    }


    @MessagePattern({ cmd: 'academy.resource.getFoldersByOwner' })
    getFoldersByOwner(@Payload() data: { ownerId: string; ownerType: string }) {
        return this.service.getFoldersByOwner(data.ownerId, data.ownerType);
    }

    @MessagePattern({ cmd: 'academy.resource.getResourcesByFolder' })
    getResourcesByFolder(@Payload() data: { folderId: string }) {
        return this.service.getResourcesByFolderId(data.folderId);
    }

    @MessagePattern({ cmd: 'academy.resource.getResourceDetail' })
    getResourceDetail(@Payload() data: { id: string; userId: string; role?: string }) {
        return this.service.getResourceDetail(data.id, data.userId, data.role);
    }
}
