import { IdentityKind } from '../enums/identity-kind.enum';

/** National ID or passport: exactly one of them. */
export interface UserIdentity {
  kind: IdentityKind;
  number: string;
}
