import { z } from 'zod';

export const checkInvitationCodeSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Za-z0-9]{8}$/, 'Code must be exactly 8 letters or digits'),
});

export type CheckInvitationCodeDto = z.infer<typeof checkInvitationCodeSchema>;
