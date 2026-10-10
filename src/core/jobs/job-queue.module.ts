import { Module } from '@nestjs/common';
import { BullmqJobQueue } from './bullmq/bullmq-job-queue';
import { BullmqJobRunner } from './bullmq/bullmq-job-runner';
import { JobQueue } from './job-queue';
import {
  jobQueueConfigProvider,
  redisConfigProvider,
} from './job-queue.providers';
import { JobRunner } from './job-runner';

/** Gives features a JobQueue (and modules/jobs a JobRunner). Today: Redis through BullMQ. Azure Queue later = two useClass lines here, nothing else. */
@Module({
  providers: [
    redisConfigProvider,
    jobQueueConfigProvider,
    { provide: JobQueue, useClass: BullmqJobQueue },
    { provide: JobRunner, useClass: BullmqJobRunner },
  ],
  exports: [JobQueue, JobRunner],
})
export class JobQueueModule {}
