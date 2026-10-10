/** Where a job is in its life. Our own words, so the queue behind it (Redis today, Azure Queue later) can change. */
export enum JobStatus {
  /** In the queue: not started yet, or waiting for its next attempt. */
  Waiting = 'waiting',
  Running = 'running',
  Done = 'done',
  /** Every attempt failed. Kept with its error until someone runs it again. */
  Failed = 'failed',
}
