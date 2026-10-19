import { z } from 'zod';
import { invitationCodeSchema } from './fields/invitation-code.schema';

/** extra field → 422 */
export const checkInvitationCodeSchema = z.strictObject({
  code: z
    .string()
    .regex(/^[A-Za-z0-9]{8}$/, 'Code must be exactly 8 letters or digits'),
});

export type CheckInvitationCodeDto = z.infer<typeof checkInvitationCodeSchema>;
