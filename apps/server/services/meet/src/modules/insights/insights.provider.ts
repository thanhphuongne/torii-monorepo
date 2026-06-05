import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@server/shared';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  ChatSession,
} from '@google/generative-ai';
import axios from 'axios';
import {
  InsightsAITextChatContent,
  InsightsAITextChatStreamResult,
  InsightsAITextChatStreamResultSchema,
  InsightsTextTranslationResult,
  InsightsTextTranslationResultSchema,
  InsightsSupportedLangInfo,
  InsightsSupportedLangInfoSchema,
} from '@workspace/protocol';
import { v4 as uuidv4 } from 'uuid';
import { create } from '@bufbuild/protobuf';

/** Mặc định khớp Sensei/roleplay (`gemini-2.5-flash` trong fastmcp.service). */
const DEFAULT_GEMINI_INSIGHTS_MODEL = 'gemini-2.5-flash';

@Injectable()
export class InsightsProviderService {
  private readonly logger = new Logger(InsightsProviderService.name);
  private googleClient: GoogleGenerativeAI | null = null;

  constructor(private readonly appConfig: AppConfigService) {
    this.initializeGoogleClient();
  }

  /** Chat / dịch JSON (Gemini) — ưu tiên `insights.services.ai_text_chat.options.chat_model`. */
  private resolveGeminiModelName(explicit?: string): string {
    if (explicit) return explicit;
    const opts = this.appConfig.insights?.services?.ai_text_chat
      ?.options as Record<string, string> | undefined;
    return opts?.chat_model || DEFAULT_GEMINI_INSIGHTS_MODEL;
  }

  /**
   * Một nguồn key chính: `thirdParty.gemini.apiKey` (cùng Sensei / roleplay / agents).
   * Fallback (legacy): `insights.providers.google[]` khớp `insights.services.ai_text_chat.id`.
   */
  private resolveGeminiApiKey(): string | undefined {
    const primary = this.appConfig.thirdParty?.gemini?.apiKey?.trim();
    if (primary) return primary;

    const serviceId = this.appConfig.insights?.services?.ai_text_chat?.id;
    const accounts = this.appConfig.insights?.providers?.google;
    if (serviceId && accounts?.length) {
      const acc = accounts.find((a) => a.id === serviceId);
      const fallback = acc?.credentials?.apiKey?.trim();
      if (fallback) return fallback;
    }
    return undefined;
  }

  private initializeGoogleClient() {
    const apiKey = this.resolveGeminiApiKey();
    if (apiKey) {
      this.googleClient = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn(
        'Google Gemini API key not configured (set thirdParty.gemini.apiKey)',
      );
    }
  }

  // --- Google Gemini Implementation for Chat & Summary ---

  async *aiTextChatStream(
    modelName: string,
    history: InsightsAITextChatContent[],
  ): AsyncGenerator<InsightsAITextChatStreamResult> {
    if (!this.googleClient) {
      throw new Error('Google Gemini client not initialized');
    }

    const model = this.googleClient.getGenerativeModel({
      model: this.resolveGeminiModelName(modelName),
    });
    const streamId = uuidv4();
    const now = Date.now().toString();

    if (history.length === 0) {
      throw new Error('History is empty');
    }

    // The last message is the new prompt.
    const lastMsg = history[history.length - 1];
    // Previous history
    const prevHistory = history.slice(0, history.length - 1);

    const chatSession = model.startChat({
      history: prevHistory
        .filter((h) => h.role === 2 || h.role === 3) // Filter User(2) and Model(3). Skip System(1).
        .map((h) => ({
          role: h.role === 2 ? 'user' : 'model',
          parts: [{ text: h.text }],
        })),
    });

    try {
      const result = await chatSession.sendMessageStream(lastMsg.text);

      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();

        // Track usage if available in chunk
        if (chunk.usageMetadata) {
          promptTokens = chunk.usageMetadata.promptTokenCount;
          completionTokens = chunk.usageMetadata.candidatesTokenCount;
          totalTokens = chunk.usageMetadata.totalTokenCount;
        }

        yield create(InsightsAITextChatStreamResultSchema, {
          id: streamId,
          text: chunkText,
          createdAt: now,
        });
      }

      // If usage wasn't in chunks, get it from final response
      const finalResponse = await result.response;
      if (finalResponse.usageMetadata) {
        promptTokens = finalResponse.usageMetadata.promptTokenCount;
        completionTokens = finalResponse.usageMetadata.candidatesTokenCount;
        totalTokens = finalResponse.usageMetadata.totalTokenCount;
      }

      // Yield final chunk with usage
      yield create(InsightsAITextChatStreamResultSchema, {
        id: streamId,
        isLastChunk: true,
        promptTokens,
        completionTokens,
        totalTokens,
        createdAt: Date.now().toString(),
      });
    } catch (error) {
      this.logger.error(`Gemini stream error: ${error.message}`);
      throw error;
    }
  }

  async aiChatTextSummarize(
    modelName: string,
    history: InsightsAITextChatContent[],
  ): Promise<{
    summary: string;
    promptTokens: number;
    completionTokens: number;
  }> {
    if (!this.googleClient) {
      throw new Error('Google Gemini client not initialized');
    }

    const model = this.googleClient.getGenerativeModel({
      model: this.resolveGeminiModelName(modelName),
    });

    // Prepare prompt
    const conversation = history
      .map((h) => `${h.role === 2 ? 'User' : 'AI'}: ${h.text}`)
      .join('\n');
    const prompt = `Summarize the following conversation in a concise paragraph:\n\n${conversation}`;

    const result = await model.generateContent(prompt);
    const response = result.response;

    return {
      summary: response.text(),
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
    };
  }

  // --- Gemini JSON translation (không dùng Azure) ---

  async translateText(
    text: string,
    sourceLang: string,
    targetLangs: string[],
  ): Promise<InsightsTextTranslationResult> {
    if (!this.googleClient) {
      throw new Error('Google Gemini client not initialized');
    }

    const model = this.googleClient.getGenerativeModel({
      model: this.resolveGeminiModelName(),
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const targetLangsStr = targetLangs.join(', ');
    const prompt = `Translate the following ${sourceLang} text into these languages: ${targetLangsStr}.
Return the result as a JSON object where keys are the language codes and values are the translated text.

Source text: "${text}"

JSON format:
{
  "lang_code": "translated text"
}`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      let translations: Record<string, string>;
      try {
        translations = JSON.parse(responseText);
      } catch (e) {
        this.logger.error(
          `Failed to parse Gemini translation response: ${responseText}`,
        );
        throw new Error('Invalid JSON response from Gemini');
      }

      return create(InsightsTextTranslationResultSchema, {
        sourceText: text,
        sourceLang: sourceLang,
        translations: translations,
      });
    } catch (error) {
      this.logger.error(`Gemini translation error: ${error.message}`);
      throw error;
    }
  }
}
