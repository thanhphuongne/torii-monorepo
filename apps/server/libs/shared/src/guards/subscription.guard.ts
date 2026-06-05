import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requester = request['requester'];

    if (!requester || !requester.sub) {
      this.logger.warn(
        '[SubscriptionGuard] No requester information found in request',
      );
      throw new ForbiddenException('Authentication required');
    }

    const userId = requester.sub;
    const now = new Date();

    // Check for active subscription (stub)
    const activeSubscription = true;

    if (!activeSubscription) {
      this.logger.warn(
        `[SubscriptionGuard] User ${userId} does not have an active subscription`,
      );
      throw new ForbiddenException(
        'Active subscription required to access this feature',
      );
    }

    request['subscription'] = {
      id: 'active',
      tier: 'plus', // Stubbed for now
    };

    return true;
  }
}
