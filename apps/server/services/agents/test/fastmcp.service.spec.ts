import { Test, TestingModule } from '@nestjs/testing';
import { FastMcpService } from '../src/fastmcp/fastmcp.service';
import { PrismaService, AppConfigService } from '@server/shared';
import * as fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

jest.mock('fs');
jest.mock('@google/generative-ai');

describe('FastMcpService', () => {
  let service: FastMcpService;
  let mockPrisma: any;
  let mockAppConfig: any;
  let mockGenAI: any;

  beforeEach(async () => {
    mockPrisma = {
      enrollment: { findMany: jest.fn() },
      userLessonProgress: { findMany: jest.fn() },
      setCard: { findMany: jest.fn() },
      userGamification: { findUnique: jest.fn() },
      onboardingSurvey: { findUnique: jest.fn() },
    };

    mockAppConfig = {
      thirdParty: {
        gemini: {
          apiKey: 'test-api-key',
        },
      },
    };

    mockGenAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => '{"foo": "bar"}',
            usageMetadata: { totalTokenCount: 100 },
          },
        }),
      }),
    };

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => mockGenAI);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FastMcpService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AppConfigService, useValue: mockAppConfig },
      ],
    }).compile();

    service = module.get<FastMcpService>(FastMcpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tool management', () => {
    it('should register and call a tool', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const schema = z.object({ id: z.string() });
      service.addTool('test_tool', 'description', schema, handler);

      const result = await service.callTool('test_tool', { id: '1' });
      expect(result).toBe('ok');
      expect(handler).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw if tool not found', async () => {
      await expect(service.callTool('none', {})).rejects.toThrow('Tool not found');
    });
  });

  describe('callGemini', () => {
    it('should call gemini and return text and usage', async () => {
      const result = await service.callGemini('hello');
      expect(result.text).toBe('{"foo": "bar"}');
      expect(result.usage.totalTokenCount).toBe(100);
    });

    it('should throw error if Gemini API fails', async () => {
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: jest.fn().mockRejectedValue(new Error('API Failure')),
      });
      await expect(service.callGemini('hello')).rejects.toThrow('Gemini API Error: API Failure');
    });

    it('should throw if api key missing', async () => {
      // Re-init service without API key
      const badConfig = { thirdParty: { gemini: { apiKey: '' } } };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FastMcpService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: AppConfigService, useValue: badConfig },
        ],
      }).compile();
      const badService = module.get<FastMcpService>(FastMcpService);
      await expect(badService.callGemini('hi')).rejects.toThrow('Gemini API Key is missing');
    });
  });

  describe('cleanJsonResponse', () => {
    it('should strip code blocks and parse JSON', () => {
      const input = 'Here is the data: ```json {"a": 1} ```';
      const result = service.cleanJsonResponse(input);
      expect(result).toEqual({ a: 1 });
    });

    it('should return error object on malformed JSON', () => {
      const result = service.cleanJsonResponse('invalid data');
      expect(result).toHaveProperty('error');
    });

    it('should find nested JSON object in text', () => {
      const input = 'Random text { "key": "value" } more random text';
      const result = service.cleanJsonResponse(input);
      expect(result).toEqual({ key: 'value' });
    });
  });

  describe('callGeminiWithSchema', () => {
    it('should validate response against schema and return data', async () => {
      const schema = z.object({ foo: z.string() });
      const result = await service.callGeminiWithSchema('prompt', schema);
      expect(result.data).toEqual({ foo: 'bar' });
    });

    it('should retry if validation fails', async () => {
      const schema = z.object({ baz: z.number() });
      // After retry it should throw.
      await expect(service.callGeminiWithSchema('prompt', schema, { maxRetries: 1 }))
        .rejects.toThrow('AI output schema validation failed after 2 attempts');
    });

    it('should succeed if retry succeeds', async () => {
      const schema = z.object({ foo: z.string() });
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => '{"invalid": "data"}',
            usageMetadata: { totalTokenCount: 50 },
          },
        }),
      }).mockReturnValueOnce({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => '{"foo": "valid"}',
            usageMetadata: { totalTokenCount: 50 },
          },
        }),
      });

      const result = await service.callGeminiWithSchema('prompt', schema, { maxRetries: 1 });
      expect(result.data).toEqual({ foo: 'valid' });
    });
  });

  describe('getUserContext', () => {
    it('should fetch all relevant user data from DB', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { liveClass: { cohort: { courseProfile: { title: 'N5', level: 'N5' } } } }
      ]);
      const now = new Date();
      mockPrisma.userLessonProgress.findMany.mockResolvedValue([
        { updatedAt: now, isCompleted: true }
      ]);
      mockPrisma.userGamification.findUnique.mockResolvedValue({ level: 5, currentStreak: 3, totalXp: 500 });
      mockPrisma.setCard.findMany.mockResolvedValue([
        { term: 'test', definition: 'def', languageDetails: { kanji: 'kanji', furigana: 'furi' } }
      ]);
      const onboardingDate = new Date();
      mockPrisma.onboardingSurvey.findUnique.mockResolvedValue({
        targetCompletionTime: '3 months',
        purpose: 'study',
        jlptTargetDate: onboardingDate,
        studyFrequency: 'daily',
        studyTimePerSession: '1h',
        currentLevel: 'N5'
      });

      const context = await service.getUserContext('u1');
      expect(context.userId).toBe('u1');
      expect(context.enrolledCourses).toContain('N5');
      expect(context.jlptLevels).toContain('N5');
      expect(context.stats?.level).toBe(5);
      expect(context.recentActivity[0].lessons).toBe(1);
      expect(context.recentVocabulary[0].word).toBe('kanji');
      expect(context.onboarding?.purpose).toBe('study');
      expect(context.onboarding?.jlptTargetDate).toBe(onboardingDate.toISOString());
    });

    it('should handle missing user data gracefully', async () => {
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockPrisma.userGamification.findUnique.mockResolvedValue(null);
      const context = await service.getUserContext('u1');
      expect(context.userId).toBe('u1');
    });
  });

  describe('resource loading', () => {
    it('should throw if template not found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(() => service.loadPromptTemplate('none')).toThrow('Template not found');
    });

    it('should load template if file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('Hello {{name}}');
      const template = service.loadPromptTemplate('test.md');
      expect(template({ name: 'User' })).toBe('Hello User');
    });
  });
});
