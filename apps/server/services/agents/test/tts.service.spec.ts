import { Test, TestingModule } from '@nestjs/testing';
import { TTSService } from '../src/modules/sensei/tts.service';
import * as googleTTS from 'google-tts-api';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

jest.mock('google-tts-api');
jest.mock('fs/promises');
jest.mock('child_process');

describe('TTSService', () => {
  let service: TTSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TTSService],
    }).compile();

    service = module.get<TTSService>(TTSService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAudioBase64', () => {
    it('should use google-translate by default', async () => {
      (googleTTS.getAudioBase64 as jest.Mock).mockResolvedValue('base64data');

      const result = await service.getAudioBase64('test message');
      expect(result).toBe('data:audio/mpeg;base64,base64data');
      expect(googleTTS.getAudioBase64).toHaveBeenCalled();
    });

    it('should throw if Google TTS fails', async () => {
      (googleTTS.getAudioBase64 as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );
      await expect(service.getAudioBase64('test')).rejects.toThrow(
        'Network error',
      );
    });

    it('should attempt Edge TTS if voice is Neural', async () => {
      // Mock exec which is used in execAsync
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => callback(null, { stdout: '', stderr: '' }));
      
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('edge-audio'));
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getAudioBase64('test', 'en-US-AriaNeural');
      expect(result).toBe('data:audio/mpeg;base64,ZWRnZS1hdWRpbw==');
      expect(googleTTS.getAudioBase64).not.toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should escape double quotes in text for Edge TTS', async () => {
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) =>
        callback(null, { stdout: '', stderr: '' }),
      );
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('ok'));

      await service.getAudioBase64('Hello "World"', 'en-US-AriaNeural');
      expect(execMock).toHaveBeenCalledWith(
        expect.stringContaining('Hello \\"World\\"'),
        expect.any(Function),
      );
    });

    it('should fallback to Google TTS if Edge TTS fails', async () => {
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) => callback(new Error('Exec failed'), {}));
      
      (googleTTS.getAudioBase64 as jest.Mock).mockResolvedValue('fallback-google');

      const result = await service.getAudioBase64('test', 'en-US-AriaNeural');
      expect(result).toBe('data:audio/mpeg;base64,fallback-google');
      expect(googleTTS.getAudioBase64).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should cleanup temp file even if reading fails', async () => {
      const execMock = exec as unknown as jest.Mock;
      execMock.mockImplementation((cmd, callback) =>
        callback(null, { stdout: '', stderr: '' }),
      );
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));
      (googleTTS.getAudioBase64 as jest.Mock).mockResolvedValue('google-ok');

      await service.getAudioBase64('test', 'en-US-AriaNeural');

      expect(fs.unlink).toHaveBeenCalled();
      expect(googleTTS.getAudioBase64).toHaveBeenCalled();
    });
  });
});
