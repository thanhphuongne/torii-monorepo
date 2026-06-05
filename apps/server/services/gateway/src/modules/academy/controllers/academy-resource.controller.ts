import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Req,
    UseGuards,
    ForbiddenException,
    Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    GatewayAuthGuard,
    Permissions,
    PermissionsGuard,
    ZodValidationPipe,
    successResponse,
    ReqWithRequester,
} from '@server/shared';
import {
    AcademyFolderCreateDTO,
    AcademyResourceCreateDTO,
    AcademyResourceUpdateDTO,
    academyFolderCreateDTOSchema,
    academyResourceCreateDTOSchema,
    academyResourceUpdateDTOSchema,
    StoragePresignedUrlRequestDTO,
    StorageConfirmUploadRequestDTO,
    storagePresignedUrlRequestDTOSchema,
    storageConfirmUploadRequestDTOSchema,
} from '@workspace/schemas';

@Controller('api/academy')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class AcademyResourceController {
    constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) { }

    // --- Learner APIs ---

    /** Query `deliveryScopeId`: UUID LiveClass hoặc VodPackage — không phải Cohort.id. */
    @Get('my-folders/live-classes')
    async getMyLiveClassFolders(
        @Req() req: ReqWithRequester,
        @Query('deliveryScopeId') deliveryScopeId?: string,
    ) {
        const folders = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.getFoldersForLearner' },
                { userId: req.requester.sub, role: req.requester.role, deliveryScopeId },
            ),
        );
        return successResponse(folders);
    }

    /** Path `deliveryScopeId`: LiveClass.id hoặc VodPackage.id (không phải Cohort.id). */
    @Get('my-folders/live-classes/:deliveryScopeId/resources')
    async getMyLiveClassResources(
        @Param('deliveryScopeId', new ParseUUIDPipe()) deliveryScopeId: string,
        @Req() req: ReqWithRequester,
    ) {
        const resources = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.getResourcesForLearner' },
                { deliveryScopeId, userId: req.requester.sub, role: req.requester.role },
            ),
        );
        return successResponse(resources);
    }

    @Get('resources/:resourceId')
    async getResourceDetail(
        @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
        @Req() req: ReqWithRequester,
    ) {
        const resource = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.getResourceDetail' },
                { id: resourceId, userId: req.requester.sub, role: req.requester.role },
            ),
        );
        return successResponse(resource);
    }

    // --- Staff/Lecturer APIs ---

    @Post('resources')
    @Permissions('lms.delivery.update')
    @HttpCode(HttpStatus.CREATED)
    async createResource(
        @Body(new ZodValidationPipe(academyResourceCreateDTOSchema))
        dto: AcademyResourceCreateDTO,
        @Req() req: ReqWithRequester,
    ) {
        const item = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.createResource' },
                { input: dto, creatorId: req.requester.sub },
            ),
        );
        return successResponse(item);
    }

    @Put('resources/:resourceId')
    @Permissions('lms.delivery.update')
    async updateResource(
        @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
        @Body(new ZodValidationPipe(academyResourceUpdateDTOSchema))
        dto: AcademyResourceUpdateDTO,
        @Req() req: ReqWithRequester,
    ) {
        const item = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.updateResource' },
                { id: resourceId, input: dto, userId: req.requester.sub },
            ),
        );
        return successResponse(item);
    }


    @Delete('resources/:resourceId')
    @Permissions('lms.delivery.update')
    async deleteResource(
        @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
        @Req() req: ReqWithRequester,
    ) {
        const result = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.deleteResource' },
                { id: resourceId, userId: req.requester.sub },
            ),
        );
        return successResponse(result);
    }


    @Get('folders/:folderId/resources')
    async getResourcesByFolder(
        @Param('folderId', new ParseUUIDPipe()) folderId: string,
        @Req() req: ReqWithRequester,
    ) {
        // Learners use the learner-specific logic (checks enrollment & visibility)
        const resources = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.getResourcesForLearner' },
                { folderId, userId: req.requester.sub, role: req.requester.role },
            ),
        );
        return successResponse(resources);
    }

    @Get('folders/:ownerType/:ownerId')
    @Permissions('lms.delivery.read')
    async getFoldersByOwner(
        @Param('ownerType') ownerType: string,
        @Param('ownerId', new ParseUUIDPipe()) ownerId: string,
    ) {
        const folders = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.getFoldersByOwner' },
                { ownerType, ownerId },
            ),
        );
        return successResponse(folders);
    }

    @Post('folders')
    @Permissions('lms.delivery.update')
    async createFolder(
        @Body(new ZodValidationPipe(academyFolderCreateDTOSchema))
        dto: AcademyFolderCreateDTO,
    ) {
        const item = await firstValueFrom(
            this.nats.send({ cmd: 'academy.resource.createFolder' }, dto),
        );
        return successResponse(item);
    }
    @Delete('folders/:folderId')
    @Permissions('lms.delivery.delete')
    async deleteFolder(
        @Param('folderId', new ParseUUIDPipe()) folderId: string,
        @Req() req: ReqWithRequester,
    ) {
        const result = await firstValueFrom(
            this.nats.send(
                { cmd: 'academy.resource.deleteFolder' },
                { id: folderId, userId: req.requester.sub },
            ),
        );
        return successResponse(result);
    }
}
