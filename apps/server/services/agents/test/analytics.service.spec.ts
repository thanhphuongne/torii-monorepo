import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { FastMcpService } from '../src/fastmcp/fastmcp.service';
import { AIUsageTrackingService } from '../src/modules/analytics/ai-usage-tracking.service';
import { PrismaService, AppConfigService } from '@server/shared';
import Redis from 'ioredis';
import { of } from 'rxjs';

jest.mock('ioredis');

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockFastMcp: any;
  let mockUsage: any;
  let mockPrisma: any;
  let mockRedis: any;
  let mockNats: any;

  beforeEach(async () => {
    mockFastMcp = {
      addTool: jest.fn(),
      callTool: jest.fn(),
      getUserContext: jest.fn(),
      loadPromptTemplate: jest.fn().mockReturnValue(() => 'prompt'),
      loadResource: jest.fn(),
      callGemini: jest.fn().mockResolvedValue({ text: '{}', usage: {} }),
      callGeminiWithSchema: jest.fn().mockResolvedValue({ data: {}, usage: {} }),
      cleanJsonResponse: jest.fn().mockReturnValue({}),
    };

    mockUsage = {
      updateAITextChatUsage: jest.fn(),
      getUsage: jest.fn(),
      deleteUsage: jest.fn(),
    };

    mockPrisma = {
      roomInfo: { findFirst: jest.fn(), create: jest.fn() },
      roomArtifact: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    mockNats = {
      emit: jest.fn(),
      send: jest.fn().mockReturnValue(of({})),
    };

    mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
      status: 'ready',
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: FastMcpService, useValue: mockFastMcp },
        { provide: AIUsageTrackingService, useValue: mockUsage },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppConfigService, useValue: { insights: { services: {} } } },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    // @ts-ignore
    service.redis = mockRedis;
  });

  describe('onModuleInit', () => {
    it('should register tools on init', async () => {
      // @ts-ignore
      const registerSpy = jest.spyOn(service, 'registerTools');
      await service.onModuleInit();
      expect(registerSpy).toHaveBeenCalled();
      expect(mockFastMcp.addTool).toHaveBeenCalled();
    });

    it('should log warning but continue if Redis connection fails', async () => {
      mockRedis.connect.mockRejectedValue(new Error('Connection failed'));
      // @ts-ignore
      const loggerSpy = jest.spyOn(service.logger, 'warn');

      await service.onModuleInit();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Redis connection failed'));
    });
  });

  describe('tool handlers', () => {
    let handlers: Record<string, Function> = {};
    
    beforeEach(async () => {
      mockFastMcp.addTool.mockImplementation((name, desc, schema, handler) => {
        handlers[name] = handler;
      });
      // @ts-ignore
      service.registerTools();
    });

    it('should track progress via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGemini.mockResolvedValue({ text: '{}', usage: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 } });
      
      const result = await handlers['analytics_track_progress']({ userId: 'u1', timeframe: 'month' });
      
      expect(mockFastMcp.getUserContext).toHaveBeenCalledWith('u1');
      expect(mockUsage.updateAITextChatUsage).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should suggest study path via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.loadResource.mockReturnValue({ N5: {} });
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({ data: { path: [] }, usage: { totalTokenCount: 10 } });

      const result = await handlers['analytics_suggest_study_path']({ userId: 'u1', targetLevel: 'N5' });
      expect(result.path).toBeDefined();
      expect(mockFastMcp.loadResource).toHaveBeenCalledWith('jlpt-syllabus.json');
    });

    it('should get readiness profile via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockNats.send.mockReturnValue(of({ metrics: {} }));
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({ data: { score: 80 }, usage: { totalTokenCount: 10 } });

      const result = await handlers['analytics_get_readiness_profile']({ userId: 'u1', targetLevel: 'N5' });
      expect(result.score).toBe(80);
      expect(mockNats.send).toHaveBeenCalledWith({ cmd: 'learning.readinessMetrics' }, { userId: 'u1' });
    });

    it('should handle NATS failure in readiness profile tool gracefully', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      const { throwError } = require('rxjs');
      mockNats.send.mockReturnValue(throwError(() => new Error('NATS error')));
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({ data: { score: 0 }, usage: { totalTokenCount: 0 } });

      const result = await handlers['analytics_get_readiness_profile']({ userId: 'u1', targetLevel: 'N5' });
      expect(result.score).toBe(0);
    });

    it('should generate report via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGemini.mockResolvedValue({
        text: '{"summary": "ok"}',
        usage: { totalTokenCount: 10 },
      });
      mockFastMcp.cleanJsonResponse.mockReturnValue({ summary: 'ok' });

      const result = await handlers['analytics_generate_report']({
        userId: 'u1',
        reportType: 'comprehensive',
        timeframe: 'month',
      });
      expect(result.summary).toBe('ok');
    });
  });

  describe('generateAndSaveSnapshot', () => {
    it('should call tools and save result to cache', async () => {
      mockFastMcp.callTool.mockResolvedValue({ result: 'data' });
      const result = await service.generateAndSaveSnapshot({ sub: 'u1' } as any, 'N5');

      expect(mockFastMcp.callTool).toHaveBeenCalledTimes(3);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(result.targetLevel).toBe('N5');
    });

    it('should proceed even if Redis setCache fails', async () => {
      mockFastMcp.callTool.mockResolvedValue({ result: 'data' });
      mockRedis.set.mockRejectedValue(new Error('Redis Down'));
      
      const result = await service.generateAndSaveSnapshot({ sub: 'u1' } as any, 'N5');
      expect(result.targetLevel).toBe('N5');
    });

    it('should throw if one of the tool calls fails', async () => {
      mockFastMcp.callTool
        .mockResolvedValueOnce({}) // progress
        .mockRejectedValueOnce(new Error('Tool failed')) // study path
        .mockResolvedValueOnce({}); // profile

      await expect(
        service.generateAndSaveSnapshot({ sub: 'u1' } as any, 'N5'),
      ).rejects.toThrow('Tool failed');
    });
  });

  describe('cache operations', () => {
    it('should return snapshot from cache if exists', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ targetLevel: 'N5' }));
      const result = await service.getSnapshot({ sub: 'u1' } as any, 'N5');
      expect(result.snapshot?.targetLevel).toBe('N5');
      expect(result.isStale).toBe(false);
    });

    it('should return null if cache empty', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.getSnapshot({ sub: 'u1' } as any, 'N5');
      expect(result.snapshot).toBeNull();
      expect(result.isStale).toBe(true);
    });

    it('should return null if JSON parsing fails', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');
      const result = await service.getSnapshot({ sub: 'u1' } as any, 'N5');
      expect(result.snapshot).toBeNull();
    });
  });

  describe('generateAndSaveSnapshot', () => {
    it('should call tools and save result to cache', async () => {
      mockFastMcp.callTool.mockResolvedValue({ result: 'data' });
      const result = await service.generateAndSaveSnapshot({ sub: 'u1' } as any, 'N5');

      expect(mockFastMcp.callTool).toHaveBeenCalledTimes(3);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(result.targetLevel).toBe('N5');
    });
  });

  describe('createAIUsageArtifacts', () => {
    it('should create artifacts based on text usage', async () => {
      mockUsage.getUsage.mockResolvedValue({
        'u1:roleplay:total': 1000,
        'u1:roleplay:prompt': 500,
        'u1:roleplay:completion': 500,
      });

      mockPrisma.roomInfo.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.roomArtifact.create.mockResolvedValue({});

      await service.createAIUsageArtifacts('room-1', 'u1', 'text');

      expect(mockPrisma.roomArtifact.create).toHaveBeenCalled();
      expect(mockUsage.deleteUsage).toHaveBeenCalledWith('room-1');
    });

    it('should skip if no usage found', async () => {
      mockUsage.getUsage.mockResolvedValue({});
      await service.createAIUsageArtifacts('room-1', 'u1', 'voice');
      expect(mockPrisma.roomArtifact.create).not.toHaveBeenCalled();
    });

    it('should create voice duration artifact', async () => {
      mockUsage.getUsage.mockResolvedValue({ total_duration: 120 });
      mockPrisma.roomInfo.findFirst.mockResolvedValue({ id: 1 });

      await service.createAIUsageArtifacts('room-1', 'u1', 'voice');
      expect(mockPrisma.roomArtifact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'SYNTHESIZED_SPEECH_USAGE' }),
        }),
      );
    });

    it('should create a new system room if it does not exist', async () => {
      mockUsage.getUsage.mockResolvedValue({ total_duration: 120 });
      mockPrisma.roomInfo.findFirst.mockResolvedValue(null);
      mockPrisma.roomInfo.create.mockResolvedValue({ id: 999 });

      await service.createAIUsageArtifacts('room-1', 'u1', 'voice');

      expect(mockPrisma.roomInfo.create).toHaveBeenCalled();
      expect(mockPrisma.roomArtifact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roomTableId: 999 }),
        }),
      );
    });

    it('should handle translation task type correctly', async () => {
      mockUsage.getUsage.mockResolvedValue({
        'u1:translation:total': 100,
      });
      mockPrisma.roomInfo.findFirst.mockResolvedValue({ id: 1 });

      await service.createAIUsageArtifacts('room-1', 'u1', 'text');

      expect(mockPrisma.roomArtifact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'CHAT_TRANSLATION_USAGE' }),
        }),
      );
    });
  });
});
