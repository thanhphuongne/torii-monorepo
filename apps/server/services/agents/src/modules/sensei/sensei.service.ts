import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { FastMcpService } from '../../fastmcp/fastmcp.service';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentGrammarCheckResponseSchema,
  AgentTranslateResponseSchema,
  AgentFlashcardResponseSchema,
  AgentConversationSimulationResponseSchema,
  AgentResourceRecommendationResponseSchema,
  AgentChatResponseSchema,
  AgentRoleplayResponseSchema,
  AgentLessonChatResponseSchema,
  Requester,
} from '@workspace/schemas';

import { PrismaService, AppConfigService } from '@server/shared';
import { AIUsageTrackingService } from '../analytics/ai-usage-tracking.service';
import { AnalyticsService } from '../analytics/analytics.service';

const AgentFlashcardAutofillResponseSchema = z.object({
  term: z.string(),
  phonetic: z.string().default(''),
  definition: z.string(),
  note: z.string().default(''),
  type: z.enum(['Từ vựng', 'Ngữ pháp', 'Hán tự', 'Mẫu câu']),
});

@Injectable()
export class SenseiService implements OnModuleInit {
  private readonly logger = new Logger(SenseiService.name);
  private processingBlocks = new Set<string>();

  constructor(
    private readonly fastMcpService: FastMcpService,
    private readonly prisma: PrismaService,
    private readonly aiUsageTracking: AIUsageTrackingService,
    private readonly analyticsService: AnalyticsService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) { }

  private async deductCoins(userId: string, taskType: string, usage: any) {
    // Billing is temporarily disabled (No deduction, no usage recording, no logs)
    /*
    try {
      await firstValueFrom(
        this.natsClient.send(
          { cmd: 'billing.quota.recordTokenUsage' },
          {
            userId,
            taskType,
            usage: {
              promptTokenCount: usage.promptTokenCount,
              candidatesTokenCount: usage.candidatesTokenCount,
              totalTokenCount: usage.totalTokenCount,
              model: usage.model,
            },
          },
        ),
      );
    } catch (err: any) {
      // Still proceed, don't block the user but log the error
    }
    */
  }

  onModuleInit() {
    this.registerTools();
  }

  private registerTools() {
    // 1. Grammar Check
    this.fastMcpService.addTool(
      'sensei_check_grammar',
      'Check Japanese grammar and provide corrections',
      z.object({
        userId: z.string(),
        text: z.string(),
      }),
      async ({ userId, text }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template = this.fastMcpService.loadPromptTemplate(
          'sensei/grammar-check.md',
        );
        const prompt = template({
          text,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentGrammarCheckResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `gen-${userId}`,
          userId,
          'grammar_check',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        return data;
      },
    );

    // 2. Translate
    this.fastMcpService.addTool(
      'sensei_translate',
      'Translate text between languages with cultural context',
      z.object({
        userId: z.string(),
        text: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
      }),
      async ({ userId, text, sourceLanguage, targetLanguage }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template = this.fastMcpService.loadPromptTemplate(
          'sensei/translation.md',
        );
        const prompt = template({
          text,
          sourceLanguage,
          targetLanguage,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentTranslateResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `gen-${userId}`,
          userId,
          'translation',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        // await this.deductCoins(userId, 'translation', usage);

        return data;
      },
    );

    // 3. Create Flashcard
    this.fastMcpService.addTool(
      'sensei_create_flashcard',
      'Create a vocabulary flashcard',
      z.object({
        userId: z.string(),
        topic: z.string(),
        level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).default('N4'),
      }),
      async ({ userId, topic, level }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template = this.fastMcpService.loadPromptTemplate(
          'sensei/flashcard-creation.md',
        );
        const prompt = template({
          topic,
          level,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentFlashcardResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `gen-${userId}`,
          userId,
          'flashcard_creation',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        // await this.deductCoins(userId, 'flashcard_creation', usage);

        return data;
      },
    );

    // 4. Autofill a single flashcard from a term
    this.fastMcpService.addTool(
      'sensei_autofill_flashcard',
      'Autofill a single flashcard form from one Japanese term',
      z.object({
        userId: z.string(),
        term: z.string().min(1),
      }),
      async ({ userId, term }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template = this.fastMcpService.loadPromptTemplate(
          'sensei/flashcard-autofill.md',
        );
        const prompt = template({
          term,
          userContext,
          timestamp: new Date().toISOString(),
        });

        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentFlashcardAutofillResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `gen-${userId}`,
          userId,
          'flashcard_autofill',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        return data;
      },
    );

    // 5. Simulate Conversation
    this.fastMcpService.addTool(
      'sensei_simulate_conversation',
      'Simulate a conversation scenario',
      z.object({
        userId: z.string(),
        scenario: z.enum([
          'restaurant',
          'shopping',
          'station',
          'office',
          'casual',
          'formal',
        ]),
        level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).default('N4'),
        turns: z.number().default(4),
      }),
      async ({ userId, scenario, level, turns }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template = this.fastMcpService.loadPromptTemplate(
          'sensei/conversation-simulation.md',
        );
        const prompt = template({
          scenario,
          level,
          turns,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentConversationSimulationResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `gen-${userId}`,
          userId,
          `conversation_${scenario}`,
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        // await this.deductCoins(userId, `conversation_${scenario}`, usage);

        return data;
      },
    );

    // 6. Recommend Resources
    this.fastMcpService.addTool(
      'sensei_recommend_resources',
      'Recommend learning resources',
      z.object({
        userId: z.string(),
        topic: z.string(),
        resourceType: z
          .enum(['article', 'video', 'book', 'app', 'website', 'all'])
          .default('all'),
        level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']).optional(),
      }),
      async ({ userId, topic, resourceType, level }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);

        // Hybrid Search: Fetch candidates from DB (Courses & Lessons)
        const courses = await this.prisma.courseProfile.findMany({
          where: {
            ...(level ? { level } : {}),
            OR: [
              { title: { contains: topic, mode: 'insensitive' } },
              { description: { contains: topic, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, title: true, description: true, level: true },
        });

        const lessons = await this.prisma.lesson.findMany({
          where: {
            title: { contains: topic, mode: 'insensitive' },
            module: {
              courseProfile: {
                ...(level ? { level } : {}),
              },
            },
          },
          take: 5,
          select: {
            id: true,
            title: true,
            module: {
              select: {
                courseProfile: {
                  select: { id: true, title: true, level: true },
                },
              },
            },
          },
        });

        const candidates = [
          ...courses.map((c) => ({
            title: c.title,
            type: 'Course',
            level: c.level,
            url: `/courses/${c.id}`,
            description: c.description || 'Comprehensive course',
          })),
          ...lessons.map((l) => ({
            title: l.title,
            type: 'Lesson',
            level: l.module.courseProfile?.level || 'N/A',
            url: `/learning/${l.module.courseProfile?.id}/lesson/${l.id}`,
            description: `Lesson in course: ${l.module.courseProfile?.title}`,
          })),
        ];

        const template = this.fastMcpService.loadPromptTemplate(
          'sensei/resource-recommendation.md',
        );
        const prompt = template({
          topic,
          resourceType,
          level,
          userContext,
          candidates: JSON.stringify(candidates, null, 2),
          timestamp: new Date().toISOString(),
        });

        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentResourceRecommendationResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `gen-${userId}`,
          userId,
          'resource_recommendation',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        return data;
      },
    );

    // 7. Chat
    this.fastMcpService.addTool(
      'sensei_chat',
      'General chat with Sensei',
      z.object({
        userId: z.string(),
        message: z.string(),
        history: z.array(z.any()).default([]),
      }),
      async ({ userId, message, history }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template =
          this.fastMcpService.loadPromptTemplate('sensei/chat.md');
        const prompt = template({
          message,
          history,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentChatResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `chat-${userId}`,
          userId,
          'chat',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        /*
        await this.deductCoins(userId, 'chat', usage);
        */

        return data;
      },
    );

    // 8. Roleplay
    this.fastMcpService.addTool(
      'sensei_roleplay',
      'Roleplay with Sensei on a specific topic',
      z.object({
        userId: z.string(),
        topic: z.string(),
        message: z.string(),
        history: z.array(z.any()).default([]),
        isFinal: z.boolean().optional().default(false),
      }),
      async ({ userId, topic, message, history, isFinal }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template =
          this.fastMcpService.loadPromptTemplate('sensei/roleplay.md');
        // Calculate turns based on history length (each interaction is 2 turns: user + ai)
        // Actually history usually contains previous messages.
        const prompt = template({
          topic,
          message,
          history,
          isFinal,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { data: responseData, usage } =
          await this.fastMcpService.callGeminiWithSchema(
            prompt,
            AgentRoleplayResponseSchema,
            { maxRetries: 1 },
          );

        // For roleplay, we use a consistent room ID to group the session
        const roomId = `rp-${userId}`;
        await this.aiUsageTracking.updateAITextChatUsage(
          roomId,
          userId,
          'roleplay',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        // session-based billing: only deduct when conversation is finished
        if (isFinal) {
          this.logger.log(
            `Final turn detected for Roleplay session ${roomId}. Generating artifacts and deducting coins...`,
          );

          // Retrieve total session usage from Redis
          const sessionUsage = await this.aiUsageTracking.getUsage(roomId);
          const totalPrompt = sessionUsage[`total_roleplay_prompt_tokens`] || 0;
          const totalCompletion =
            sessionUsage[`total_roleplay_completion_tokens`] || 0;
          const totalTokens = sessionUsage[`total_roleplay_tokens`] || 0;

          if (totalTokens > 0) {
            /*
            this.logger.log(
              `[billing] Session-based deduction for ${roomId}: ${totalTokens} tokens total.`,
            );
            */
            /*
            await this.deductCoins(userId, 'roleplay', {
              promptTokenCount: totalPrompt,
              candidatesTokenCount: totalCompletion,
              totalTokenCount: totalTokens,
            });
            */
          }

          // Delay slightly to ensure usage is recorded for artifacts
          setTimeout(() => {
            this.analyticsService
              .createAIUsageArtifacts(roomId, userId, 'text')
              .catch((err) => {
                this.logger.error(
                  `Failed to generate artifacts for ${roomId}: ${err.message}`,
                );
              });
          }, 1000);
        }

        return {
          ...responseData,
          tokenUsage: {
            promptTokens: usage.promptTokenCount,
            completionTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount,
          },
        };
      },
    );

    // 9. Lesson Chat (VOD AI Assistant)
    this.fastMcpService.addTool(
      'sensei_lesson_chat',
      'Chat with AI about a specific lesson in a VOD course',
      z.object({
        userId: z.string(),
        lessonId: z.string(),
        courseId: z.string().optional(),
        currentTimestamp: z.string().optional(),
        message: z.string(),
        history: z.array(z.any()).default([]),
      }),
      async ({ userId, lessonId, courseId, currentTimestamp, message, history }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);

        // Fetch lesson details
        const lesson = await this.prisma.lesson.findUnique({
          where: { id: lessonId },
          select: {
            id: true,
            title: true,
            content: true,
            videoUrl: true,
            transcriptionStatus: true,
            module: {
              select: {
                id: true,
                title: true,
                courseProfile: {
                  select: {
                    id: true,
                    title: true,
                    modules: {
                      select: {
                        title: true,
                        orderIndex: true,
                        lessons: {
                          select: { title: true, orderIndex: true, type: true },
                          orderBy: { orderIndex: 'asc' },
                        },
                      },
                      orderBy: { orderIndex: 'asc' },
                    },
                  },
                },
              },
            },
          },
        });

        const lessonTitle = lesson?.title || 'Không rõ';
        const lessonContent = lesson?.content || '';
        const moduleTitle = lesson?.module?.title || '';
        const courseTitle = lesson?.module?.courseProfile?.title || '';
        const transcriptionStatus = lesson?.transcriptionStatus || 'IDLE';

        // Build curriculum overview (compact: module → lessons)
        let curriculumOverview = '';
        const modules = lesson?.module?.courseProfile?.modules || [];
        if (modules.length > 0) {
          curriculumOverview = modules
            .map(
              (mod: any, mi: number) =>
                `Mục ${mi + 1}: ${mod.title}\n` +
                (mod.lessons || [])
                  .map((l: any, li: number) => `  ${mi + 1}.${li + 1}. ${l.title} (${l.type})`)
                  .join('\n'),
            )
            .join('\n');
        }

        // 1. Parse current timestamp to seconds (format: m:ss or hh:mm:ss)
        let timestampInSeconds: number | undefined;
        if (currentTimestamp) {
          const parts = currentTimestamp.split(':').map(Number);
          if (parts.length === 2) {
            timestampInSeconds = parts[0] * 60 + parts[1];
          } else if (parts.length === 3) {
            timestampInSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        }

        // 2. Fetch transcript chunks if timestamp exists
        let transcriptContext = '';
        const allChunks = await this.prisma.lessonTranscriptChunk.findMany({
          where: { lessonId },
          orderBy: { startTime: 'asc' },
        });

        if (allChunks.length > 0) {
          transcriptContext = allChunks
            .map(
              (c: any) =>
                `[${Math.floor(c.startTime / 60)}:${String(
                  c.startTime % 60,
                ).padStart(2, '0')} - ${Math.floor(c.endTime / 60)}:${String(
                  c.endTime % 60,
                ).padStart(2, '0')}]: ${c.content}`,
            )
            .join('\n');
        }

        // --- SEQUENTIAL CHAIN TRIGGER (Self-healing) ---
        // Kích hoạt chuỗi bóc băng nếu bài chưa xong VÀ không có block nào đang chạy thực tế trong RAM
        if (transcriptionStatus !== 'COMPLETED' && !this.isLessonProcessing(lessonId)) {
          this.logger.log(`🚀 Student accessing lesson ${lessonId}. Starting/Resuming sequential transcription chain...`);
          // Bắt đầu từ đoạn cuối cùng đã có (mặc định block 0 đã bóc lúc publish nên start từ 600)
          const latestChunk = allChunks[allChunks.length - 1];
          const nextOffset = latestChunk ? Math.floor(latestChunk.endTime) : 0;

          this.processVideoTranscription(lessonId, nextOffset, 600, true).catch((err) =>
            this.logger.error(`Failed to start sequential ASR: ${err.message}`),
          );
        }

        // Fetch total duration (cached or calculated)
        let videoDuration = 'Không rõ';
        if (lesson?.videoUrl) {
          try {
            const durationSec = this.getVideoDuration(lesson.videoUrl);
            videoDuration = `${Math.floor(durationSec / 60)}:${String(Math.floor(durationSec % 60)).padStart(2, '0')}`;
          } catch (e) {
            this.logger.warn(`Failed to get duration for hallucination check: ${e.message}`);
          }
        }

        const template = this.fastMcpService.loadPromptTemplate(
          'sensei/lesson-chat.md',
        );
        const prompt = template({
          lessonTitle,
          lessonContent: lessonContent?.substring(0, 8000) || '',
          videoDuration,
          transcriptContext,
          currentTimestamp,
          courseTitle,
          moduleTitle,
          curriculumOverview,
          transcriptionStatus,
          message,
          history,
          userContext,
          timestamp: new Date().toISOString(),
        });

        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentLessonChatResponseSchema,
          { maxRetries: 1 },
        );

        await this.aiUsageTracking.updateAITextChatUsage(
          `lesson-chat-${userId}`,
          userId,
          'lesson_chat',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        return data;
      },
    );

    // 10. Process Video Transcription Tool
    this.fastMcpService.addTool(
      'sensei_process_video_transcription',
      'Automatically transcribe video content and save as chunks',
      z.object({
        lessonId: z.string(),
      }),
      async ({ lessonId }) => {
        return this.processVideoTranscription(lessonId);
      },
    );
  }

  // --- Helper: Check if lesson has any active processing blocks ---
  private isLessonProcessing(lessonId: string): boolean {
    for (const key of this.processingBlocks) {
      if (key.startsWith(`${lessonId}-`)) return true;
    }
    return false;
  }

  // --- Helper: Get Video Duration ---
  private getVideoDuration(videoUrl: string): number {
    try {
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoUrl}"`,
        { stdio: 'pipe' },
      ).toString().trim();

      const duration = parseFloat(output);
      if (!isNaN(duration)) {
        return duration;
      }
    } catch (e) {
      this.logger.error(`Failed to get video duration via ffprobe: ${e.message}`);

      // Fallback to ffmpeg -i if ffprobe fails
      try {
        const output = execSync(
          `ffmpeg -i "${videoUrl}" 2>&1 | grep "Duration"`,
          { stdio: 'pipe' },
        ).toString();
        const match = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/) || output.match(/Duration: (\d+):(\d+):(\d+)/);
        if (match) {
          const h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const s = parseFloat(match[3]);
          return h * 3600 + m * 60 + s;
        }
      } catch (fallbackErr: any) {
        this.logger.error(`Fallback duration detection also failed: ${fallbackErr.message}`);
      }
    }
    return 0;
  }
  // --- Public Methods (Delegate to Tools) ---

  async processVideoTranscription(
    lessonId: string,
    startOffset: number = 0,
    duration: number = 600,
    chain: boolean = false
  ): Promise<any> {
    const blockKey = `${lessonId}-${startOffset}`;
    if (this.processingBlocks.has(blockKey)) {
      this.logger.debug(`⏳ Block ${blockKey} already in progress. Skipping.`);
      return { success: true };
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson || !lesson.videoUrl) throw new Error('Lesson or Video URL not found');

    this.logger.log(`🎬 Transcription Block START [Offset: ${startOffset}s, Duration: ${duration}s, Chain: ${chain}] for lesson: ${lesson.title}`);
    this.processingBlocks.add(blockKey);

    // Update status to PROCESSING (only if not already)
    if (lesson.transcriptionStatus !== 'PROCESSING') {
      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: { transcriptionStatus: 'PROCESSING' }
      });
    }

    const tempDir = os.tmpdir();
    const sessionId = uuidv4().substring(0, 8);
    const audioPath = path.join(tempDir, `torii_audio_${sessionId}.mp3`);

    try {
      // 1. Download/Extract Audio (Small chunk for prototype robustness)
      this.logger.debug(`📥 Extracting audio from ${lesson.videoUrl}...`);

      // Use ffmpeg to extract specific block
      try {
        execSync(
          `ffmpeg -i "${lesson.videoUrl}" -ss ${startOffset} -t ${duration} -vn -ar 16000 -ac 1 -ab 64k -y "${audioPath}"`,
          { stdio: 'pipe' }
        );
      } catch (ffmpegErr: any) {
        this.logger.error(`FFmpeg failed: ${ffmpegErr.stderr?.toString() || ffmpegErr.message}`);
        throw new Error('Failed to extract audio from video URL');
      }

      const audioBuffer = fs.readFileSync(audioPath);
      const base64Audio = audioBuffer.toString('base64');

      // 2. Call Gemini Multimodal
      const multimodalRes = await this.fastMcpService.callGeminiMultimodal(
        `Hãy bóc băng nội dung bài giảng này. 
        YÊU CẦU QUAN TRỌNG: 
        1. Đối với các câu ví dụ bằng TIẾNG NHẬT, hãy giữ nguyên bản văn bản tiếng Nhật (kèm theo Hán tự và Furigana nếu có thể).
        2. Đối với các lời giảng và giải thích của giảng viên, hãy viết bằng TIẾNG VIỆT.
        3. Kết quả trả về bắt buộc phải là một JSON array theo định dạng: [{ "startTime": number_giây, "endTime": number_giây, "content": "nội dung text" }].
        CHÚ Ý: Thời gian trong JSON phải tính từ 0 (tương ứng với file âm thanh đang nghe).
        4. Chia nhỏ mỗi đoạn khoảng 20-30 giây.`,
        [{ mimeType: 'audio/mp3', data: base64Audio }]
      );

      // 3. Parse and Save
      let chunks = this.fastMcpService.cleanJsonResponse(multimodalRes.text);
      if (chunks?.error) {
        this.logger.error(`❌ Failed to parse Gemini response for lesson ${lessonId}: ${chunks.error}`);
        if (process.env.DEBUG_AI) this.logger.error(`RAW TEXT: ${multimodalRes.text}`);
        return { success: false, error: 'JSON_PARSE_ERROR' };
      }

      if (!Array.isArray(chunks) && typeof chunks === 'object' && chunks !== null) {
        // Handle case where AI returns { chunks: [...] }
        if (Array.isArray((chunks as any).chunks)) chunks = (chunks as any).chunks;
      }

      if (Array.isArray(chunks) && chunks.length > 0) {
        // Appending blocks: delete only the range we are re-processing
        await this.prisma.lessonTranscriptChunk.deleteMany({
          where: {
            lessonId,
            startTime: { gte: startOffset, lt: startOffset + duration }
          }
        });

        await this.prisma.lessonTranscriptChunk.createMany({
          data: chunks.map((c: any) => ({
            id: uuidv4(),
            lessonId,
            startTime: Math.floor((c.startTime || c.start || 0) + startOffset),
            endTime: Math.floor((c.endTime || c.end || 0) + startOffset),
            content: c.content || c.text || '',
          })),
        });

        // Detect total duration to see if we should chain
        const totalDuration = this.getVideoDuration(lesson.videoUrl);
        const nextOffset = startOffset + duration;
        this.logger.debug(`📊 Transcription Progress: ${nextOffset}s / ${totalDuration}s (Lesson: ${lesson.title})`);

        if (chain && nextOffset < totalDuration) {
          this.logger.log(`🔗 Chaining NEXT block at ${nextOffset}s for lesson: ${lesson.title}`);
          // Use NATS emit to start next block with a small delay to be safe
          setTimeout(() => {
            this.natsClient.emit(
              { cmd: 'agents.sensei.processTranscription' },
              { lessonId, startOffset: nextOffset, duration, chain: true }
            );
          }, 4000); // 4s gap between blocks
        } else if (nextOffset >= totalDuration) {
          // Final block reached
          await this.prisma.lesson.update({
            where: { id: lessonId },
            data: { transcriptionStatus: 'COMPLETED' }
          });
          this.logger.log(`🏁 Transcription FULLY COMPLETED for lesson: ${lesson.title}`);
        } else {
          // We were not chaining (e.g. Publish phase) and finished a partial block
          await this.prisma.lesson.update({
            where: { id: lessonId },
            data: { transcriptionStatus: 'IDLE' } // Keep as IDLE so it can be resumed later
          });
          this.logger.log(`⏸️ Partial transcription finished (Block 0). Ready for student entry.`);
        }

        return { success: true, chunksCount: chunks.length };
      }

      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: { transcriptionStatus: 'FAILED' }
      }).catch(() => { });
      this.logger.warn(`⚠️ Transcription returned no valid chunks or invalid format.`);
      return { success: false, error: 'Invalid transcript format' };

    } catch (error: any) {
      this.logger.error(`❌ Transcription error for lesson ${lessonId}: ${error.message}`);
      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: { transcriptionStatus: 'FAILED' }
      }).catch(() => { });
      throw error;
    } finally {
      this.processingBlocks.delete(blockKey);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    }
  }

  async checkGrammar(requester: Requester, text: string): Promise<any> {
    return this.fastMcpService.callTool('sensei_check_grammar', {
      userId: requester.sub,
      text,
    });
  }

  async translate(
    requester: Requester,
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<any> {
    return this.fastMcpService.callTool('sensei_translate', {
      userId: requester.sub,
      text,
      sourceLanguage,
      targetLanguage,
    });
  }

  async createFlashcard(
    requester: Requester,
    topic: string,
    level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' = 'N4',
  ): Promise<any> {
    return this.fastMcpService.callTool('sensei_create_flashcard', {
      userId: requester.sub,
      topic,
      level,
    });
  }

  async autofillFlashcard(
    requester: Requester,
    term: string,
  ): Promise<z.infer<typeof AgentFlashcardAutofillResponseSchema>> {
    return this.fastMcpService.callTool('sensei_autofill_flashcard', {
      userId: requester.sub,
      term,
    });
  }

  async simulateConversation(
    requester: Requester,
    scenario:
      | 'restaurant'
      | 'shopping'
      | 'station'
      | 'office'
      | 'casual'
      | 'formal',
    level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' = 'N4',
    turns: number = 4,
  ): Promise<any> {
    return this.fastMcpService.callTool('sensei_simulate_conversation', {
      userId: requester.sub,
      scenario,
      level,
      turns,
    });
  }

  async recommendResources(
    requester: Requester,
    topic: string,
    resourceType:
      | 'article'
      | 'video'
      | 'book'
      | 'app'
      | 'website'
      | 'all' = 'all',
    level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
  ): Promise<any> {
    return this.fastMcpService.callTool('sensei_recommend_resources', {
      userId: requester.sub,
      topic,
      resourceType,
      level,
    });
  }

  async chat(
    requester: Requester,
    message: string,
    history: any[] = [],
  ): Promise<any> {
    return this.fastMcpService.callTool('sensei_chat', {
      userId: requester.sub,
      message,
      history,
    });
  }

  async roleplay(
    requester: Requester,
    topic: string,
    message: string,
    history: any[] = [],
    isFinal: boolean = false,
  ): Promise<any> {
    return this.fastMcpService.callTool('sensei_roleplay', {
      userId: requester.sub,
      topic,
      message,
      history,
      isFinal,
    });
  }

  async lessonChat(
    requester: Requester,
    lessonId: string,
    message: string,
    history: any[] = [],
    courseId?: string,
    currentTimestamp?: string,
  ): Promise<any> {
    return this.fastMcpService.callTool('sensei_lesson_chat', {
      userId: requester.sub,
      lessonId,
      courseId,
      currentTimestamp,
      message,
      history,
    });
  }
}
