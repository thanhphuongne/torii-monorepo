import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import {
    AcademyFolderCreateDTO,
    AcademyFolderUpdateDTO,
    AcademyResourceCreateDTO,
    AcademyResourceUpdateDTO,
    AcademyFolderResponseDTO,
    AcademyResourceResponseDTO,
    AcademyFolderOwnerType
} from '@workspace/schemas';
import { AuditLoggerService } from '../audit-logger.service';
import { STORAGE_SERVICE_TOKEN, IStorageService } from '@server/academy/interfaces/services/i-storage.service';



@Injectable()
export class ResourceService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditLoggerService,
        @Inject(STORAGE_SERVICE_TOKEN)
        private readonly storageService: IStorageService,
    ) { }



    // --- Folder Management ---

    async createFolder(data: AcademyFolderCreateDTO) {
        return this.prisma.academyFolder.create({
            data: {
                name: data.name,
                type: data.type as any,
                liveClassId: String(data.ownerType) === 'LIVE_CLASS' ? data.ownerId : (data as any).liveClassId,
                vodPackageId: String(data.ownerType) === 'COURSE_VOD' ? data.ownerId : (data as any).vodPackageId,
                ownerType: data.ownerType as any,
            } as any,
        });
    }

    /**
     * @param deliveryScopeId Tuỳ chọn — UUID của **LiveClass** hoặc **VodPackage** (instance giao hàng).
     * Không truyền **Cohort.id**: ghi danh/enrollment không trỏ cohort; cohort chỉ là nhóm các live class trong kỳ.
     */
    async getFoldersForLearner(userId: string, role?: string, deliveryScopeId?: string) {
        // Privileged roles can see all class folders
        const isPrivileged = role && ['admin', 'lecturer', 'staff-academic', 'staff-operations'].includes(role);

        let liveClassIds: string[] = [];
        let vodPackageIds: string[] = [];

        if (isPrivileged) {
            if (deliveryScopeId) {
                liveClassIds = [deliveryScopeId];
                vodPackageIds = [deliveryScopeId];
            } else {
                // If no deliveryScopeId, privileged users see folders for all classes
                const classes = await this.prisma.liveClass.findMany({ select: { id: true } });
                liveClassIds = classes.map(c => c.id);
                const vods = await this.prisma.vodPackage.findMany({ select: { id: true } });
                vodPackageIds = vods.map(v => v.id);
            }
        } else {
            // Get active/completed enrollments
            const enrollments = await this.prisma.enrollment.findMany({
                where: {
                    userId,
                    status: { in: ['ACTIVE', 'COMPLETED'] },
                },
                select: { liveClassId: true, vodPackageId: true },
            });

            const filtered = deliveryScopeId
                ? enrollments.filter(e => e.liveClassId === deliveryScopeId || e.vodPackageId === deliveryScopeId)
                : enrollments;

            liveClassIds = filtered.map((e) => e.liveClassId).filter(Boolean) as string[];
            vodPackageIds = filtered.map((e) => e.vodPackageId).filter(Boolean) as string[];
        }

        const folders = await this.prisma.academyFolder.findMany({
            where: {
                OR: [
                    { liveClassId: { in: liveClassIds }, ownerType: 'LIVE_CLASS' },
                    { vodPackageId: { in: vodPackageIds }, ownerType: 'COURSE_VOD' }
                ]
            },
            include: {
                liveClass: {
                    select: { id: true, name: true, code: true },
                },
                vodPackage: {
                    select: { id: true, title: true, code: true },
                },
                _count: {
                    select: { resources: { where: { status: 'ACTIVE' } } },
                },
            },
        });

        return folders.map((f): AcademyFolderResponseDTO => ({
            folderId: f.id,
            folderName: f.name,
            type: f.type,
            liveClass: f.liveClass ? {
                id: f.liveClass.id,
                name: f.liveClass.name,
                code: f.liveClass.code,
            } : undefined,
            vodPackage: f.vodPackage ? {
                id: f.vodPackage.id,
                title: f.vodPackage.title,
                code: f.vodPackage.code,
            } : undefined,
            resourceCount: (f as any)._count.resources,
        }));
    }

    async getFoldersByOwner(ownerId: string, ownerType: string) {
        const folders = await this.prisma.academyFolder.findMany({
            where: {
                liveClassId: ownerType === 'LIVE_CLASS' ? ownerId : undefined,
                vodPackageId: ownerType === 'COURSE_VOD' ? ownerId : undefined,
                ownerType: ownerType as any,
            },
            include: {
                _count: {
                    select: { resources: { where: { status: 'ACTIVE' } } },
                },
            },
        });

        return folders.map((f): AcademyFolderResponseDTO => ({
            folderId: f.id,
            folderName: f.name,
            type: f.type,
            resourceCount: (f as any)._count.resources,
        }));
    }

    async getFolderById(id: string) {
        const folder = await this.prisma.academyFolder.findUnique({
            where: { id },
            include: { liveClass: true },
        });
        if (!folder) throw new NotFoundException('Folder not found');
        return folder;
    }

    async deleteFolder(id: string, userId: string) {
        const folder = await this.prisma.academyFolder.findUnique({ where: { id } });
        if (!folder) throw new NotFoundException('Folder not found');

        await this.prisma.academyFolder.delete({
            where: { id },
        });

        await this.audit.log({
            userId,
            action: 'DELETE_FOLDER',
            entity: 'AcademyFolder',
            entityId: id,
            description: `Deleted folder: ${folder.name}`,
            oldValues: folder,
        });

        return { ok: true };
    }


    // --- Resource Management ---

    async createResource(data: AcademyResourceCreateDTO, creatorId: string) {
        const resource = await this.prisma.academyResource.create({
            data: {
                folderId: data.folderId,
                fileAssetId: data.fileAssetId,
                externalUrl: data.externalUrl,
                title: data.title,
                description: data.description,
                resourceType: data.resourceType as any,
                visibility: data.visibility as any,
                sortOrder: data.sortOrder,
                createdBy: creatorId,
            },
        });

        await this.audit.log({
            userId: creatorId,
            action: 'CREATE_RESOURCE',
            entity: 'AcademyResource',
            entityId: resource.id,
            description: `Created resource: ${resource.title}`,
            newValues: resource,
        });

        return resource;
    }


    /** `deliveryScopeId` khi không có folderId: LiveClass.id hoặc VodPackage.id (không phải Cohort.id). */
    async getResourcesForLearner(data: { folderId?: string; deliveryScopeId?: string; userId: string; role?: string }) {
        let folderId = data.folderId;

        if (!folderId && data.deliveryScopeId) {
            const folder = await this.prisma.academyFolder.findFirst({
                where: { 
                    OR: [
                        { liveClassId: data.deliveryScopeId },
                        { vodPackageId: data.deliveryScopeId }
                    ]
                },
            });
            if (!folder) return [];
            folderId = folder.id;
        }

        if (!folderId) throw new BadRequestException('Folder or deliveryScopeId is required');

        const folder = await this.getFolderById(folderId);

        // Check enrollment if folder is linked to a live class
        const isPrivileged = data.role && ['admin', 'lecturer', 'staff-academic', 'staff-operations'].includes(data.role);

        if (!isPrivileged) {
            if (folder.liveClassId) {
                const enrollment = await this.prisma.enrollment.findFirst({
                    where: {
                        userId: data.userId,
                        liveClassId: folder.liveClassId,
                        status: { in: ['ACTIVE', 'COMPLETED'] },
                    },
                });
                if (!enrollment) {
                    throw new ForbiddenException('You are not enrolled in this class');
                }
            } else if (folder.vodPackageId) {
                const enrollment = await this.prisma.enrollment.findFirst({
                    where: {
                        userId: data.userId,
                        vodPackageId: folder.vodPackageId,
                        status: { in: ['ACTIVE', 'COMPLETED'] },
                    },
                });
                if (!enrollment) {
                    throw new ForbiddenException('You are not enrolled in this course');
                }
            }
        }

        const resources = await this.prisma.academyResource.findMany({
            where: {
                folderId,
                status: 'ACTIVE',
                visibility: isPrivileged ? undefined : { in: ['PUBLIC', 'ENROLLED_ONLY'] },
            },
            include: {
                fileAsset: true,
            },
            orderBy: { sortOrder: 'asc' },
        });

        const items = await Promise.all(resources.map(async (r): Promise<AcademyResourceResponseDTO> => {
            let downloadUrl = r.fileAsset?.fileUrl;

            // SPEC: Use signed URL for private files
            if (r.resourceType === 'FILE' && r.fileAssetId) {
                try {
                    const signed = await this.storageService.getSignedUrl({
                        fileId: r.fileAssetId,
                        expiresIn: 3600,
                    });
                    downloadUrl = signed.signedUrl;
                } catch (e) {
                    // Fallback to public URL if signed URL fails
                }
            }

            return {
                id: r.id,
                folderId: r.folderId,
                fileAssetId: r.fileAssetId || undefined,
                externalUrl: r.externalUrl || undefined,
                title: r.title,
                description: r.description || undefined,
                resourceType: r.resourceType,
                visibility: r.visibility,
                status: r.status,
                sortOrder: r.sortOrder,
                downloadUrl,
            };
        }));

        return items;
    }


    /** LiveClass.id hoặc VodPackage.id (delivery scope), không phải Cohort.id. */
    async getResourcesByDeliveryScopeId(deliveryScopeId: string, userId: string) {
        const folder = await this.prisma.academyFolder.findFirst({
            where: { 
                OR: [
                    { liveClassId: deliveryScopeId },
                    { vodPackageId: deliveryScopeId }
                ]
            },
        });
        if (!folder) return [];
        return this.getResourcesForLearner({ folderId: folder.id, userId });
    }

    async getResourcesByFolderId(folderId: string) {
        const resources = await this.prisma.academyResource.findMany({
            where: {
                folderId,
                status: 'ACTIVE',
            },
            include: {
                fileAsset: true,
            },
            orderBy: { sortOrder: 'asc' },
        });

        return resources.map((r): AcademyResourceResponseDTO => ({
            id: r.id,
            folderId: r.folderId,
            fileAssetId: r.fileAssetId || undefined,
            externalUrl: r.externalUrl || undefined,
            title: r.title,
            description: r.description || undefined,
            resourceType: r.resourceType,
            visibility: r.visibility,
            status: r.status,
            sortOrder: r.sortOrder,
            downloadUrl: r.fileAsset?.fileUrl,
        }));
    }

    async updateResource(id: string, data: AcademyResourceUpdateDTO, userId: string) {
        const oldResource = await this.prisma.academyResource.findUnique({ where: { id } });
        if (!oldResource) throw new NotFoundException('Resource not found');

        const resource = await this.prisma.academyResource.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                visibility: data.visibility as any,
                status: data.status,
                sortOrder: data.sortOrder,
            },
        });

        await this.audit.log({
            userId,
            action: 'UPDATE_RESOURCE',
            entity: 'AcademyResource',
            entityId: id,
            description: `Updated resource: ${resource.title}`,
            oldValues: oldResource,
            newValues: resource,
        });

        return resource;
    }


    async deleteResource(id: string, userId: string) {
        const resource = await this.prisma.academyResource.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });

        await this.audit.log({
            userId,
            action: 'DELETE_RESOURCE',
            entity: 'AcademyResource',
            entityId: id,
            description: `Archived (deleted) resource: ${resource.title}`,
            newValues: { status: 'ARCHIVED' },
        });

        return resource;
    }


    async getResourceDetail(id: string, userId: string, role?: string): Promise<AcademyResourceResponseDTO> {
        const resource = await this.prisma.academyResource.findUnique({
            where: { id },
            include: {
                folder: true,
                fileAsset: true,
            },
        });

        if (!resource) throw new NotFoundException('Resource not found');

        // Check enrollment if folder is linked to a live class
        const isPrivileged = role && ['admin', 'lecturer', 'staff-academic', 'staff-operations'].includes(role);

        if (!isPrivileged) {
            if (resource.folder.liveClassId) {
                const enrollment = await this.prisma.enrollment.findFirst({
                    where: {
                        userId,
                        liveClassId: resource.folder.liveClassId,
                        status: { in: ['ACTIVE', 'COMPLETED'] },
                    },
                });
                if (!enrollment) {
                    throw new ForbiddenException('You are not enrolled in this class');
                }
            } else if (resource.folder.vodPackageId) {
                const enrollment = await this.prisma.enrollment.findFirst({
                    where: {
                        userId,
                        vodPackageId: resource.folder.vodPackageId,
                        status: { in: ['ACTIVE', 'COMPLETED'] },
                    },
                });
                if (!enrollment) {
                    throw new ForbiddenException('You are not enrolled in this course');
                }
            }
        }

        // SPEC: Resource must be PUBLIC or ENROLLED_ONLY for learners
        if (resource.visibility === 'PRIVATE' && !isPrivileged) {
            throw new ForbiddenException('This resource is hidden');
        }
        if (resource.visibility === 'ENROLLED_ONLY' && (resource.folder.liveClassId || resource.folder.vodPackageId)) {
            // enrollment check already done above
        }

        let downloadUrl = resource.fileAsset?.fileUrl;

        // SPEC: Use signed URL for private files
        if (resource.resourceType === 'FILE' && resource.fileAssetId) {
            try {
                const signed = await this.storageService.getSignedUrl({
                    fileId: resource.fileAssetId,
                    expiresIn: 3600,
                });
                downloadUrl = signed.signedUrl;
            } catch (e) {
                // Fallback
            }
        }

        return {
            id: resource.id,
            folderId: resource.folderId,
            fileAssetId: resource.fileAssetId || undefined,
            externalUrl: resource.externalUrl || undefined,
            title: resource.title,
            description: resource.description || undefined,
            resourceType: resource.resourceType as any,
            visibility: resource.visibility as any,
            status: resource.status,
            sortOrder: resource.sortOrder,
            downloadUrl,
        };
    }

}
