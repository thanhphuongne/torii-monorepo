import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ResourceService } from '../src/modules/resource/resource.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { STORAGE_SERVICE_TOKEN } from '@server/academy/interfaces/services/i-storage.service';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockStorage: any;

  beforeEach(async () => {
    mockPrisma = {
      academyFolder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      liveClass: { findMany: jest.fn() },
      vodPackage: { findMany: jest.fn() },
      enrollment: { findMany: jest.fn(), findFirst: jest.fn() },
      academyResource: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => (typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb))),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockStorage = {
      getSignedUrl: jest.fn().mockResolvedValue({ signedUrl: 'http://signed/url' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLoggerService, useValue: mockAudit },
        { provide: STORAGE_SERVICE_TOKEN, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFolder', () => {
    it('should create a folder correctly', async () => {
      mockPrisma.academyFolder.create.mockResolvedValue({ id: 'f1', name: 'Folder 1' });
      const result = await service.createFolder({ name: 'Folder 1', type: 'GENERAL', ownerType: 'LIVE_CLASS', ownerId: 'c1' } as any);
      expect(mockPrisma.academyFolder.create).toHaveBeenCalled();
      expect(result.id).toBe('f1');
    });
  });

  describe('getFoldersForLearner', () => {
    it('should return folders for enrolled learner', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([{ liveClassId: 'c1' }]);
      mockPrisma.academyFolder.findMany.mockResolvedValue([
        { id: 'f1', name: 'F1', type: 'DOC', _count: { resources: 5 } }
      ]);

      const result = await service.getFoldersForLearner('u1');

      expect(mockPrisma.academyFolder.findMany).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({
              OR: expect.arrayContaining([expect.objectContaining({ liveClassId: { in: ['c1'] } })])
          })
      }));
      expect(result[0].resourceCount).toBe(5);
    });

    it('should return all folders for privileged users', async () => {
        mockPrisma.liveClass.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
        mockPrisma.vodPackage.findMany.mockResolvedValue([]);
        mockPrisma.academyFolder.findMany.mockResolvedValue([]);

        await service.getFoldersForLearner('u1', 'admin');

        expect(mockPrisma.liveClass.findMany).toHaveBeenCalled();
        expect(mockPrisma.academyFolder.findMany).toHaveBeenCalled();
    });
  });

  describe('createResource', () => {
    it('should create resource and log audit', async () => {
      mockPrisma.academyResource.create.mockResolvedValue({ id: 'r1', title: 'File' });
      await service.createResource({ folderId: 'f1', title: 'File', resourceType: 'FILE' } as any, 'u1');
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE_RESOURCE' }));
    });
  });

  describe('getResourcesForLearner', () => {
    it('should throw Forbidden if learner not enrolled', async () => {
      mockPrisma.academyFolder.findUnique.mockResolvedValue({ id: 'f1', liveClassId: 'c1' });
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.getResourcesForLearner({ folderId: 'f1', userId: 'u1' })).rejects.toThrow(ForbiddenException);
    });

    it('should return resources with signed URLs for enrolled learner', async () => {
      mockPrisma.academyFolder.findUnique.mockResolvedValue({ id: 'f1', liveClassId: 'c1' });
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'e1' });
      mockPrisma.academyResource.findMany.mockResolvedValue([
        { id: 'r1', title: 'T', resourceType: 'FILE', fileAssetId: 'asset1', fileAsset: { fileUrl: 'orig' } }
      ]);

      const result = await service.getResourcesForLearner({ folderId: 'f1', userId: 'u1' });

      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith({ fileId: 'asset1', expiresIn: 3600 });
      expect(result[0].downloadUrl).toBe('http://signed/url');
    });
  });

  describe('deleteResource', () => {
    it('should update status to ARCHIVED', async () => {
      mockPrisma.academyResource.update.mockResolvedValue({ id: 'r1', status: 'ARCHIVED' });
      await service.deleteResource('r1', 'u1');
      expect(mockPrisma.academyResource.update).toHaveBeenCalledWith({
          where: { id: 'r1' },
          data: { status: 'ARCHIVED' }
      });
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE_RESOURCE' }));
    });
  });
});
