import {
  BusinessError,
  BusinessErrorKind,
  RetryLaterError,
} from '../../../../../core/errors';
import { AuthenticationErrorCode } from '../../../shared/domain/enums/authentication-error-code.enum';

export class UserNotFoundError extends BusinessError {
  readonly kind = BusinessErrorKind.NotFound;

  constructor() {
    super('User not found', AuthenticationErrorCode.UserNotFound);
  }
}

/** Only owners get an OTP: invited users are already proven by their invitation. */
export class OtpNotAllowedError extends BusinessError {
  readonly kind = BusinessErrorKind.Forbidden;

  constructor() {
    super(
      'Only owners verify their mobile with a code',
      AuthenticationErrorCode.OtpNotAllowed,
    );
  }
}

export class OtpInvalidError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;

  constructor() {
    super('The code is incorrect', AuthenticationErrorCode.OtpInvalid);
  }
}

export class OtpExpiredError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;

  constructor() {
    super(
      'The code has expired. Please request a new one',
      AuthenticationErrorCode.OtpExpired,
    );
  }
}

/** A new code was asked for too soon after the last one: 429 + the seconds left. */
export class OtpResendTooSoonError extends RetryLaterError {
  constructor(retryAfterSeconds: number) {
    super(
      `Please wait ${retryAfterSeconds} seconds before requesting a new code`,
      AuthenticationErrorCode.OtpResendTooSoon,
      retryAfterSeconds,
    );
  }
}
