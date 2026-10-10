import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobQueueConfig } from './config/job-queue.config';
import { RedisConfig } from './config/redis.config';

/**
 * Reads REDIS_URL, e.g. redis://localhost:6379.
 * Set → the config · missing → the server does not start (same as DV_URL)
 */
export const redisConfigProvider: Provider = {
  provide: RedisConfig,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new RedisConfig({ url: config.getOrThrow<string>('REDIS_URL') }),
};

/** The retry and keep rules for every job: 3 attempts (now, +1 min, +5 min), done jobs kept 24 h. */
export const jobQueueConfigProvider: Provider = {
  provide: JobQueueConfig,
  useValue: new JobQueueConfig({
    queueName: 'jobs',
    retryDelaysMs: [60_000, 300_000],
    doneKeptSeconds: 24 * 60 * 60,
  }),
};
