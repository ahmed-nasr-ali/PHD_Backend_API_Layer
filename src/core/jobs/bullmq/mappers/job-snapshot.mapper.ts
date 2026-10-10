import type { Job, JobState } from 'bullmq';
import type { JobName } from '../../models/job-name.enum';
import type { JobSnapshot } from '../../models/job-snapshot';
import { JobStatus } from '../../models/job-status.enum';

/** BullMQ's states in our words. A delayed job is one waiting for its next attempt. */
const STATUS_BY_STATE: Record<JobState, JobStatus> = {
  waiting: JobStatus.Waiting,
  delayed: JobStatus.Waiting,
  prioritized: JobStatus.Waiting,
  'waiting-children': JobStatus.Waiting,
  active: JobStatus.Running,
  completed: JobStatus.Done,
  failed: JobStatus.Failed,
};

/** Turns a BullMQ job into our JobSnapshot. */
export class JobSnapshotMapper {
  static toSnapshot(job: Job, state: JobState): JobSnapshot {
    return {
      id: String(job.id),
      name: job.name as JobName,
      status: STATUS_BY_STATE[state],
      data: job.data,
      attempts: job.attemptsMade,
      error: job.failedReason || null,
      createdAt: new Date(job.timestamp),
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
    };
  }
}
