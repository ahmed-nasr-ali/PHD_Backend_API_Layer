import { randomUUID } from 'node:crypto';
import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JobQueueConfig } from '../config/job-queue.config';
import { RedisConfig } from '../config/redis.config';
import { JobQueue } from '../job-queue';
import type { JobSnapshot } from '../models/job-snapshot';
import type { NewJob } from '../models/new-job';
import { describeRedisError } from './describe-redis-error';
import { JobSnapshotMapper } from './mappers/job-snapshot.mapper';

/** Keeps the jobs in Redis through BullMQ. */
@Injectable()
export class BullmqJobQueue extends JobQueue implements OnApplicationShutdown {
  private readonly logger = new Logger(BullmqJobQueue.name);
  private readonly queue: Queue;

  constructor(redis: RedisConfig, config: JobQueueConfig) {
    super();
    this.queue = new Queue(config.queueName, {
      connection: { url: redis.url },
      defaultJobOptions: {
        attempts: config.attempts,
        // 'custom' = the waits come from config.retryDelaysMs, read by the runner (BullmqJobRunner).
        backoff: { type: 'custom' },
        removeOnComplete: { age: config.doneKeptSeconds },
        removeOnFail: false,
      },
    });
    // Without a listener, a lost Redis connection would crash the whole server. With it: logged, and BullMQ keeps reconnecting.
    this.queue.on('error', (error) =>
      this.logger.error(`Redis queue error: ${describeRedisError(error)}`),
    );
  }

  async add(job: NewJob): Promise<string> {
    const jobId = randomUUID();
    await this.queue.add(job.name, job.data, { jobId });
    return jobId;
  }

  async find(jobId: string): Promise<JobSnapshot | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }
    const state = await job.getState();
    // 'unknown' = removed between the two reads.
    return state === 'unknown'
      ? null
      : JobSnapshotMapper.toSnapshot(job, state);
  }

  async listFailed(limit: number): Promise<JobSnapshot[]> {
    const jobs = await this.queue.getFailed(0, limit - 1);
    return jobs.map((job) => JobSnapshotMapper.toSnapshot(job, 'failed'));
  }

  async retry(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return false;
    }
    try {
      await job.retry('failed', { resetAttemptsMade: true });
      return true;
    } catch (error) {
      // BullMQ checks the state inside Redis and throws when the job is not Failed, so two retries at once never queue it twice.
      // Not Failed any more → false · still Failed (another problem, e.g. Redis down) → thrown as it is
      if ((await job.getState()) !== 'failed') {
        return false;
      }
      throw error;
    }
  }

  /** Server stopping → close the Redis connection. */
  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}
