/**
 * JWT Auth Guard
 *
 * Verifies JWT token from Authorization header and sets request locals
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { verifyWajlcAccessToken } from '../utils/verify_token';
import { sendCommonProtoJsonResponse } from '../utils/common';
import { AppConfigService } from '../config/app-config.service';

/**
 * JwtAuthGuard verifies the Authorization header token
 *
 * Sets request properties:
 * - req.isAdmin
 * - req.roomId
 * - req.requestedUserId
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly appConfig: AppConfigService) { }

  canActivate(context: ExecutionContext): boolean {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const authHeader = request.headers.authorization;
    let authToken = authHeader;

    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        authToken = token;
      } else if (type && !token) {
        authToken = type;
      }
    }

    // Determine error status based on path
    const path = request.path;
    const errStatus = path.includes('file_upload')
      ? HttpStatus.BAD_REQUEST
      : HttpStatus.UNAUTHORIZED;

    // Check if Authorization header exists
    if (!authToken) {
      response.status(errStatus);
      sendCommonProtoJsonResponse(
        response,
        false,
        'notifications.auth-header-missing',
      );
      return false;
    }

    // Verify token
    try {
      const { apiKey, apiSecret } = this.appConfig.security.wajlc;

      if (!apiKey || !apiSecret) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR);
        sendCommonProtoJsonResponse(
          response,
          false,
          'Server configuration error',
        );
        return false;
      }

      const claims = verifyWajlcAccessToken(
        apiKey,
        apiSecret,
        authToken,
        0, // No graceful period
      );

      // Set request properties
      (request as any).isAdmin = claims.isAdmin;
      (request as any).roomId = claims.roomId;
      (request as any).requestedUserId = claims.userId;
      (request as any).requestedUserName = claims.name;

      return true;
    } catch (error) {
      response.status(errStatus);
      let errMsg = 'notifications.invalid-token';
      if (error instanceof Error && error.message.includes('expired')) {
        errMsg = 'notifications.token-expired';
      }
      sendCommonProtoJsonResponse(response, false, errMsg);
      return false;
    }
  }
}
