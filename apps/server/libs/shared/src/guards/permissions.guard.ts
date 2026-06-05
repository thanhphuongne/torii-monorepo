import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const requester = request.requester;

    if (!requester || !requester.permissions) {
      throw new UnauthorizedException('User permissions not found');
    }

    const userPermissions = requester.permissions as string[];

    // Check if user has ANY required permissions for this endpoint
    const hasAnyPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAnyPermission) {
      throw new ForbiddenException(
        `Missing required permissions: one of [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
