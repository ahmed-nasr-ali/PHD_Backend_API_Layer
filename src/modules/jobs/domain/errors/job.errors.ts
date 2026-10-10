import { BusinessError, BusinessErrorKind } from '../../../../core/errors';
import { JobErrorCode } from '../enums/job-error-code.enum';

export class JobNotFoundError extends BusinessError {
  readonly kind = BusinessErrorKind.NotFound;

  constructor(jobId: string) {
    super(`Job ${jobId} was not found`, JobErrorCode.NotFound);
  }
}

/** Only a Failed job can be run again: a waiting or running one is still going, a done one needs nothing. */
export class JobNotFailedError extends BusinessError {
  readonly kind = BusinessErrorKind.Conflict;

  constructor(jobId: string) {
    super(`Job ${jobId} has not failed`, JobErrorCode.NotFailed);
  }
}
