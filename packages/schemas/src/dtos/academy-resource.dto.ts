import { z } from 'zod';
import { AcademyFolderType, AcademyFolderOwnerType, AcademyResourceType, AcademyResourceVisibility } from '../enums/academy.enum';

export const academyFolderCreateDTOSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.nativeEnum(AcademyFolderType).default(AcademyFolderType.LIVE_CLASS_SHARED),
    ownerId: z.string().uuid(),
    ownerType: z.nativeEnum(AcademyFolderOwnerType).default(AcademyFolderOwnerType.SYSTEM),
    liveClassId: z.string().uuid().optional().nullable(),
    vodPackageId: z.string().uuid().optional().nullable(),
});
export type AcademyFolderCreateDTO = z.infer<typeof academyFolderCreateDTOSchema>;

export const academyFolderUpdateDTOSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    status: z.string().optional(),
});
export type AcademyFolderUpdateDTO = z.infer<typeof academyFolderUpdateDTOSchema>;

export const academyResourceCreateDTOSchema = z.object({
    folderId: z.string().uuid(),
    fileAssetId: z.string().uuid().optional().nullable(),
    externalUrl: z.string().url().optional().nullable(),
    title: z.string().min(1).max(255),
    description: z.string().optional().nullable(),
    resourceType: z.nativeEnum(AcademyResourceType),
    visibility: z.nativeEnum(AcademyResourceVisibility).default(AcademyResourceVisibility.ENROLLED_ONLY),
    sortOrder: z.number().int().default(0),
});
export type AcademyResourceCreateDTO = z.infer<typeof academyResourceCreateDTOSchema>;

export const academyResourceUpdateDTOSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional().nullable(),
    visibility: z.nativeEnum(AcademyResourceVisibility).optional(),
    status: z.string().optional(),
    sortOrder: z.number().int().optional(),
});
export type AcademyResourceUpdateDTO = z.infer<typeof academyResourceUpdateDTOSchema>;

// Response DTOs
export interface AcademyFolderResponseDTO {
    folderId: string;
    folderName: string;
    type: string;
    liveClass?: {
        id: string;
        name: string;
        code: string;
    };
    vodPackage?: {
        id: string;
        title: string;
        code: string;
    };
    resourceCount: number;
}

export interface AcademyResourceResponseDTO {
    id: string;
    folderId: string;
    fileAssetId?: string;
    externalUrl?: string;
    title: string;
    description?: string;
    resourceType: string;
    visibility: string;
    status: string;
    sortOrder: number;
    downloadUrl?: string;
}
