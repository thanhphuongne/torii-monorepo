import { Controller, OnModuleInit, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Requester } from '@workspace/schemas';

import { SenseiService } from './sensei.service';
import { TTSService } from './tts.service';

/**
 * NATS Handler for Sensei Agent
 * Handles inter-service communication via NATS messaging
 */
@Controller()
export class SenseiHandler implements OnModuleInit {
  private readonly logger = new Logger(SenseiHandler.name);

  constructor(
    private readonly senseiService: SenseiService,
    private readonly ttsService: TTSService,
  ) { }

  onModuleInit() {
    this.logger.log('✅ SenseiHandler initialized and listening for NATS messages');
  }

  @MessagePattern({ cmd: 'agents.sensei.grammarCheck' })
  async checkGrammar(@Payload() data: { text: string; requester: Requester }) {
    return this.senseiService.checkGrammar(data.requester, data.text);
  }

  @MessagePattern({ cmd: 'agents.sensei.translate' })
  async translate(
    @Payload()
    data: {
      text: string;
      sourceLanguage: string;
      targetLanguage: string;
      requester: Requester;
    },
  ) {
    return this.senseiService.translate(
      data.requester,
      data.text,
      data.sourceLanguage,
      data.targetLanguage,
    );
  }

  @MessagePattern({ cmd: 'agents.sensei.createFlashcard' })
  async createFlashcard(
    @Payload()
    data: {
      topic: string;
      level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
      requester: Requester;
    },
  ) {
    return this.senseiService.createFlashcard(
      data.requester,
      data.topic,
      data.level || 'N4',
    );
  }

  @MessagePattern({ cmd: 'agents.sensei.autofillFlashcard' })
  async autofillFlashcard(
    @Payload()
    data: {
      term: string;
      requester: Requester;
    },
  ) {
    return this.senseiService.autofillFlashcard(data.requester, data.term);
  }

  @MessagePattern({ cmd: 'agents.sensei.simulateConversation' })
  async simulateConversation(
    @Payload()
    data: {
      scenario:
      | 'restaurant'
      | 'shopping'
      | 'station'
      | 'office'
      | 'casual'
      | 'formal';
      level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
      turns?: number;
      requester: Requester;
    },
  ) {
    return this.senseiService.simulateConversation(
      data.requester,
      data.scenario,
      data.level || 'N4',
      data.turns || 4,
    );
  }

  @MessagePattern({ cmd: 'agents.sensei.recommendResources' })
  async recommendResources(
    @Payload()
    data: {
      topic: string;
      resourceType?: 'article' | 'video' | 'book' | 'app' | 'website' | 'all';
      level?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
      requester: Requester;
    },
  ) {
    return this.senseiService.recommendResources(
      data.requester,
      data.topic,
      data.resourceType || 'all',
      data.level,
    );
  }

  @MessagePattern({ cmd: 'agents.sensei.chat' })
  async chat(
    @Payload()
    data: {
      message: string;
      history: any[];
      requester: Requester;
    },
  ) {
    return this.senseiService.chat(
      data.requester,
      data.message,
      data.history || [],
    );
  }

  @MessagePattern({ cmd: 'agents.sensei.roleplay' })
  async roleplay(
    @Payload()
    data: {
      requester: Requester;
      topic: string;
      message: string;
      history: any[];
      isFinal?: boolean;
    },
  ) {
    return this.senseiService.roleplay(
      data.requester,
      data.topic,
      data.message,
      data.history || [],
      data.isFinal || false,
    );
  }

  @MessagePattern({ cmd: 'agents.sensei.lessonChat' })
  async lessonChat(
    @Payload()
    data: {
      requester: Requester;
      lessonId: string;
      message: string;
      history: any[];
      courseId?: string;
      currentTimestamp?: string;
    },
  ) {
    return this.senseiService.lessonChat(
      data.requester,
      data.lessonId,
      data.message,
      data.history || [],
      data.courseId,
      data.currentTimestamp,
    );
  }

  @MessagePattern({ cmd: 'agents.sensei.tts' })
  async tts(@Payload() data: { text: string; voice?: string }) {
    console.log(
      `[SenseiHandler] Received TTS request for: ${data.text.substring(0, 20)}... (Voice: ${data.voice || 'Default'})`,
    );
    try {
      // google-tts-api might throw if text is too long (200 chars).
      // For roleplay responses, they can be long.
      // We should handle that, but for now let's just try getAudioBase64.
      const url = await this.ttsService.getAudioBase64(data.text, data.voice);
      console.log(
        `[SenseiHandler] Generated audio base64 (length: ${url.length})`,
      );
      return { url };
    } catch (e) {
      console.error(`[SenseiHandler] TTS failed:`, e);
      throw e;
    }
  }

  @MessagePattern({ cmd: 'agents.sensei.processTranscription' })
  async processTranscription(
    @Payload() data: { lessonId: string; startOffset?: number; duration?: number; chain?: boolean }
  ) {
    return this.senseiService.processVideoTranscription(
      data.lessonId,
      data.startOffset,
      data.duration,
      data.chain
    );
  }
}
