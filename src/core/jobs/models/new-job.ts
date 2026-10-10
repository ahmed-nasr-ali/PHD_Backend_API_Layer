import type { JobName } from './job-name.enum';

/** A job to put in the queue. */
export interface NewJob {
  name: JobName;
  /** What the handler needs to do the work. Kept as JSON, so plain values only (ids, text, numbers), never a Buffer or a class. */
  data: object;
}
