import { OtpUser } from '../domain/models/otp-user.model';

/**
 * What verify / resend need from user storage (`com_users`).
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class OtpUserRepository {
  /** The user with this id · no such user → null */
  abstract findById(id: string): Promise<OtpUser | null>;

  /** The owner proved the mobile is theirs (the right OTP). */
  abstract markMobileVerified(id: string): Promise<void>;

  /** Asks the CRM for a new OTP: it makes a new code with a 5-min expiry and sends the SMS. */
  abstract requestOtp(id: string): Promise<void>;
}
