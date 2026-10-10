import { Module } from '@nestjs/common';
import { JobQueueModule } from '../../core/jobs';
import { JobsController } from './controllers/jobs.controller';
import { ListFailedJobsService } from './services/list-failed-jobs.service';
import { RetryJobService } from './services/retry-job.service';

/** Lets us see the background jobs that failed and run them again. Task 7 adds here the start of the runner with the job handlers. */
@Module({
  imports: [JobQueueModule],
  controllers: [JobsController],
  providers: [ListFailedJobsService, RetryJobService],
})
export class JobsModule {}
