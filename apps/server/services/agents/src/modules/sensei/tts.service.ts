import { Injectable, Logger } from '@nestjs/common';
import * as googleTTS from 'google-tts-api';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class TTSService {
  private readonly logger = new Logger(TTSService.name);

  async getAudioBase64(
    text: string,
    voice: string = 'google-translate',
  ): Promise<string> {
    this.logger.log(
      `[TTS] Request received - Voice: ${voice}, Text: ${text.substring(0, 30)}...`,
    );

    // Only try Edge if voice is a Microsoft Neural voice
    if (voice && voice.includes('Neural')) {
      this.logger.log(`[TTS] Neural voice detected. Attempting Edge TTS...`);
      try {
        const result = await this.getEdgeAudio(text, voice);
        this.logger.log(
          `[TTS] Edge TTS succeeded. Audio length: ${result.length}`,
        );
        return result;
      } catch (error) {
        this.logger.error(
          `Edge TTS failed for voice ${voice}: ${error.message}. Falling back to Google TTS.`,
        );
      }
    } else {
      this.logger.log(`[TTS] Non-Neural voice (${voice}), skipping Edge TTS`);
    }

    // Fallback or explicit request for Google TTS (Standard Quality)
    this.logger.log(`Using Google TTS for text: ${text.substring(0, 20)}...`);
    return await this.getGoogleAudio(text);
  }

  private async getEdgeAudio(text: string, voice: string): Promise<string> {
    const tempFile = path.join(
      os.tmpdir(),
      `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`,
    );

    try {
      // Use venv from current working directory (apps/server when running pnpm dev)
      const venvPath = path.join(process.cwd(), '.venv/bin/edge-tts');
      this.logger.log(`[TTS] Resolved venv path: ${venvPath}`);
      const safeText = text.replace(/"/g, '\\"');
      const command = `"${venvPath}" --voice "${voice}" --text "${safeText}" --write-media "${tempFile}"`;

      this.logger.debug(`Executing: ${command}`);
      await execAsync(command);

      const buffer = await fs.readFile(tempFile);
      const base64 = buffer.toString('base64');
      return `data:audio/mpeg;base64,${base64}`;
    } catch (error) {
      this.logger.error(`Python EdgeTTS execution failed: ${error.message}`);
      throw error;
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private async getGoogleAudio(text: string): Promise<string> {
    const base64 = await googleTTS.getAudioBase64(text, {
      lang: 'ja',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });
    return `data:audio/mpeg;base64,${base64}`;
  }
}
