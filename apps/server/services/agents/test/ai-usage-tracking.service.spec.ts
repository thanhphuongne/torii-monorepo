import { Test, TestingModule } from '@nestjs/testing';
import { AIUsageTrackingService } from '../src/modules/analytics/ai-usage-tracking.service';
import { REDIS_CLIENT } from '@server/shared';

describe('AIUsageTrackingService', () => {
  let service: AIUsageTrackingService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      pipeline: jest.fn().mockReturnValue({
        hincrby: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      hgetall: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIUsageTrackingService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AIUsageTrackingService>(AIUsageTrackingService);
  });

  describe('updateAITextChatUsage', () => {
    it('should update Redis using a pipeline', async () => {
      const pipeline = mockRedis.pipeline();
      mockRedis.pipeline.mockReturnValue(pipeline);

      await service.updateAITextChatUsage('room-1', 'user-1', 'chat', 10, 20, 30);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(pipeline.hincrby).toHaveBeenCalledWith(expect.any(String), 'user-1:chat:prompt', 10);
      expect(pipeline.hincrby).toHaveBeenCalledWith(expect.any(String), 'user-1:chat:completion', 20);
      expect(pipeline.hincrby).toHaveBeenCalledWith(expect.any(String), 'user-1:chat:total', 30);
      expect(pipeline.hincrby).toHaveBeenCalledWith(expect.any(String), 'total_chat_prompt_tokens', 10);
      expect(pipeline.expire).toHaveBeenCalled();
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should throw error if pipeline execution fails', async () => {
      const pipeline = mockRedis.pipeline();
      pipeline.exec.mockRejectedValue(new Error('Redis pipeline error'));
      mockRedis.pipeline.mockReturnValue(pipeline);

      await expect(
        service.updateAITextChatUsage('room-1', 'user-1', 'chat', 10, 20, 30),
      ).rejects.toThrow('Redis pipeline error');
    });
  });

  describe('getUsage', () => {
    it('should return parsed usage mapping', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'user-1:chat:total': '100',
        'total_chat_tokens': '500',
      });

      const result = await service.getUsage('room-1');
      expect(result).toEqual({
        'user-1:chat:total': 100,
        'total_chat_tokens': 500,
      });
    });

    it('should handle non-numeric values gracefully', async () => {
      mockRedis.hgetall.mockResolvedValue({
        'invalid': 'abc',
      });
      const result = await service.getUsage('room-1');
      expect(result['invalid']).toBe(0);
    });

    it('should return empty object if Redis hgetall returns empty', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      const result = await service.getUsage('room-1');
      expect(result).toEqual({});
    });
  });

  describe('deleteUsage', () => {
    it('should delete keys from Redis', async () => {
      await service.deleteUsage('room-1');
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('room-1'));
    });
  });
});
