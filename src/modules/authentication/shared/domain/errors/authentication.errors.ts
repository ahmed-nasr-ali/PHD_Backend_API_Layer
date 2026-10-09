import { BusinessError, BusinessErrorKind } from '../../../../../core/errors';
import { AuthenticationErrorCode } from '../enums/authentication-error-code.enum';

/** The CRM team deactivated this account: registering again can't bring it back (thrown by register and otp). */
export class UserDeactivatedError extends BusinessError {
  readonly kind = BusinessErrorKind.Forbidden;

  constructor() {
    super(
      'This account is deactivated. Please contact support',
      AuthenticationErrorCode.UserDeactivated,
    );
  }
}
