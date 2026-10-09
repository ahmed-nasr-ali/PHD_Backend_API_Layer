import { z } from 'zod';

/** CRM record id. `z.guid()`, not `z.uuid()`: CRM ids (e.g. …-f011-…) fail the strict UUID version check. */
export const invitationIdSchema = z.guid('Invitation id is not valid');
