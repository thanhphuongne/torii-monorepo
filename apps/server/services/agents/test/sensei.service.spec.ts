import { Test, TestingModule } from '@nestjs/testing';
import { SenseiService } from '../src/modules/sensei/sensei.service';
import { FastMcpService } from '../src/fastmcp/fastmcp.service';
import { PrismaService } from '@server/shared';
import { AIUsageTrackingService } from '../src/modules/analytics/ai-usage-tracking.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { of } from 'rxjs';

describe('SenseiService', () => {
  let service: SenseiService;
  let mockFastMcp: any;
  let mockPrisma: any;
  let mockUsage: any;
  let mockAnalytics: any;
  let mockNats: any;
  let handlers: Record<string, Function> = {};

  beforeEach(async () => {
    mockFastMcp = {
      addTool: jest.fn(),
      callTool: jest.fn(),
      getUserContext: jest.fn(),
      loadPromptTemplate: jest.fn().mockReturnValue(() => 'prompt'),
      callGeminiWithSchema: jest.fn().mockResolvedValue({ data: {}, usage: {} }),
    };

    mockPrisma = {
      courseProfile: { findMany: jest.fn() },
      lesson: { findMany: jest.fn() },
    };

    mockUsage = {
      updateAITextChatUsage: jest.fn(),
      getUsage: jest.fn().mockResolvedValue({}),
    };

    mockAnalytics = {
      createAIUsageArtifacts: jest.fn().mockResolvedValue(undefined),
    };

    mockNats = {
      send: jest.fn().mockReturnValue(of({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SenseiService,
        { provide: FastMcpService, useValue: mockFastMcp },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AIUsageTrackingService, useValue: mockUsage },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: 'NATS_SERVICE', useValue: mockNats },
      ],
    }).compile();

    service = module.get<SenseiService>(SenseiService);
  });

  describe('onModuleInit', () => {
    it('should register tools when module inits', () => {
      // @ts-ignore
      const spy = jest.spyOn(service, 'registerTools');
      service.onModuleInit();
      expect(spy).toHaveBeenCalled();
      expect(mockFastMcp.addTool).toHaveBeenCalled();
    });
  });

  describe('tool handlers', () => {
    beforeEach(async () => {
      mockFastMcp.addTool.mockImplementation((name, desc, schema, handler) => {
        handlers[name] = handler;
      });
      // @ts-ignore
      service.registerTools();
    });

    it('should check grammar via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { corrected: 'ok' },
        usage: { totalTokenCount: 1 },
      });
      const result = await handlers['sensei_check_grammar']({
        userId: 'u1',
        text: 'hi',
      });
      expect(result.corrected).toBe('ok');
    });

    it('should handle translation via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { translatedText: 'xin chào' },
        usage: { totalTokenCount: 5 },
      });
      const result = await handlers['sensei_translate']({
        userId: 'u1',
        text: 'hello',
        sourceLanguage: 'en',
        targetLanguage: 'vi',
      });
      expect(result.translatedText).toBe('xin chào');
      expect(mockUsage.updateAITextChatUsage).toHaveBeenCalled();
    });

    it('should handle flashcard creation via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { term: 'Neko' },
        usage: { totalTokenCount: 5 },
      });
      const result = await handlers['sensei_create_flashcard']({
        userId: 'u1',
        topic: 'Animals',
        level: 'N5',
      });
      expect(result.term).toBe('Neko');
    });

    it('should handle flashcard autofill via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { definition: 'Cat' },
        usage: { totalTokenCount: 5 },
      });
      const result = await handlers['sensei_autofill_flashcard']({
        userId: 'u1',
        term: '猫',
      });
      expect(result.definition).toBe('Cat');
    });

    it('should handle conversation simulation via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { dialogue: [] },
        usage: { totalTokenCount: 10 },
      });
      const result = await handlers['sensei_simulate_conversation']({
        userId: 'u1',
        scenario: 'restaurant',
        level: 'N4',
        turns: 4,
      });
      expect(result.dialogue).toBeDefined();
    });

    it('should handle general chat via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { response: 'Hello user' },
        usage: { totalTokenCount: 5 },
      });
      const result = await handlers['sensei_chat']({
        userId: 'u1',
        message: 'Hi',
        history: [],
      });
      expect(result.response).toBe('Hello user');
    });

    it('should recommend resources via tool with hybrid search', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockPrisma.courseProfile.findMany.mockResolvedValue([
        { id: 'c1', title: 'Course', level: 'N5' },
      ]);
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { recommendations: [] },
        usage: { totalTokenCount: 1 },
      });

      const result = await handlers['sensei_recommend_resources']({
        userId: 'u1',
        topic: 'JLPT',
        resourceType: 'all',
        level: 'N5',
      });
      expect(result.recommendations).toBeDefined();
      expect(mockPrisma.courseProfile.findMany).toHaveBeenCalled();
    });

    it('should recommend resources even if DB search returns nothing', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockPrisma.courseProfile.findMany.mockResolvedValue([]);
      mockPrisma.lesson.findMany.mockResolvedValue([]);
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { recommendations: [{ title: 'External book' }] },
        usage: { totalTokenCount: 1 },
      });

      const result = await handlers['sensei_recommend_resources']({
        userId: 'u1',
        topic: 'Quantum Physics',
        resourceType: 'all',
      });
      expect(result.recommendations[0].title).toBe('External book');
    });

    it('should handle roleplay turn via tool', async () => {
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { response: 'Sensei hi' },
        usage: { totalTokenCount: 10 },
      });
      const result = await handlers['sensei_roleplay']({
        userId: 'u1',
        topic: 'Food',
        message: 'Hello',
        history: [],
      });
      expect(result.response).toBe('Sensei hi');
      expect(mockUsage.updateAITextChatUsage).toHaveBeenCalled();
    });

    it('should handle final turn with artifacts logic', async () => {
      jest.useFakeTimers();
      mockFastMcp.getUserContext.mockResolvedValue({});
      mockFastMcp.callGeminiWithSchema.mockResolvedValue({
        data: { response: 'Final' },
        usage: { totalTokenCount: 10 },
      });
      mockUsage.getUsage.mockResolvedValue({ total_roleplay_tokens: 100 });

      const result = await handlers['sensei_roleplay']({
        userId: 'u1',
        topic: 'Cooking',
        message: 'Bye',
        history: [],
        isFinal: true,
      });
      expect(result.response).toBe('Final');

      jest.runAllTimers();
      expect(mockAnalytics.createAIUsageArtifacts).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('delegation to tools', () => {
    it('should call checkGrammar tool', async () => {
      mockFastMcp.callTool.mockResolvedValue({ corrected: 'text' });
      const result = await service.checkGrammar({ sub: 'u1' } as any, 'hi');
      expect(result.corrected).toBe('text');
      expect(mockFastMcp.callTool).toHaveBeenCalledWith('sensei_check_grammar', { userId: 'u1', text: 'hi' });
    });

    it('should call translate tool', async () => {
      await service.translate({ sub: 'u1' } as any, 'hi', 'en', 'ja');
      expect(mockFastMcp.callTool).toHaveBeenCalledWith('sensei_translate', { userId: 'u1', text: 'hi', sourceLanguage: 'en', targetLanguage: 'ja' });
    });

    it('should call simulateConversation tool', async () => {
      await service.simulateConversation({ sub: 'u1' } as any, 'restaurant', 'N4', 5);
      expect(mockFastMcp.callTool).toHaveBeenCalledWith('sensei_simulate_conversation', { userId: 'u1', scenario: 'restaurant', level: 'N4', turns: 5 });
    });

    it('should call recommendResources tool', async () => {
      await service.recommendResources({ sub: 'u1' } as any, 'JLPT', 'video', 'N5');
      expect(mockFastMcp.callTool).toHaveBeenCalledWith('sensei_recommend_resources', { userId: 'u1', topic: 'JLPT', resourceType: 'video', level: 'N5' });
    });
  });

});
