import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Worker } from 'bullmq';
import { JobQueueConfig } from '../config/job-queue.config';
import { RedisConfig } from '../config/redis.config';
import { JobRunner } from '../job-runner';
import type { JobName } from '../models/job-name.enum';
import type { RunningJob } from '../models/running-job';
import { describeRedisError } from './describe-redis-error';

/** Runs the jobs kept in Redis through a BullMQ Worker, one at a time. */
@Injectable()
export class BullmqJobRunner
  extends JobRunner
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(BullmqJobRunner.name);
  private worker?: Worker;

  constructor(
    private readonly redis: RedisConfig,
    private readonly config: JobQueueConfig,
  ) {
    super();
  }

  start(run: (job: RunningJob) => Promise<void>): void {
    this.worker = new Worker(
      this.config.queueName,
      (job) =>
        run({ id: String(job.id), name: job.name as JobName, data: job.data }),
      {
        connection: { url: this.redis.url },
        settings: {
          // After attempt 1 fails → wait retryDelaysMs[0] · after attempt 2 → retryDelaysMs[1]
          backoffStrategy: (attemptsMade) =>
            this.config.retryDelaysMs[attemptsMade - 1],
        },
      },
    );
    // Without a listener, a lost Redis connection would crash the whole server. With it: logged, and BullMQ keeps reconnecting.
    this.worker.on('error', (error) =>
      this.logger.error(`Redis worker error: ${describeRedisError(error)}`),
    );
    // Every failed attempt is logged; the last one is also kept on the job (GET /jobs/failed).
    this.worker.on('failed', (job, error) =>
      this.logger.error(
        `Job ${job?.id} (${job?.name}) attempt ${job?.attemptsMade} failed: ${error.message}`,
      ),
    );
  }

  /** Server stopping (e.g. a deploy) → take no new job and wait for the running one to finish, so it is not cut in the middle. */
  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
