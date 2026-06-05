/**
 * Webhook notifier
 */

import { Logger } from '@nestjs/common';
import {
  CommonNotifyEvent,
  CommonNotifyEventSchema,
} from '@workspace/protocol';
import { toJson } from '@bufbuild/protobuf';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { v4 as uuidv4 } from 'uuid';
import { AccessToken } from 'livekit-server-sdk';
import { WebhookQueueWorker } from './webhook_queue_worker';

const AUTH_HEADER = 'Authorization';
// In various Apache modules will strip the Authorization header,
// so we'll use additional one
const HASH_TOKEN = 'Hash-Token';
const MAX_RETRY = 2; // axios-retry will use maxRetry + 1

/**
 * Shared HTTP client with retry logic
 */
let sharedClient: AxiosInstance;

/**
 * Initialize shared HTTP client
 */
function initSharedClient(): AxiosInstance {
  if (!sharedClient) {
    sharedClient = axios.create({
      timeout: 30000, // 30 seconds
    });

    // Configure retry logic
    axiosRetry(sharedClient, {
      retries: MAX_RETRY,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors or 5xx status codes
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status !== undefined && error.response.status >= 500)
        );
      },
    });
  }
  return sharedClient;
}

/**
 * WebhookNotifier handles webhook notifications with queue processing
 */
export class WebhookNotifier {
  private worker: WebhookQueueWorker;
  private logger: Logger;
  private httpClient: AxiosInstance;

  /**
   * Creates a new webhook notifier
   *
   * @param queueSize - Maximum queue size
   * @param logger - Logger instance
   */
  constructor(queueSize: number, logger: Logger) {
    this.logger = logger;
    this.logger.log('Webhook notifier initialized');
    this.worker = new WebhookQueueWorker(queueSize, logger);
    this.httpClient = initSharedClient();
  }

  /**
   * AddInNotifyQueue adds webhook events to the notification queue
   *
   * @param event - CommonNotifyEvent to send
   * @param apiKey - API key for signing
   * @param apiSecret - API secret for signing
   * @param urls - List of webhook URLs
   */
  addInNotifyQueue(
    event: CommonNotifyEvent,
    apiKey: string,
    apiSecret: string,
    urls: string[],
  ): void {
    if (urls.length < 1) {
      return;
    }

    for (const url of urls) {
      this.worker.submit(async () => {
        const logFields = {
          url,
          event: event.event,
          room: event.room?.roomId,
          sid: event.room?.sid,
        };

        try {
          const statusCode = await this.sendWebhookRequest(
            event,
            apiKey,
            apiSecret,
            url,
          );
          this.logger.log({
            ...logFields,
            http_status_code: statusCode,
            message: 'webhook sent successfully',
          });
        } catch (error) {
          this.logger.error({
            ...logFields,
            error: error instanceof Error ? error.message : String(error),
            message: 'failed to send webhook',
          });
        }
      });
    }
  }

  /**
   * StopGracefully waits for all queued items to be processed before stopping
   */
  async stopGracefully(): Promise<void> {
    if (this.worker) {
      await this.worker.stopGracefully();
    }
  }

  /**
   * Kill stops the worker immediately, dropping any unprocessed items
   */
  kill(): void {
    if (this.worker) {
      this.worker.kill();
    }
  }

  /**
   * sendWebhookRequest sends a single webhook event synchronously
   *
   * @param event - CommonNotifyEvent to send
   * @param apiKey - API key for signing
   * @param apiSecret - API secret for signing
   * @param url - Webhook URL
   * @returns HTTP status code
   */
  private async sendWebhookRequest(
    event: CommonNotifyEvent,
    apiKey: string,
    apiSecret: string,
    url: string,
  ): Promise<number> {
    // Make sure the event name is lowercase
    event.event = event.event?.toLowerCase();

    // Set createdAt if not present
    if (!event.createdAt) {
      event.createdAt = Math.floor(Date.now() / 1000).toString();
    }

    // Set ID if not present
    if (!event.id) {
      event.id = uuidv4();
    }

    // Serialize to JSON using proto3 JSON mapping
    // EmitUnpopulated: false, UseProtoNames: true
    const encoded = JSON.stringify(
      toJson(CommonNotifyEventSchema, event, {
        emitDefaultValues: false,
        useProtoFieldName: true, // Use snake_case field names
      }),
    );

    // Sign payload
    const sum = crypto.createHash('sha256').update(encoded).digest();
    const b64 = sum.toString('base64');

    // Create access token with SHA256 hash
    const at = new AccessToken(apiKey, apiSecret, {
      ttl: 300, // 5 minutes in seconds
    });
    at.sha256 = b64; // Set SHA256 hash for verification

    const token = await at.toJwt();

    // Send HTTP request
    const response = await this.httpClient.post(url, encoded, {
      headers: {
        [AUTH_HEADER]: token,
        [HASH_TOKEN]: token,
        'Content-Type': 'application/webhook+json',
      },
      validateStatus: () => true, // Don't throw on any status
    });

    return response.status;
  }
}
