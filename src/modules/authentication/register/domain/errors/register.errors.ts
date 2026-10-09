import { BusinessError, BusinessErrorKind } from '../../../../../core/errors';
import { AuthenticationErrorCode } from '../../../shared/domain/enums/authentication-error-code.enum';

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

export class NotPhdCustomerError extends BusinessError {
  readonly kind = BusinessErrorKind.Forbidden;

  constructor() {
    super(
      'This user is not in the Palm Hills community',
      AuthenticationErrorCode.NotPhdCustomer,
    );
  }
}
