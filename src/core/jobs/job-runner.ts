import type { RunningJob } from './models/running-job';

/** Takes jobs from the queue one by one and runs them. When the server stops, it waits for the running job to finish first. */
export abstract class JobRunner {
  /**
   * Starts taking jobs and gives each one to `run`.
   * run resolves → Done · run throws → tried again later, and Failed after the 3rd attempt
   */
  abstract start(run: (job: RunningJob) => Promise<void>): void;
}
