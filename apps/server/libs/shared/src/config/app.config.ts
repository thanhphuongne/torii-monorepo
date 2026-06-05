import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

/**
 * COMPREHENSIVE CONFIGURATION SCHEMA
 * EVERYTHING is here.
 */
const ConfigSchema = z.object({
  server: z.object({
    port: z.number().default(8080), // Default Gateway/Shared port
    apiUrl: z.string().default('http://localhost:8080'),
    webUrl: z.string().default('https://app.torii.sbs'),
    uploadPath: z.string().default('./uploads'),
    storagePath: z.string().default('./storage'),
    nodeEnv: z.string().default('development'),
    isCloud: z.boolean().default(false),
  }),
  database: z.object({
    url: z.string().min(1),
  }),
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional().default(''),
  }),
  nats: z.object({
    url: z.string().default('nats://localhost:4222'),
    wsUrls: z.array(z.string()).optional().default([]),
    accountName: z.string().default('PNM'),
    accountSeed: z.string().optional(),
    xkeySeed: z.string().optional(),
    nkeySeed: z.string().optional(),
    streamName: z.string().default('wajlc-room-stream'),
    numReplicas: z.number().default(1),
    pingTimeout: z.number().default(8000),
    subjects: z.object({
      systemApiWorker: z.string().default('sysApiWorker'),
      systemJsWorker: z.string().default('sysJsWorker'),
      systemPublic: z.string().default('sysPublic'),
      systemPrivate: z.string().default('sysPrivate'),
      chat: z.string().default('chat'),
      whiteboard: z.string().default('whiteboard'),
      dataChannel: z.string().default('dataChannel'),
    }),
    recorder: z.object({
      channel: z.string().default('recorderChannel'),
      infoKv: z.string().default('recorderInfo'),
      transcodingJobs: z.string().default('recorderTranscoderJobs'),
    }),
  }),
  livekit: z.object({
    apiUrl: z.string().min(1),
    wsUrl: z.string().min(1),
    apiKey: z.string().min(1),
    apiSecret: z.string().min(1),
  }),
  livekitRoleplay: z.object({
    apiUrl: z.string().min(1),
    wsUrl: z.string().min(1),
    apiKey: z.string().min(1),
    apiSecret: z.string().min(1),
  }),
  security: z.object({
    jwt: z.object({
      secret: z.string().min(1),
      accessExpires: z.string().default('15m'),
      refreshExpires: z.string().default('7d'),
      issuer: z.string().default('auth.torii.edu'),
      audience: z.string().default('torii-client'),
    }),
    encryptionKey: z.string().min(1),
    wajlc: z.object({
      apiKey: z.string().min(1),
      apiSecret: z.string().min(1),
      tokenValidity: z.number().default(3600),
    }),
  }),
  identity: z.object({
    twoFactorIssuer: z.string().default('Torii Nihongo'),
    webAdminUrl: z.string().default('https://admin.torii.sbs'),
    webLearnerUrl: z.string().default('https://app.torii.sbs'),
    webMeetUrl: z.string().default('https://meet.torii.sbs'),
    twoFactorTempTokenExpiry: z.number().default(300),
    defaultAdmin: z.object({
      email: z.string().default('admin@torii.com'),
      password: z.string().default('admin123'),
      displayName: z.string().default('System Administrator'),
    }),
    auditLogRetentionMonths: z.number().default(6),
  }),
  upload: z.object({
    maxSizeMb: z.number().default(100),
    maxFileSizeBytes: z.number().default(52428800), // 50MB
    maxWhiteboardFileSizeMb: z.number().default(30),
    allowedTypes: z
      .array(z.string())
      .default(['jpg', 'jpeg', 'png', 'pdf', 'mp4', 'mp3', 'zip']),
    keepForever: z.boolean().default(false),
  }),
  room: z.object({
    defaultMaxParticipants: z.number().default(0),
    defaultMaxDuration: z.coerce.string().default('0'),
    defaultMaxNumBreakoutRooms: z.number().default(10),
    sharedNotepadEnabled: z.boolean().default(false),
    copyright: z.object({
      display: z.boolean().default(true),
      text: z.string().default('Powered by Torii'),
      allowOverride: z.boolean().default(false),
    }),
  }),
  insights: z.object({
    enabled: z.boolean().default(false),
    maxTranscriptionLangs: z.number().default(2),
    maxChatTransLangs: z.number().default(5),
    coinRatePerUSD: z.number().default(25000),
    contextWindow: z.number().default(5), // Default context window for AI chat history
    services: z
      .record(
        z.enum([
          'transcription',
          'translation',
          'speech-synthesis',
          'ai_text_chat',
          'meeting_summarizing',
          'live_voice',
        ]),
        z.object({
          provider: z.string(),
          id: z.string(), // Provider account ID
          options: z.record(z.string(), z.any()).optional().default({}), // Generic options like model name
          pricing: z
            .record(
              z.string(),
              z.object({
                // Key is model name, or "default"
                inputPricePerMillionTokens: z.number().default(0),
                outputPricePerMillionTokens: z.number().default(0),
                pricePerMinute: z.number().default(0),
                pricePerMillionCharacters: z.number().default(0),
                pricePerHour: z.number().default(0),
              }),
            )
            .optional()
            .default({}),
        }),
      )
      .optional()
      .default({}),
    providers: z
      .record(
        z.string(),
        z.array(
          z.object({
            id: z.string(),
            credentials: z
              .object({
                apiKey: z.string().optional(),
                region: z.string().optional(),
              })
              .optional()
              .default({}),
            options: z.record(z.string(), z.any()).optional().default({}), // Provider-specific options
          }),
        ),
      )
      .optional()
      .default({}),
  }),
  ingress: z.object({
    userIdPrefix: z.string().default('ingress_'),
  }),
  analytics: z.object({
    enabled: z.boolean().default(true),
  }),
  webhook: z.object({
    enabled: z.boolean().default(false),
    perMeeting: z.boolean().default(true),
    url: z.string().optional(),
    defaultQueueSize: z.number().default(100),
  }),
  smtp: z.object({
    enabled: z.boolean().default(false),
    host: z.string().optional(),
    port: z.number().default(587),
    user: z.string().optional(),
    pass: z.string().optional(),
    from: z.string().optional(),
  }),
  janitor: z.object({
    userCheckInterval: z.number().default(60000),
    roomCheckInterval: z.number().default(300000),
    backupCheckInterval: z.number().default(3600000),
    recordingBackupDuration: z.string().default('72h'),
    enableArtifactsBackup: z.boolean().default(true),
    artifactsBackupPath: z.string().default('./storage/trash'),
    enableRecordingBackup: z.boolean().default(true),
    recordingBackupPath: z.string().default('./recording_files/del_backup'),
  }),
  timeouts: z.object({
    waitAfterRoomEnded: z.number().default(5000),
    waitBeforeAnalyticsStart: z.number().default(10000),
    waitBeforeSpeechCleanup: z.number().default(5000),
  }),
  fastmcp: z.object({
    url: z.string().default('http://localhost:3333'),
  }),
  thirdParty: z.object({
    google: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }),
    facebook: z.object({
      appId: z.string().optional(),
      appSecret: z.string().optional(),
    }),
    gemini: z.object({
      apiKey: z.string().optional(),
    }),
    payos: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(), // Re-added just in case, though payos usually doesn't need it
      apiKey: z.string().optional(),
      checksumKey: z.string().optional(),
    }),
    r2: z.object({
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional(),
      endpoint: z.string().optional(),
      bucketName: z.string().optional(),
      accountId: z.string().optional(),
      publicUrl: z.string().optional(),
    }),
  }),
  firebase: z.object({
    serviceAccountKey: z.string().optional(),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

/**
 * COMPREHENSIVE CONFIG LOADER
 */
export const loadConfig = (): AppConfig => {
  const yamlPath = join(process.cwd(), 'config', 'config.yaml');
  let configData: any = {};

  if (existsSync(yamlPath)) {
    try {
      const fileContents = readFileSync(yamlPath, 'utf8');
      configData = yaml.load(fileContents) || {};
    } catch (e) {
      console.error(`CRITICAL: Error loading config.yaml: ${e.message}`);
    }
  }

  // Validation ensures everything is correct or has defaults
  try {
    return ConfigSchema.parse(configData);
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error('Configuration Validation Failed:');
      e.errors.forEach((err) => {
        console.error(`- [${err.path.join('.')}]: ${err.message}`);
      });
    }
    throw e;
  }
};
