/** Codes the jobs feature returns in the error envelope. Part of the API contract: never rename a value. */
export enum JobErrorCode {
  NotFound = 'JOB_NOT_FOUND',
  NotFailed = 'JOB_NOT_FAILED',
}
