import type { JobName, JobStatus } from '../../../../core/jobs';

/** A job as the jobs endpoints show it (for us only, not for the app). */
export interface JobResponseDto {
  id: string;
  name: JobName;
  status: JobStatus;
  /** What the job was added with, so we can see whose job it is. */
  data: object;
  attempts: number;
  error: string | null;
  /** ISO date-time, e.g. 2026-10-10T12:30:00.000Z */
  createdAt: string;
  finishedAt: string | null;
}
