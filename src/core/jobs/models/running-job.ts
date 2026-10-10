import type { JobName } from './job-name.enum';

/** A job the runner took from the queue and is handing to its handler. */
export interface RunningJob {
  id: string;
  name: JobName;
  data: object;
}
