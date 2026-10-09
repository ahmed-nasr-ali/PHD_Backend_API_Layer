import { z } from 'zod';
import { userIdSchema } from './fields/user-id.schema';

/** missing field → 422 · extra field → 422 */
export const resendOtpSchema = z.strictObject({
  userId: userIdSchema,
});

export type ResendOtpDto = z.infer<typeof resendOtpSchema>;
