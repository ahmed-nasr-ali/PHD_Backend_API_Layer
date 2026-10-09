import { OtpExpiredError, OtpInvalidError } from '../errors/otp.errors';
import { OtpUser } from '../models/otp-user.model';

/**
 * wrong code → OTP_INVALID · right code after its expiry → OTP_EXPIRED · else → nothing
 * Wrong is checked first: a guesser never learns whether a code has expired.
 */
export function ensureOtpValid(user: OtpUser, otp: string, now: Date): void {
  if (!user.isOtpCorrect(otp)) {
    throw new OtpInvalidError();
  }
  if (user.isOtpExpired(now)) {
    throw new OtpExpiredError();
  }
}
