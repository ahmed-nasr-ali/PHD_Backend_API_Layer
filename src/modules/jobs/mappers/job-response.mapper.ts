import type { JobSnapshot } from '../../../core/jobs';
import type { JobResponseDto } from '../dto/responses/job-response.dto';

/** Turns a job into the jobs response, field by field (the response never depends on the snapshot's shape). */
export class JobResponseMapper {
  static toResponse(job: JobSnapshot): JobResponseDto {
    return {
      id: job.id,
      name: job.name,
      status: job.status,
      data: job.data,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
    };
  }
}
