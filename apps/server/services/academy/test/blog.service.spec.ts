import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getMapperToken } from '@automapper/nestjs';
import { BlogService } from '../src/modules/blog/blog.service';
import { BlogRepository } from '@server/academy/modules/blog/blog.repository';
import { PrismaService, REDIS_CLIENT } from '@server/shared';
import { AuditLoggerService } from '../src/modules/audit-logger.service';
import { BlogStatus } from '@workspace/schemas';

describe('BlogService', () => {
  let service: BlogService;
  let mockRepository: any;
  let mockPrisma: any;
  let mockMapper: any;
  let mockRedis: any;
  let mockAudit: any;

  beforeEach(async () => {
    mockRepository = {
      slugExists: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      incrementViewCount: jest.fn(),
    };

    mockPrisma = {
      user: { findUnique: jest.fn() },
    };

    mockMapper = {
      map: jest.fn().mockImplementation((blog) => ({ ...blog })),
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: BlogRepository, useValue: mockRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getMapperToken(), useValue: mockMapper },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: AuditLoggerService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBlog', () => {
    it('should throw if author not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createBlog({ authorId: 'a1', title: 'T', content: 'C' })).rejects.toThrow(NotFoundException);
    });

    it('should handle slug collision by appending timestamp', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'a1' });
      mockRepository.slugExists.mockResolvedValue(true); // Collides first time
      mockRepository.create.mockResolvedValue({ id: 'b1', title: 'T', slug: 'collided' });

      await service.createBlog({ authorId: 'a1', title: 'T', content: 'C' });
      
      // Should have checked slug multiple times (with date then with timestamp)
      expect(mockRepository.slugExists).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should automatically set status to SCHEDULED if publishedAt is in future', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'a1' });
        mockRepository.slugExists.mockResolvedValue(false);
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        mockRepository.create.mockResolvedValue({ id: 'b1', title: 'T', status: BlogStatus.SCHEDULED });

        await service.createBlog({ 
            authorId: 'a1', title: 'T', content: 'C', 
            status: BlogStatus.PUBLISHED, 
            publishedAt: futureDate 
        });

        expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            status: BlogStatus.SCHEDULED
        }));
    });
  });

  describe('findBlogById', () => {
    it('should throw NotFound for future scheduled posts if not showScheduled', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      mockRepository.findById.mockResolvedValue({ 
          id: 'b1', status: BlogStatus.SCHEDULED, publishedAt: futureDate 
      });

      await expect(service.findBlogById('b1', false)).rejects.toThrow(NotFoundException);
    });

    it('should return blog for future scheduled posts if showScheduled is true', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        mockRepository.findById.mockResolvedValue({ 
            id: 'b1', status: BlogStatus.SCHEDULED, publishedAt: futureDate 
        });
  
        const result = await service.findBlogById('b1', true);
        expect(result.id).toBe('b1');
      });
  });

  describe('incrementViewCount', () => {
    it('should throttle views from same IP within timeout', async () => {
      mockRepository.findById.mockResolvedValue({ id: 'b1', status: BlogStatus.PUBLISHED });
      mockRedis.get.mockResolvedValue('1'); // throttled

      await service.incrementViewCount('b1', '1.1.1.1');

      expect(mockRepository.incrementViewCount).not.toHaveBeenCalled();
    });

    it('should increment and set redis key if not throttled', async () => {
        mockRepository.findById.mockResolvedValue({ id: 'b1', status: BlogStatus.PUBLISHED });
        mockRedis.get.mockResolvedValue(null);
  
        await service.incrementViewCount('b1', '1.1.1.1');
  
        expect(mockRepository.incrementViewCount).toHaveBeenCalledWith('b1');
        expect(mockRedis.set).toHaveBeenCalled();
      });
  });

  describe('updateBlog', () => {
    it('should regenerate slug if title changes', async () => {
      const existing = { id: 'b1', title: 'Old', slug: 'old-slug', authorId: 'a1' };
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.findBySlug.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue({ ...existing, title: 'New', slug: 'new-slug' });

      await service.updateBlog('b1', { title: 'New' });

      expect(mockRepository.update).toHaveBeenCalledWith('b1', expect.objectContaining({
          slug: expect.stringContaining('new')
      }));
    });
  });
});
