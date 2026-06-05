import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

import { AppConfigService } from '@server/shared';

@Injectable()
export class JanitorFilesystemService {
  private readonly logger = new Logger(JanitorFilesystemService.name);

  constructor(private readonly appConfig: AppConfigService) {}

  /**
   * checkDelArtifactsBackupPath will cleanup old artifact backups
   */
  async checkDelArtifactsBackupPath(): Promise<void> {
    if (!this.appConfig.janitor.enableArtifactsBackup) return;

    const durationStr = this.appConfig.janitor.recordingBackupDuration;
    const durationMs = this.parseDurationToMs(durationStr);

    const backupPath = this.appConfig.janitor.artifactsBackupPath;

    await this.cleanupDirectory(backupPath, durationMs, 'artifact');
  }

  /**
   * checkDelRecordingBackupPath will cleanup old recording backups
   */
  async checkDelRecordingBackupPath(): Promise<void> {
    if (!this.appConfig.janitor.enableRecordingBackup) return;

    const durationStr = this.appConfig.janitor.recordingBackupDuration;
    const durationMs = this.parseDurationToMs(durationStr);

    const backupPath = this.appConfig.janitor.recordingBackupPath;

    await this.cleanupDirectory(backupPath, durationMs, 'recording', true);
  }

  private async cleanupDirectory(
    dirPath: string,
    maxAgeMs: number,
    type: string,
    cleanupJson = false,
  ): Promise<void> {
    try {
      const absolutePath = path.isAbsolute(dirPath)
        ? dirPath
        : path.resolve(process.cwd(), dirPath);
      const entries = await fs.readdir(absolutePath, { withFileTypes: true });
      const now = Date.now();
      const threshold = now - maxAgeMs;

      for (const entry of entries) {
        if (entry.isDirectory()) continue;

        const filePath = path.join(absolutePath, entry.name);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < threshold) {
          this.logger.warn(
            `Deleting expired ${type} backup file: ${filePath}, modified: ${new Date(stats.mtimeMs).toISOString()}, threshold: ${new Date(threshold).toISOString()}`,
          );

          await fs.unlink(filePath);

          if (cleanupJson) {
            const jsonPath = filePath + '.json';
            try {
              await fs.access(jsonPath);
              await fs.unlink(jsonPath);
              this.logger.warn(`Deleting associated JSON file: ${jsonPath}`);
            } catch (e) {
              // ignore if json doesn't exist
            }
          }
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(
          `Error cleaning up ${type} backup directory ${dirPath}: ${error.message}`,
        );
      }
    }
  }

  private parseDurationToMs(durationStr: string): number {
    // Simple parser for 72h, 1h, etc.
    const match = durationStr.match(/^(\d+)([hms])$/);
    if (!match) return 72 * 60 * 60 * 1000; // default 72h

    const val = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h':
        return val * 60 * 60 * 1000;
      case 'm':
        return val * 60 * 1000;
      case 's':
        return val * 1000;
      default:
        return val * 60 * 60 * 1000;
    }
  }
}
