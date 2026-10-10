/**
 * How jobs are retried and kept. The values are set once in job-queue.providers.ts (not in .env: they are the same everywhere);
 * a test gives its own with overrideProvider(JobQueueConfig), e.g. short waits instead of minutes.
 */
export class JobQueueConfig {
  /** The one queue every job goes through (the job's name tells which handler runs it). */
  readonly queueName: string;
  /** How long to wait before attempt 2, 3, … (attempt 1 runs at once). One wait per retry. */
  readonly retryDelaysMs: number[];
  /** Done jobs are removed after this. Failed jobs are never removed by themselves: they are our log until someone retries them. */
  readonly doneKeptSeconds: number;
  /** 1 first attempt + one per wait, e.g. 2 waits → 3 attempts. */
  readonly attempts: number;

  constructor(values: {
    queueName: string;
    retryDelaysMs: number[];
    doneKeptSeconds: number;
  }) {
    this.queueName = values.queueName;
    this.retryDelaysMs = values.retryDelaysMs;
    this.doneKeptSeconds = values.doneKeptSeconds;
    this.attempts = values.retryDelaysMs.length + 1;
  }
}
