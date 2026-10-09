import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { UserDeactivatedError } from '../../../shared/domain/errors/authentication.errors';
import { OtpNotAllowedError } from '../errors/otp.errors';
import { OtpUser } from '../models/otp-user.model';

/** deactivated → USER_DEACTIVATED · not an Owner → OTP_NOT_ALLOWED · else → nothing (used by verify and resend) */
export function ensureCanUseOtp(user: OtpUser): void {
  if (user.isDeactivated) {
    throw new UserDeactivatedError();
  }
  if (user.registeredAs !== RegisteredAs.Owner) {
    throw new OtpNotAllowedError();
  }
}
