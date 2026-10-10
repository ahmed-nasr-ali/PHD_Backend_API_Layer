import { BusinessError, BusinessErrorKind } from '../../../../core/errors';
import { RegisteredAs } from '../../../authentication/shared/domain/enums/registered-as.enum';
import { DocumentErrorCode } from '../enums/document-error-code.enum';
import { DocumentKind } from '../enums/document-kind.enum';

export class DocumentsUserNotFoundError extends BusinessError {
  readonly kind = BusinessErrorKind.NotFound;

  constructor(userId: string) {
    super(`User ${userId} was not found`, DocumentErrorCode.UserNotFound);
  }
}

/** The CRM team deactivated this user, so they can't send documents. */
export class DocumentsUserDeactivatedError extends BusinessError {
  readonly kind = BusinessErrorKind.Forbidden;

  constructor() {
    super('This account is deactivated', DocumentErrorCode.UserDeactivated);
  }
}

/** The request says one user type, the CRM record says another (e.g. `type` Owner for a tenant). */
export class DocumentsTypeMismatchError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;

  constructor(sent: RegisteredAs, stored: RegisteredAs | null) {
    super(
      `The user type ${sent} does not match the account (${stored ?? 'unknown'})`,
      DocumentErrorCode.TypeMismatch,
    );
  }
}

/** Documents this user must send but didn't, e.g. the marriage certificate of a spouse. */
export class DocumentsMissingError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;

  constructor(readonly documents: DocumentKind[]) {
    super(
      `Missing documents: ${documents.join(', ')}`,
      DocumentErrorCode.Missing,
    );
  }
}

/** Documents this user must not send, e.g. a marriage certificate from a child. */
export class DocumentNotExpectedError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;

  constructor(readonly documents: DocumentKind[]) {
    super(
      `Documents not expected for this user: ${documents.join(', ')}`,
      DocumentErrorCode.NotExpected,
    );
  }
}
