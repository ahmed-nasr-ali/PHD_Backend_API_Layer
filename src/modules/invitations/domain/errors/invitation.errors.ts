import { BusinessError, BusinessErrorKind } from '../../../../core/errors';
import { InvitationErrorCode } from '../enums/invitation-error-code.enum';

export class InvitationNotFoundError extends BusinessError {
  readonly kind = BusinessErrorKind.NotFound;

  constructor() {
    super(
      'No invitation was found for this code',
      InvitationErrorCode.NotFound,
    );
  }
}

export class InvitationInvalidError extends BusinessError {
  readonly kind = BusinessErrorKind.Forbidden;

  constructor() {
    super('This invitation is not valid', InvitationErrorCode.Invalid);
  }
}

export class InvitationAlreadyUsedError extends BusinessError {
  readonly kind = BusinessErrorKind.Conflict;

  constructor() {
    super(
      'This invitation has already been used',
      InvitationErrorCode.AlreadyUsed,
    );
  }
}

export class InvitationRoleNotSupportedError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;

  constructor() {
    super(
      'This invitation type is not supported',
      InvitationErrorCode.RoleNotSupported,
    );
  }
}
