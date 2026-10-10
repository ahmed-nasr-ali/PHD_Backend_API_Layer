import type { JobSnapshot } from './models/job-snapshot';
import type { NewJob } from './models/new-job';

/**
 * Runs work in the background. Features use only this class, so the queue behind it (Redis today, Azure Queue later)
 * can change without touching them. A job runs up to 3 times (now, +1 min, +5 min) before it is Failed.
 */
export abstract class JobQueue {
  /** Puts the job in the queue and gives back its new id (a UUID) at once, without waiting for it to run. */
  abstract add(job: NewJob): Promise<string>;

  /**
   * The job as it is right now.
   * Found → the job · never added, or Done more than 24 h ago (removed) → null
   */
  abstract find(jobId: string): Promise<JobSnapshot | null>;

  /** The Failed jobs, newest first, at most `limit`. */
  abstract listFailed(limit: number): Promise<JobSnapshot[]>;

  /**
   * Puts a Failed job back in the queue with 3 fresh attempts.
   * Failed → queued again, true · gone, or not Failed (e.g. someone retried it a moment ago) → false, nothing done
   */
  abstract retry(jobId: string): Promise<boolean>;
}
