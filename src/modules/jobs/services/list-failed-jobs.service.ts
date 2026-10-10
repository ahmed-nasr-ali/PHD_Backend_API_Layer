import { Injectable } from '@nestjs/common';
import { JobQueue, type JobSnapshot } from '../../../core/jobs';

/** How many failed jobs one call shows at most, newest first. */
const FAILED_JOBS_SHOWN = 100;

/** Gives the jobs that failed for good, with their error, so we can see what went wrong. */
@Injectable()
export class ListFailedJobsService {
  constructor(private readonly jobs: JobQueue) {}

  async execute(): Promise<JobSnapshot[]> {
    return this.jobs.listFailed(FAILED_JOBS_SHOWN);
  }
}
