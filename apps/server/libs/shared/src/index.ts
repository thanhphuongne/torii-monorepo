export * from './prisma/prisma.service';
export * from './shared.module';
export * from './prisma/prisma.module';

// NATS modules and configuration
export * from './nats/nats-client.module';
export * from './nats/nats-auth.module';
export * from './nats/nats-auth.service';
export { createNatsServiceConfig } from './nats/nats-service.config';

// Guards
export * from './guards/api-key.guard';
export * from './guards/jwt-auth.guard';
export * from './guards/gateway-auth.guard';
export * from './decorators/public.decorator';
export * from './decorators/permissions.decorator';

export * from './guards/permissions.guard';
export * from './guards/subscription.guard';

export * from './utils/slug.utils';
export * from './utils/webhook_verify';
export * from './utils/user-agent';

/**
 * Utils module
 *
 * Exports all utility functions
 */

// Common utilities
export {
  prepareCommonWebhookNotifyEvent,
  sendCommonProtobufResponse,
  sendProtobufResponse,
  sendCommonProtoJsonResponse,
  sendProtoJsonResponse,
  getFilesFromDir,
  generateSecureRandomString,
  generateRandomString,
} from './utils/common';

export { AppConfigService } from './config/app-config.service';
export { loadConfig } from './config/app.config';
export type { AppConfig } from './config/app.config';

// Proto parser
export {
  parseProtoRequest, // Flexible parser (JSON or binary)
  parseAndValidateRequest, // Parser + validation
  validateRequest, // Validation only
} from './utils/proto-parser';

// Access token generation
export {
  generateWajlcJWTAccessToken,
  generateLivekitAccessToken,
  generateTokenForDownloadRecording,
} from './utils/access_token';

// Token verification )
export { verifyWajlcAccessToken } from './utils/verify_token';

// NATS utilities
export {
  nkeyOptionFromSeedText,
  sigHandler,
  nKeyPairFromSeed,
  wipeSlice,
} from './utils/nats';

// LTI v1 utilities
export {
  assignLTIV1CustomParams,
  prepareLTIV1RoomCreateReq,
} from './utils/lti_v1';

// Create room utilities
export {
  prepareDefaultRoomFeatures,
  setCreateRoomDefaultValues,
  setRoomDefaultLockSettings,
  setDefaultRoomSettings,
  type RoomDefaultSettings,
} from './utils/create_room';

// Webhook verification
export { verifyWebhookRequest } from './utils/webhook_verify';

// Webhook queue worker
export { WebhookQueueWorker } from './utils/webhook_queue_worker';

// Webhook notifier
export { WebhookNotifier } from './utils/webhook_notifier';

// Auth guards, pipes, providers
export * from './pipes/zod-validation.pipe';
export * from './providers/jwt-token.provider';

// Audit logging
// Storage - Shared S3/R2 storage for all modules
export * from './storage';

// Email - Shared email service for all modules
export * from './email';

// Encryption
export * from './encryption';

// Redis
export * from './redis/redis.module';
export * from './redis/redis.provider';

// Services
export * from './services/blacklist.service';

// API Response Utilities
export * from './utils/api-response.util';

// Filters
export * from './filters/global-exception.filter';
export * from './filters/rpc-exception.filter';

// Types
export * from './types/auth-request.type';
