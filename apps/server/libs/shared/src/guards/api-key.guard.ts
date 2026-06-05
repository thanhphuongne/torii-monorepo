/**
 * API Key Auth Guard
 *
 * Verifies API-KEY and HASH-SIGNATURE headers
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { sendCommonProtoJsonResponse } from '../utils/common';
import { AppConfigService } from '../config/app-config.service';

/**
 * ApiKeyGuard verifies API-KEY and HASH-SIGNATURE
 *
 * Validates:
 * - API-KEY header matches configured key
 * - HASH-SIGNATURE matches HMAC-SHA256 of request body
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly appConfig: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const apiKey = request.headers['api-key'] as string;
    const signature = request.headers['hash-signature'] as string;

    // Get configured API key and secret
    const { apiKey: configApiKey, apiSecret: configSecret } =
      this.appConfig.security.wajlc;

    if (!configApiKey || !configSecret) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      sendCommonProtoJsonResponse(
        response,
        false,
        'Server configuration error',
      );
      return false;
    }

    // Validate API key
    if (apiKey !== configApiKey) {
      response.status(HttpStatus.UNAUTHORIZED);
      sendCommonProtoJsonResponse(response, false, 'Invalid API key');
      return false;
    }

    // Validate signature presence
    if (!signature) {
      response.status(HttpStatus.UNAUTHORIZED);
      sendCommonProtoJsonResponse(
        response,
        false,
        'Hash signature value required',
      );
      return false;
    }

    // Verify HMAC signature
    const body = (request as any).rawBody || request.body;
    const bodyBuffer = Buffer.isBuffer(body)
      ? body
      : Buffer.from(JSON.stringify(body));

    const mac = crypto.createHmac('sha256', configSecret);
    mac.update(bodyBuffer);
    const expectedSignature = mac.digest('hex');

    // Constant-time comparison
    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature),
      )
    ) {
      response.status(HttpStatus.UNAUTHORIZED);
      sendCommonProtoJsonResponse(
        response,
        false,
        "Can't verify provided information",
      );
      return false;
    }

    return true;
  }
}
