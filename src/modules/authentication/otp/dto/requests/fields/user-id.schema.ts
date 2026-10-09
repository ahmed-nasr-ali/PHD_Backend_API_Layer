import { z } from 'zod';

/** CRM record id. `z.guid()`, not `z.uuid()`: CRM ids (e.g. …-f011-…) fail the strict UUID version check. */
export const userIdSchema = z.guid('User id is not valid');
