import type { JobName } from './job-name.enum';
import type { JobStatus } from './job-status.enum';

/** A job as it is right now in the queue. */
export interface JobSnapshot {
  id: string;
  name: JobName;
  status: JobStatus;
  data: object;
  /** How many times it has run so far (1 to 3). */
  attempts: number;
  /** The message of the last failure. Never failed → null. */
  error: string | null;
  createdAt: Date;
  /** When it finished (done or failed for good). Still waiting or running → null. */
  finishedAt: Date | null;
}
