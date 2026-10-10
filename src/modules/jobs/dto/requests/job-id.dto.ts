import { z } from 'zod';

/** Job ids are UUIDs we create (JobQueue.add) · anything else → 400 */
export const jobIdSchema = z.uuid();
