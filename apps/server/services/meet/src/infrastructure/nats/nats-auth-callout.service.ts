/**
 * NATS Auth Callout Service
 *
 */

import { Injectable, Logger } from '@nestjs/common';
import { NatsContext } from '@nestjs/microservices';
import * as nkeys from 'nkeys.js';
import { WajlcAuthService } from '@server/meet/modules/auth/wajlc-auth.service';
import { NatsConsumerService } from '@server/meet/infrastructure/nats/nats-consumer.service';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import * as crypto from 'crypto';
import { AppConfigService } from '@server/shared';

// Constants
const RECORDER_USER_AUTH_NAME = 'WAJLC_RECORDER_AUTH';
const TRANSCODER_CONSUMER_DURABLE = 'transcoderWorker';

interface ConnectOptions {
  token?: string;
  auth_token?: string;
}

interface ServerInfo {
  id: string;
  name?: string;
}

interface AuthorizationRequest {
  user_nkey?: string;
  nkey?: string;
  server_id?: ServerInfo;
  server?: ServerInfo;
  connect_opts?: ConnectOptions;
  connectOptions?: ConnectOptions;
}

@Injectable()
export class NatsAuthCalloutService {
  private readonly logger = new Logger(NatsAuthCalloutService.name);
  private issuerKeyPair: nkeys.KeyPair;
  private curveKeyPair: nkeys.KeyPair | null = null;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly authService: WajlcAuthService,
    private readonly consumerService: NatsConsumerService,
    private readonly userInfoService: NatsUserInfoService,
  ) {
    this.initializeKeyPairs();
  }

  /**
   * Initialize NATS key pairs from environment
   */
  private initializeKeyPairs() {
    try {
      const accountSeed = this.appConfig.nats.accountSeed;
      if (!accountSeed) {
        this.logger.fatal('NATS accountSeed is required for auth callout');
        throw new Error('NATS accountSeed is required');
      }
      this.issuerKeyPair = nkeys.fromSeed(Buffer.from(accountSeed));

      const xkeySeed = this.appConfig.nats.xkeySeed;
      if (xkeySeed) {
        this.curveKeyPair = nkeys.fromSeed(Buffer.from(xkeySeed));
      }

      this.logger.log('NATS auth callout initialized with field: nats-auth');
    } catch (error) {
      this.logger.fatal('Error creating key pairs:', error);
      throw error;
    }
  }

  /**
   * Handle auth callout from NATS server
   */
  async handleAuthCallout(
    rawData: Buffer | string | any,
    xKey: string | undefined,
    context: NatsContext,
  ): Promise<Buffer> {
    let data: Buffer;

    // Step 1: Decrypt if xKey present
    if (xKey && xKey.length > 0) {
      if (!this.curveKeyPair) {
        this.logger.error('Received encrypted data but curveKeyPair is nil');
        throw new Error('xKey not supported');
      }

      try {
        this.logger.debug(
          `[Auth-Step 1] Decrypting request using curveKeyPair and xKey: ${xKey}`,
        );
        const inputData = Buffer.isBuffer(rawData)
          ? rawData
          : Buffer.from(rawData);
        const decrypted = this.curveKeyPair.open(inputData, xKey);
        if (!decrypted) {
          throw new Error('Decryption failed');
        }
        data = Buffer.from(decrypted);
        this.logger.debug('[Auth-Step 1] Decryption SUCCESS');
      } catch (err) {
        this.logger.error(`[Auth-Step 1] Decryption FAILED: ${err.message}`);
        throw new Error('xKey decryption failed');
      }
    } else {
      this.logger.debug('[Auth-Step 1] Plain data received (No encryption)');
      data = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
    }

    // Step 2: Decode Authorization Request
    // NATS sends JWT token, need to decode it
    let authRequest: AuthorizationRequest;
    try {
      const dataStr = data.toString('utf-8');

      // JWT format: header.payload.signature
      // Split and decode the payload (middle part)
      const parts = dataStr.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode base64url payload
      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
      const parsed = JSON.parse(decoded);

      // Check if wrapped in 'nats' object (standard NATS Auth Callout format)
      authRequest = parsed.nats || parsed;
      this.logger.debug(
        `[Auth-Step 2] Request decoded. UserNkey: ${authRequest.user_nkey || authRequest.nkey}`,
      );
    } catch (error) {
      this.logger.error('Error decoding authorization request:', error);
      throw new Error('Invalid authorization request');
    }

    const userNkey = authRequest.user_nkey || authRequest.nkey || '';
    const serverId = authRequest.server_id?.id || authRequest.server?.id || '';

    // Step 3: Handle claims
    let userJWT = '';
    let authError: Error | null = null;

    try {
      const claims = await this.handleClaims(authRequest);
      this.logger.debug(
        '[Auth-Step 5] Claims handled and permissions set SUCCESS',
      );

      // Step 4: Validate and Sign
      userJWT = await this.validateAndSign(claims);
      this.logger.debug(
        '[Auth-Step 6] Response JWT signed SUCCESS. Sending respond...',
      );
    } catch (error) {
      this.logger.error(`[Auth-Step 3/4] Auth FAILED: ${error.message}`);
      authError = error as Error;
    }

    // Step 4: Respond
    return this.respond(userNkey, serverId, userJWT, authError, xKey);
  }

  /**
   * Handle claims from authorization request
   */
  private async handleClaims(req: AuthorizationRequest): Promise<any> {
    const account = this.appConfig.nats.accountName;
    const accountPublicKey = this.issuerKeyPair.getPublicKey();

    // Debug: Log the entire request to see what we have
    this.logger.debug('Auth callout request:', JSON.stringify(req, null, 2));

    // Extract token from connect options
    const connectOpts = req.connect_opts || req.connectOptions;
    const token = connectOpts?.token || connectOpts?.auth_token;

    if (!token) {
      this.logger.error('[Auth-Step 3] No token in connect options');
      throw new Error('No token in connect options');
    }

    // Create base user claims
    const claims: any = {
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 3600, // 24 hours
      iss: accountPublicKey,
      sub: req.user_nkey || req.nkey,
      aud: account,
      name: token, // IMPORTANT: Connect token for tracking
      nats: {
        type: 'user',
        version: 2,
        permissions: {},
      },
    };

    // Verify token
    let tokenData;
    try {
      tokenData = await this.authService.verifyToken(token);
      this.logger.debug(
        `[Auth-Step 3] Token verified for User: ${tokenData.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `[Auth-Step 3] Token verification FAILED: ${error.message}`,
      );
      throw error;
    }

    // Check if recorder
    if (tokenData.name === RECORDER_USER_AUTH_NAME) {
      this.logger.debug('[Auth-Step 4] Handling RECORDER permissions');
      this.setPermissionForRecorder(tokenData, claims.nats);
      return claims;
    }

    // Set permissions for regular client
    this.logger.debug('[Auth-Step 4] Checking User Info in NATS KV...');
    await this.setPermissionForClient(tokenData, claims.nats);

    return claims;
  }

  /**
   * Set permissions for recorder
   */
  private setPermissionForRecorder(tokenData: any, natsClaims: any): void {
    const recorder = this.appConfig.nats.recorder;
    const recorderInfoKv = recorder.infoKv;
    const transcodingJobs = recorder.transcodingJobs;

    const pubAllow = [
      '$JS.API.INFO',
      '_INBOX.>', // otherwise won't be able to send respond msg
      `$JS.API.STREAM.INFO.KV_${recorderInfoKv}`,
      `$KV.${recorderInfoKv}.>`,
      `$JS.API.DIRECT.GET.KV_${recorderInfoKv}.>`,
      // Allow publishing the job to the stream
      transcodingJobs,
      // Allow fetching the next message from the consumer & send ack
      `$JS.API.CONSUMER.MSG.NEXT.${transcodingJobs}.${TRANSCODER_CONSUMER_DURABLE}`,
      `$JS.API.CONSUMER.INFO.${transcodingJobs}.${TRANSCODER_CONSUMER_DURABLE}`,
      `$JS.ACK.${transcodingJobs}.${TRANSCODER_CONSUMER_DURABLE}.>`,
    ];

    natsClaims.permissions = {
      pub: { allow: pubAllow },
      sub: {
        allow: [recorder.channel, '_INBOX.>'],
      },
    };
    // Clean up old structure if exists
    delete natsClaims.pub;
    delete natsClaims.sub;
  }

  /**
   * Set permissions for client
   */
  private async setPermissionForClient(
    tokenData: any,
    natsClaims: any,
  ): Promise<void> {
    const roomId = tokenData.roomId || tokenData.room_id;
    const userId = tokenData.userId || tokenData.user_id;

    // ✅ CRITICAL: Check user info exists
    const userInfo = await this.userInfoService.getUserInfo(roomId, userId);
    if (!userInfo) {
      throw new Error(
        `User info not found for userId: ${userId}, roomId: ${roomId}`,
      );
    }

    // Create single user consumer
    const consumerPermissions = await this.consumerService.createUserConsumer(
      roomId,
      userId,
    );

    const subjects = this.appConfig.nats.subjects;
    const sysJsWorker = subjects.systemJsWorker;
    const sysPublicSubject = subjects.systemPublic;
    const chatSubject = subjects.chat;
    const whiteboardSubject = subjects.whiteboard;
    const dataChannelSubject = subjects.dataChannel;

    const allowPub = [
      '$JS.API.INFO',
      // permissions for consumer (JetStream)
      ...consumerPermissions,
      // permission to publish messages to the system (JetStream)
      `${sysJsWorker}.${roomId}.${userId}`,
      // permission to publish in core pub/sub
      `${chatSubject}.${roomId}`,
      `${whiteboardSubject}.${roomId}`,
      `${dataChannelSubject}.${roomId}`,
    ];

    // Assign Permissions, adhering to JWT Claims structure
    natsClaims.permissions = {
      pub: { allow: allowPub },
      sub: {
        allow: [
          '_INBOX.>', // otherwise break request-reply patterns
          // allow to subscribe in pub/sub channel system public which is different from JetStream
          `${sysPublicSubject}.${roomId}`,
          // other core pub/sub channels
          `${chatSubject}.${roomId}`,
          `${whiteboardSubject}.${roomId}`,
          `${dataChannelSubject}.${roomId}`,
        ],
      },
    };

    // Clean up old structure if exists in object
    delete natsClaims.pub;
    delete natsClaims.sub;
  }

  /**
   * Create authorization response
   */
  private respond(
    userNKey: string,
    serverId: string,
    userJWT: string,
    error: Error | null,
    xKey?: string,
  ): Buffer {
    const accountPublicKey = this.issuerKeyPair.getPublicKey();

    const responseObject: any = {
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
      iss: accountPublicKey,
      sub: userNKey,
      aud: serverId,
      nats: {
        type: 'authorization_response',
        version: 2,
      },
    };

    if (error) {
      responseObject.nats.error = error.message;
    } else {
      responseObject.nats.jwt = userJWT;
    }

    // Encode response
    let data: Buffer;
    try {
      const token = this.generateJwt(responseObject);
      data = Buffer.from(token);
    } catch (err) {
      this.logger.error('Error encoding response jwt:', err);
      return Buffer.from('');
    }

    // Check if encryption is required
    if (xKey && xKey.length > 0 && this.curveKeyPair) {
      try {
        const encrypted = this.curveKeyPair.seal(data, xKey);
        if (encrypted) {
          data = Buffer.from(encrypted);
        }
      } catch (err) {
        this.logger.error('Error encrypting response JWT:', err);
        return Buffer.from('');
      }
    }

    return data;
  }

  /**
   * Validate and sign user claims
   */
  private async validateAndSign(claims: any): Promise<string> {
    try {
      return this.generateJwt(claims);
    } catch (error) {
      this.logger.error('Error signing claims:', error);
      throw error;
    }
  }

  /**
   * Generate JWT from payload
   */
  private generateJwt(payload: any): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'ed25519-nkey', typ: 'JWT' }),
    ).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    // Standard JWT signing: sign(header + '.' + payload)
    const signature = this.issuerKeyPair.sign(
      Buffer.from(`${header}.${payloadB64}`),
    );
    const signatureB64 = Buffer.from(signature).toString('base64url');

    return `${header}.${payloadB64}.${signatureB64}`;
  }
}
