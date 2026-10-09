import { IdentityKind } from '../../domain/enums/identity-kind.enum';
import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { UserStatus } from '../../../shared/domain/enums/user-status.enum';

/**
 * The JSON returned by `POST /auth/register`: the user as the CRM saved it.
 * Never holds the password or the notification token. A field is `null` only when the CRM has no value.
 */
export interface RegisterResponseDto {
  userId: string;
  name: string | null;
  mobile: string | null;
  email: string | null;
  /** CRM `com_registeredas`. */
  registeredAs: RegisteredAs | null;
  /** CRM `statuscode`; Under Review (1) after register. */
  status: UserStatus | null;
  identity: {
    kind: IdentityKind;
    number: string;
  } | null;
  /** YYYY-MM-DD; `null` for types without a birth date. */
  birthDate: string | null;
}
