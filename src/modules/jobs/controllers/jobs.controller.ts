import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { zodParam } from '../../../core/validation/presets';
import { jobIdSchema } from '../dto/requests/job-id.dto';
import type { JobResponseDto } from '../dto/responses/job-response.dto';
import { JobResponseMapper } from '../mappers/job-response.mapper';
import { ListFailedJobsService } from '../services/list-failed-jobs.service';
import { RetryJobService } from '../services/retry-job.service';

/** Lets us see the background jobs that failed and run them again (for us only, not for the app). */
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly listFailedJobs: ListFailedJobsService,
    private readonly retryJob: RetryJobService,
  ) {}

  /** The jobs that failed for good, newest first, with their error. */
  @Get('failed')
  async listFailed(): Promise<JobResponseDto[]> {
    const jobs = await this.listFailedJobs.execute();
    return jobs.map((job) => JobResponseMapper.toResponse(job));
  }

  /** Runs a failed job again. It creates nothing, so it answers 200 instead of POST's default 201. */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retry(
    @Param('id', zodParam(jobIdSchema)) id: string,
  ): Promise<JobResponseDto> {
    const job = await this.retryJob.execute(id);
    return JobResponseMapper.toResponse(job);
  }
}
