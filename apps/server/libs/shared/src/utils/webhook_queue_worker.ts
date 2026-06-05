/**
 * Simple queue worker for webhook processing
 */

import { Logger } from '@nestjs/common';

/**
 * WebhookQueueWorker provides a basic job queue with a single worker
 */
export class WebhookQueueWorker {
  private jobs: Array<() => void | Promise<void>> = [];
  private processing = false;
  private stopped = false;
  private readonly queueSize: number;
  private readonly logger: Logger;

  /**
   * Creates and starts a new queue worker
   *
   * @param queueSize - Maximum queue size
   * @param logger - Logger instance
   */
  constructor(queueSize: number, logger: Logger) {
    this.queueSize = queueSize;
    this.logger = logger;
    this.start();
  }

  /**
   * Start launches the worker
   */
  private start(): void {
    this.processing = true;
    this.processJobs();
  }

  /**
   * Process jobs from the queue
   */
  private async processJobs(): Promise<void> {
    while (this.processing) {
      if (this.stopped) {
        break;
      }

      const job = this.jobs.shift();
      if (job) {
        try {
          await job();
        } catch (error) {
          this.logger.error('Error processing webhook job:', error);
        }
      } else {
        // No jobs, wait a bit before checking again
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Submit adds a job to the queue
   * It will drop the job if the queue is full
   *
   * @param job - Function to execute
   */
  submit(job: () => void | Promise<void>): void {
    // Check if worker is stopped
    if (this.isStopped()) {
      return;
    }

    // Check if queue is full
    if (this.jobs.length >= this.queueSize) {
      this.logger.warn('webhook queue is full, dropping job');
      return;
    }

    this.jobs.push(job);
  }

  /**
   * StopGracefully waits for all queued jobs to be processed before stopping
   */
  async stopGracefully(): Promise<void> {
    this.stopped = true;

    // Wait for all jobs to complete
    while (this.jobs.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  /**
   * Kill stops the worker immediately, dropping any unprocessed jobs
   */
  kill(): void {
    this.stopped = true;
    this.processing = false;
    this.jobs = [];
  }

  /**
   * isStopped checks if the worker has been stopped
   */
  private isStopped(): boolean {
    return this.stopped;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.jobs.length;
  }
}
