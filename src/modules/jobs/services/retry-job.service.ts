import { Injectable } from '@nestjs/common';
import { JobQueue, JobStatus, type JobSnapshot } from '../../../core/jobs';
import { JobNotFailedError, JobNotFoundError } from '../domain/errors/job.errors';

/** Runs a failed job again with 3 fresh attempts. */
@Injectable()
export class RetryJobService {
  constructor(private readonly jobs: JobQueue) {}

  /**
   * Checks the job, puts it back in the queue and gives it back as it is now.
   * Failed → queued again · no such job → JobNotFoundError · waiting, running or done (or retried by someone else a moment ago) → JobNotFailedError
   */
  async execute(jobId: string): Promise<JobSnapshot> {
    const job = await this.findOrThrow(jobId);
    if (job.status !== JobStatus.Failed || !(await this.jobs.retry(jobId))) {
      throw new JobNotFailedError(jobId);
    }
    return this.findOrThrow(jobId);
  }

  private async findOrThrow(jobId: string): Promise<JobSnapshot> {
    const job = await this.jobs.find(jobId);
    if (!job) {
      throw new JobNotFoundError(jobId);
    }
    return job;
  }
}
