import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtTokenProvider } from '../providers/jwt-token.provider';
import { AppConfigService } from '../config/app-config.service';
import { verifyWajlcAccessToken } from '../utils/verify_token';
import { BlacklistService } from '../services/blacklist.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.provider';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly logger = new Logger(GatewayAuthGuard.name);

  constructor(
    private readonly jwtTokenProvider: JwtTokenProvider,
    private readonly blacklistService: BlacklistService,
    private readonly reflector: Reflector,
    private readonly appConfig: AppConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    this.logger.log(`[GatewayAuthGuard] Checking auth for ${request.url}`);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractToken(request);
    this.logger.log(
      `[GatewayAuthGuard] Token extracted: ${token ? 'Yes' : 'No'}`,
    );

    if (isPublic) {
      // Even if public, try to extract user info if token exists
      if (token) {
        try {
          const payload = await this.jwtTokenProvider.verifyToken(token);
          if (payload) {
            // For public routes, also try to fetch permissions if sid exists
            if (payload.sid) {
              const permissions = await this.redis.get(
                `session:${payload.sid}:permissions`,
              );
              if (permissions) {
                payload.permissions = JSON.parse(permissions);
              }
            }
            request['requester'] = payload;
          }
        } catch (e) {
          // Ignore error for public routes
        }
      }
      return true;
    }

    if (!token) {
      this.logger.warn('[GatewayAuthGuard] No token provided');
      throw new UnauthorizedException('No token provided');
    }

    let payload = await this.jwtTokenProvider.verifyToken(token);

    if (!payload) {
      // Try verifying as Wajlc token
      try {
        const { wajlc } = this.appConfig.security;
        const wajlcClaims = verifyWajlcAccessToken(
          wajlc.apiKey,
          wajlc.apiSecret,
          token,
        );
        if (wajlcClaims) {
          payload = {
            sub: wajlcClaims.userId,
            role: wajlcClaims.isAdmin ? 'lecturer' : 'student',
            name: wajlcClaims.name,
            roomId: wajlcClaims.roomId,
          } as any;
        }
      } catch (e) {
        this.logger.warn(`[GatewayAuthGuard] Token verification failed for both standard and Wajlc`);
      }
    }

    if (!payload) {
      this.logger.warn(`[GatewayAuthGuard] Token verification failed`);
      throw new UnauthorizedException();
    }

    // Check if token is blacklisted
    if (payload.jti) {
      const isBlacklisted = await this.blacklistService.isBlacklisted(
        payload.jti,
      );
      if (isBlacklisted) {
        this.logger.warn(
          `[GatewayAuthGuard] Token is blacklisted: ${payload.jti}`,
        );
        throw new UnauthorizedException('Token revoked');
      }
    }

    // Fetch permissions from Redis using sid
    if (payload.sid) {
      const permissions = await this.redis.get(
        `session:${payload.sid}:permissions`,
      );
      if (permissions) {
        payload.permissions = JSON.parse(permissions);
        this.logger.debug(
          `[GatewayAuthGuard] Fetched ${payload.permissions?.length} permissions for sid ${payload.sid}`,
        );
      } else {
        this.logger.warn(
          `[GatewayAuthGuard] No permissions found in Redis for sid ${payload.sid}`,
        );
      }
    }

    // Assign payload to request
    request['requester'] = payload;

    this.logger.log(
      `[GatewayAuthGuard] Auth check passed for user ${payload.sub}`,
    );
    return true;
  }

  private extractToken(request: Request): string | undefined {
    // 1. Check Header (Mobile/API)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
      if (type && !token) {
        // Handle cases where Bearer prefix is missing
        return type;
      }
    }

    // 2. Check Cookie (Web)
    if (request.cookies && request.cookies['access_token']) {
      return request.cookies['access_token'];
    }

    this.logger.debug('[GatewayAuthGuard] No token in Header or Cookies');

    return undefined;
  }
}
