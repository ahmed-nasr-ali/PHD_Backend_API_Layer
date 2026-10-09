import { z } from 'zod';
import { invitationCodeSchema } from './fields/invitation-code.schema';

/** extra field → 422 */
export const checkInvitationCodeSchema = z.strictObject({
  code: invitationCodeSchema,
});

export type CheckInvitationCodeDto = z.infer<typeof checkInvitationCodeSchema>;
