import { z } from 'zod';
import { otpSchema } from './fields/otp.schema';
import { userIdSchema } from './fields/user-id.schema';

/** missing field → 422 · extra field → 422 */
export const verifyOtpSchema = z.strictObject({
  userId: userIdSchema,
  otp: otpSchema,
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
