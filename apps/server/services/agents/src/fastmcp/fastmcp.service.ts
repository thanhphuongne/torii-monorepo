import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, AppConfigService } from '@server/shared';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'fs';
import { join, sep, dirname } from 'path';
import { z } from 'zod';

export interface ToolContext {
  userId: string;
  enrolledCourses?: string[];
  jlptLevels?: string[];
  aiMetadata?: any[];
  recentActivity?: { date: string; lessons: number; averageScore: number }[];
  commonErrors?: any[];
  recentVocabulary?: any[];
  stats?: { level: number; streak: number; totalXp: number } | null;
  onboarding?: {
    jlptTarget?: string;
    currentLevel?: string;
  } | null;
}

/**
 * FastMCP Service - Generic AI Client & Prompt Engine
 *
 * Responsibilities:
 * - Managed Gemini API connection
 * - Prompt Template loading & rendering
 * - Response parsing/cleaning
 * - User Context retrieval (shared)
 */
@Injectable()
export class FastMcpService {
  private readonly logger = new Logger(FastMcpService.name);
  private toolRegistry = new Map<string, { schema: any; handler: Function }>();
  private genAI: GoogleGenerativeAI;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.registerHandlebarsHelpers();

    // Priority: 1. Config (YAML), 2. Environment Variable
    const apiKey =
      this.appConfig.thirdParty.gemini.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not set in config.yaml or .env!');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  // ==================== TOOL REGISTRY ====================

  public addTool(
    name: string,
    description: string,
    schema: any,
    handler: Function,
  ) {
    this.logger.debug(`🛠️ Registering Tool: ${name}`);

    // Register internally (for NATS execution)
    this.toolRegistry.set(name, { schema, handler });
  }

  public async callTool(name: string, args: any): Promise<any> {
    const tool = this.toolRegistry.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Optional: We could validate 'args' against 'tool.schema' here using Zod
    // const validatedArgs = tool.schema.parse(args);

    this.logger.debug(`▶️ Executing Tool: ${name}`);
    return tool.handler(args);
  }

  // ==================== PUBLIC HELPERS ====================

  public loadPromptTemplate(templatePath: string): HandlebarsTemplateDelegate {
    const searchDirs = [__dirname, process.cwd()];
    const rootPath = join(sep);

    for (const startDir of searchDirs) {
      let currentDir = startDir;
      for (let i = 0; i < 15; i++) {
        const pathsToTry = [
          // 1. Assets directly under currentDir (common in dist)
          join(currentDir, 'assets/prompts', templatePath),
          // 2. Src/Assets under currentDir (common in development)
          join(currentDir, 'src/assets/prompts', templatePath),
          // 3. Monorepo structure inside dist
          join(
            currentDir,
            'dist/services/agents/src/assets/prompts',
            templatePath,
          ),
          join(currentDir, 'services/agents/src/assets/prompts', templatePath),
          // 4. Nested monorepo path
          join(
            currentDir,
            'apps/server/services/agents/src/assets/prompts',
            templatePath,
          ),
        ];

        for (const p of pathsToTry) {
          if (existsSync(p)) {
            const content = readFileSync(p, 'utf-8');
            return Handlebars.compile(content);
          }
        }

        const parent = dirname(currentDir);
        if (parent === currentDir || currentDir === rootPath) break;
        currentDir = parent;
      }
    }

    this.logger.error(
      `Failed to load prompt template: ${templatePath}. Search reached root starting from ${__dirname} and ${process.cwd()}`,
    );
    throw new Error(`Template not found: ${templatePath}`);
  }

  public loadResource(resourcePath: string): any {
    const searchDirs = [__dirname, process.cwd()];
    const rootPath = join(sep);

    for (const startDir of searchDirs) {
      let currentDir = startDir;
      for (let i = 0; i < 15; i++) {
        const pathsToTry = [
          join(currentDir, 'assets/resources', resourcePath),
          join(currentDir, 'src/assets/resources', resourcePath),
          join(
            currentDir,
            'dist/services/agents/src/assets/resources',
            resourcePath,
          ),
          join(
            currentDir,
            'services/agents/src/assets/resources',
            resourcePath,
          ),
          join(
            currentDir,
            'apps/server/services/agents/src/assets/resources',
            resourcePath,
          ),
        ];

        for (const p of pathsToTry) {
          if (existsSync(p)) {
            const content = readFileSync(p, 'utf-8');
            return JSON.parse(content);
          }
        }

        const parent = dirname(currentDir);
        if (parent === currentDir || currentDir === rootPath) break;
        currentDir = parent;
      }
    }

    this.logger.error(
      `Failed to load resource: ${resourcePath}. Search reached root starting from ${__dirname} and ${process.cwd()}`,
    );
    return null;
  }

  public async callGemini(
    prompt: string,
    modelName = 'gemini-2.5-flash',
  ): Promise<{ text: string; usage: any }> {
    if (!this.genAI) {
      throw new Error('Gemini API Key is missing');
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });
      const result = await model.generateContent(prompt);
      const usage = result.response.usageMetadata;

      if (process.env.DEBUG_AI) {
        this.logger.debug(`AI Token Usage: ${JSON.stringify(usage)}`);
      }

      return {
        text: result.response.text(),
        usage: usage,
      };
    } catch (error: any) {
      this.logger.error(`Gemini API Error (${modelName}):`, error);
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  public async callGeminiMultimodal(
    prompt: string,
    mediaFiles: { mimeType: string; data: string }[],
    modelName = 'gemini-2.5-flash',
  ): Promise<{ text: string; usage: any }> {
    if (!this.genAI) {
      throw new Error('Gemini API Key is missing');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: modelName });

      const parts = [
        { text: prompt },
        ...mediaFiles.map((f) => ({
          inlineData: {
            mimeType: f.mimeType,
            data: f.data,
          },
        })),
      ];

      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
      const usage = result.response.usageMetadata;

      return {
        text: result.response.text(),
        usage: usage,
      };
    } catch (error: any) {
      this.logger.error(`Gemini Multimodal API Error (${modelName}):`, error);
      throw new Error(`Gemini Multimodal API Error: ${error.message}`);
    }
  }

  public cleanJsonResponse(text: string): any {
    let cleaned = text.trim();

    // 1. Remove Markdown blocks if present
    if (cleaned.includes('```')) {
      const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
      if (match) cleaned = match[1].trim();
    }

    // 2. Further aggressive trimming (find first [ or { and last ] or })
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');

    const starts = [firstBrace, firstBracket].filter((i) => i !== -1);
    const ends = [lastBrace, lastBracket].filter((i) => i !== -1);

    if (starts.length > 0 && ends.length > 0) {
      const start = Math.min(...starts);
      const end = Math.max(...ends);
      cleaned = cleaned.substring(start, end + 1);
    }

    // 3. Handle trailing commas (common AI mistake)
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      this.logger.error('❌ JSON Parse Error. Raw content snippet:', cleaned.substring(0, 100) + '...');
      if (process.env.DEBUG_AI) {
        this.logger.error('FULL RAW CONTENT:', cleaned);
      }
      return {
        error: 'Failed to parse AI response',
        raw: cleaned,
      };
    }
  }

  /**
   * Call Gemini and validate the parsed JSON output against a Zod schema.
   * - Sử dụng cleanJsonResponse để trích JSON từ nội dung trả về.
   * - Validate bằng Zod; nếu fail thì log warn và (tuỳ chọn) retry một lần nữa.
   */
  public async callGeminiWithSchema<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: { maxRetries?: number },
  ): Promise<{ data: T; usage: any }> {
    const maxRetries = options?.maxRetries ?? 1;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const { text: raw, usage } = await this.callGemini(prompt);
      const json = this.cleanJsonResponse(raw);

      try {
        const parsed = schema.parse(json);
        return { data: parsed, usage };
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `AI output validation failed (attempt ${attempt + 1}/${maxRetries + 1}): ${(err as Error).message}`,
        );

        if (attempt === maxRetries) {
          throw new Error(
            `AI output schema validation failed after ${maxRetries + 1} attempts`,
          );
        }
      }
    }

    throw lastError as Error;
  }

  public async getUserContext(userId: string): Promise<ToolContext> {
    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId },
        include: {
          liveClass: {
            include: {
              cohort: {
                include: {
                  courseProfile: {
                    select: {
                      id: true,
                      title: true,
                      level: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const courseTitles = (enrollments as any[])
        .map((e) => e.liveClass?.cohort?.courseProfile?.title)
        .filter(Boolean);
      const jlptLevels = [
        ...new Set(
          (enrollments as any[])
            .map((e) => e.liveClass?.cohort?.courseProfile?.level)
            .filter(Boolean),
        ),
      ];

      // Fetch Recent Activity (Last 30 Days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 1. Lessons Completed
      const completedLessons = await this.prisma.userLessonProgress.findMany({
        where: {
          userId,
          updatedAt: { gte: thirtyDaysAgo },
          isCompleted: true,
        },
        select: { updatedAt: true },
      });

      // 2. Quiz/Test Scores (V2: exam flow removed)
      const completedQuizzes: Array<{
        completedAt: Date | null;
        percentage: number | null;
      }> = [];

      // 3. Aggregate by Date
      const activityMap = new Map<
        string,
        { lessons: number; scores: number[]; date: string }
      >();

      // Init helper
      const getDateKey = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

      completedLessons.forEach((l) => {
        const dateKey = getDateKey(l.updatedAt);
        if (!activityMap.has(dateKey)) {
          activityMap.set(dateKey, { lessons: 0, scores: [], date: dateKey });
        }
        activityMap.get(dateKey)!.lessons += 1;
      });

      completedQuizzes.forEach((q) => {
        if (!q.completedAt) return;
        const dateKey = getDateKey(q.completedAt);
        if (!activityMap.has(dateKey)) {
          activityMap.set(dateKey, { lessons: 0, scores: [], date: dateKey });
        }
        if (q.percentage !== null) {
          activityMap.get(dateKey)!.scores.push(Number(q.percentage));
        }
      });

      // Convert to Array and Calculate Averages
      const recentActivity = Array.from(activityMap.values())
        .map((item) => ({
          date: item.date,
          lessons: item.lessons,
          averageScore:
            item.scores.length > 0
              ? Math.round(
                item.scores.reduce((a, b) => a + b, 0) / item.scores.length,
              )
              : 0,
        }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

      // Limit to last 14 days
      const conciseActivity = recentActivity.slice(-14);

      // --- NEW DATA FETCHING ---

      // 1. Common Errors (V2: exam flow removed)
      const commonErrors: Array<{
        question: string;
        category?: string;
        subcategory?: string;
      }> = [];

      // 2. Recent Vocabulary (Flashcards reviewed/added)
      const recentFlashcards = await this.prisma.setCard.findMany({
        where: { studySet: { userId } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      const recentVocabulary = recentFlashcards.map((f) => ({
        word: (f.languageDetails as any)?.kanji || f.term,
        reading: (f.languageDetails as any)?.furigana,
        meaning: f.definition,
        // srsState lives on SetCardSrsProgress, not SetCard.
        status: 'LEARNING',
      }));

      // 3. User Gamification (Streak, Level, XP)
      const gamification = await this.prisma.userGamification.findUnique({
        where: { userId },
      });

      // 4. User onboarding preferences (stored directly on User)
      const onboardingUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          jlptTarget: true,
          currentLevel: true,
          userMetadata: true,
        },
      });

      return {
        userId,
        enrolledCourses: courseTitles,
        jlptLevels,
        recentActivity: conciseActivity,
        commonErrors,
        recentVocabulary,
        stats: gamification
          ? {
            level: gamification.level,
            streak: gamification.currentStreak,
            totalXp: gamification.totalXp,
          }
          : null,
        onboarding: onboardingUser
          ? {
            jlptTarget:
              onboardingUser.jlptTarget ??
              ((onboardingUser.userMetadata as any)?.jlptTarget ??
                undefined),
            currentLevel: onboardingUser.currentLevel ?? undefined,
          }
          : null,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch user context: ${error.message}`);
      return { userId };
    }
  }

  private registerHandlebarsHelpers() {
    Handlebars.registerHelper('eq', function (a: any, b: any) {
      return a === b;
    });
    Handlebars.registerHelper('json', function (obj: any) {
      return JSON.stringify(obj, null, 2);
    });
  }
}
