import { Test, TestingModule } from '@nestjs/testing';
import { BlogAnalyticsService } from '../src/modules/blog/blog-analytics.service';
import { PrismaService } from '@server/shared/prisma/prisma.service';

describe('BlogAnalyticsService', () => {
  let service: BlogAnalyticsService;
  let mockPrisma: any;
  let mockNats: any;

  beforeEach(async () => {
    mockPrisma = {
      blog: {
        findMany: jest.fn(),
      },
      comment: {
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    mockNats = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: 'NATS_SERVICE',
          useValue: mockNats,
        },
      ],
    }).compile();

    service = module.get<BlogAnalyticsService>(BlogAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDailyBlogInteractionStats', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0];

    it('should generate stats and emit notification when comments > 0', async () => {
      const mockBlogs = [
        { id: 'b1', title: 'Blog 1', authorId: 'a1', publishedAt: yesterday },
      ];
      mockPrisma.blog.findMany.mockResolvedValue(mockBlogs);
      mockPrisma.$queryRaw.mockResolvedValue([]); // No existing notification
      mockPrisma.comment.count.mockResolvedValue(5);

      await service.generateDailyBlogInteractionStats();

      expect(mockNats.emit).toHaveBeenCalledWith(
        { cmd: 'send_notification' },
        expect.objectContaining({
          recipientId: 'a1',
          payload: expect.objectContaining({
            metadata: expect.objectContaining({
              blogId: 'b1',
              commentCount: 5,
            }),
          }),
        })
      );
    });

    it('should skip blog if notification already exists', async () => {
      const mockBlogs = [
        { id: 'b1', title: 'Blog 1', authorId: 'a1', publishedAt: yesterday },
      ];
      mockPrisma.blog.findMany.mockResolvedValue(mockBlogs);
      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'notif1' }]); // Existing notification

      await service.generateDailyBlogInteractionStats();

      expect(mockPrisma.comment.count).not.toHaveBeenCalled();
      expect(mockNats.emit).not.toHaveBeenCalled();
    });

    it('should skip blog if no comments found', async () => {
      const mockBlogs = [
        { id: 'b1', title: 'Blog 1', authorId: 'a1', publishedAt: yesterday },
      ];
      mockPrisma.blog.findMany.mockResolvedValue(mockBlogs);
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.comment.count.mockResolvedValue(0);

      await service.generateDailyBlogInteractionStats();

      expect(mockNats.emit).not.toHaveBeenCalled();
    });

    it('should continue to next blog if one blog processing fails', async () => {
      const mockBlogs = [
        { id: 'b1', title: 'Blog 1', authorId: 'a1', publishedAt: yesterday },
        { id: 'b2', title: 'Blog 2', authorId: 'a2', publishedAt: yesterday },
      ];
      mockPrisma.blog.findMany.mockResolvedValue(mockBlogs);
      
      // First blog fails
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB Error'));
      // Second blog succeeds
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      mockPrisma.comment.count.mockResolvedValue(3);

      await service.generateDailyBlogInteractionStats();

      // Verify that NATS emit was called for the second blog
      expect(mockNats.emit).toHaveBeenCalledWith(
        { cmd: 'send_notification' },
        expect.objectContaining({ recipientId: 'a2' })
      );
    });
  });
});
