import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { JanitorRoomService } from './janitor-room.service';
import { JanitorUserService } from './janitor-user.service';
import { JanitorFilesystemService } from './janitor-filesystem.service';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';

@Injectable()
export class JanitorService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(JanitorService.name);
  private isShutdown = false;
  private leaderLockVal: string = '';
  private readonly leaderLockTTL = 60; // 1 minute
  private readonly leaderRenewal = 30 * 1000; // 30 seconds
  private taskTicker: NodeJS.Timeout | null = null;
  private renewalTicker: NodeJS.Timeout | null = null;

  constructor(
    private readonly janitorRoomService: JanitorRoomService,
    private readonly janitorUserService: JanitorUserService,
    private readonly janitorFilesystemService: JanitorFilesystemService,
    private readonly redisLock: RedisLockService,
  ) {}

  onApplicationBootstrap() {
    this.startJanitor();
  }

  onApplicationShutdown() {
    this.shutdown();
  }

  private startJanitor() {
    this.logger.log('Janitor starting, attempting to acquire leader lock...');
    this.runLeaderElectionLoop();
  }

  private async runLeaderElectionLoop() {
    while (!this.isShutdown) {
      try {
        const { acquired, lockValue } =
          await this.redisLock.acquireJanitorLeaderLock(this.leaderLockTTL);
        if (acquired) {
          this.logger.log(
            `Acquired janitor leader lock (val: ${lockValue}). Starting tasks.`,
          );
          this.leaderLockVal = lockValue;
          await this.runJanitorTasks();
          this.logger.warn('Stopped being the janitor leader.');
          this.leaderLockVal = '';
        } else {
          // Not leader, wait and retry
          await new Promise((resolve) =>
            setTimeout(resolve, this.leaderRenewal),
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to check for janitor leader lock: ${error.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.leaderRenewal));
      }
    }
  }

  private async runJanitorTasks() {
    // Start renewal ticker
    this.startRenewalTicker();

    // Tasks schedules
    let nextUserCheck = Date.now() + 60 * 1000; // 1 min
    let nextRoomCheck = Date.now() + 5 * 60 * 1000; // 5 min
    let nextBackupCheck = Date.now() + 60 * 60 * 1000; // 1 hour
    const tickInterval = 5000;

    return new Promise<void>((resolve) => {
      this.taskTicker = setInterval(async () => {
        if (this.isShutdown || !this.leaderLockVal) {
          this.stopJanitorTasks();
          resolve();
          return;
        }

        const now = Date.now();

        // 1. Check room duration (every tick e.g 5s)
        await this.janitorRoomService.checkRoomWithDuration();

        // 2. Check online users (every 1 min)
        if (now > nextUserCheck) {
          await this.janitorUserService.checkOnlineUsersStatus();
          nextUserCheck = Date.now() + 60 * 1000;
        }

        // 3. Check active rooms (every 5 min)
        if (now > nextRoomCheck) {
          await this.janitorRoomService.activeRoomChecker();
          nextRoomCheck = Date.now() + 5 * 60 * 1000;
        }

        // 4. Check backups (every 1 hour)
        if (now > nextBackupCheck) {
          await this.janitorFilesystemService.checkDelRecordingBackupPath();
          await this.janitorFilesystemService.checkDelArtifactsBackupPath();
          nextBackupCheck = Date.now() + 60 * 60 * 1000;
        }
      }, tickInterval);
    });
  }

  private startRenewalTicker() {
    if (this.renewalTicker) clearInterval(this.renewalTicker);
    this.renewalTicker = setInterval(async () => {
      if (this.isShutdown || !this.leaderLockVal) {
        if (this.renewalTicker) clearInterval(this.renewalTicker);
        return;
      }

      try {
        // Renew lock
        const renewed = await this.redisLock.renewJanitorLeadershipLock(
          this.leaderLockVal,
          this.leaderLockTTL,
        );
        if (!renewed) {
          this.logger.warn(
            'Failed to renew janitor leader lock, stopping tasks.',
          );
          this.stopJanitorTasks();
          this.leaderLockVal = '';
          // The main loop runJanitorTasks promise will resolve due to !this.leaderLockVal check in taskTicker
        }
      } catch (error) {
        this.logger.error(`Error renewing lock: ${error.message}`);
      }
    }, this.leaderRenewal);
  }

  private stopJanitorTasks() {
    if (this.taskTicker) {
      clearInterval(this.taskTicker);
      this.taskTicker = null;
    }
    if (this.renewalTicker) {
      clearInterval(this.renewalTicker);
      this.renewalTicker = null;
    }
  }

  private async shutdown() {
    this.isShutdown = true;
    this.logger.log('Janitor shutting down.');
    this.stopJanitorTasks();

    if (this.leaderLockVal) {
      await this.redisLock.releaseJanitorLeadershipLock(this.leaderLockVal);
      this.leaderLockVal = '';
    }
  }
}
