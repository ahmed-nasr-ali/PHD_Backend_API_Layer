import { OtpResendTooSoonError } from '../errors/otp.errors';
import { OtpUser } from '../models/otp-user.model';

/** Minimum wait between two sends (same as the app's timer today). */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * none sent → allowed · less than 60 s since the last send → OTP_RESEND_TOO_SOON + seconds left · else → allowed
 * Seconds left are capped at 60: a CRM clock ahead of ours never makes the app wait longer.
 */
export function ensureResendAllowed(user: OtpUser, now: Date): void {
  const sentAt = user.otpSentAt;
  if (!sentAt) {
    return;
  }

  const waitMs =
    sentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - now.getTime();
  if (waitMs > 0) {
    throw new OtpResendTooSoonError(
      Math.min(Math.ceil(waitMs / 1000), RESEND_COOLDOWN_SECONDS),
    );
  }
}
