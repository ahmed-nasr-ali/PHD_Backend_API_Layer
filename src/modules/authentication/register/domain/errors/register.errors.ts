import { BusinessError, BusinessErrorKind } from '../../../../core/errors';
import { AuthenticationErrorCode } from '../enums/authentication-error-code.enum';

export class UserExistsError extends BusinessError {
  readonly kind = BusinessErrorKind.Conflict;

  /** @param hasCompleteAccount true → one of the found users already finished registering (has a selfie) */
  constructor(readonly hasCompleteAccount: boolean) {
    super(
      'This user already has an account. Please log in',
      AuthenticationErrorCode.UserExists,
    );
  }
}

/** The CRM team deactivated this account: registering again can't bring it back. */
export class UserDeactivatedError extends BusinessError {
  readonly kind = BusinessErrorKind.Forbidden;

  constructor() {
    super(
      'This account is deactivated. Please contact support',
      AuthenticationErrorCode.UserDeactivated,
    );
  }
}

export class NotPhdCustomerError extends BusinessError {
  readonly kind = BusinessErrorKind.Forbidden;

  constructor() {
    super(
      'This user is not in the Palm Hills community',
      AuthenticationErrorCode.NotPhdCustomer,
    );
  }
}
