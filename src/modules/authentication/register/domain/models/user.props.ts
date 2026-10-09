import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { UserState, UserStatus } from '../../../shared/domain/enums/user-status.enum';
import { UserIdentity } from './user-identity.model';

/** A user as read from `com_users`. The password is written on register (`UserRegistrationData`), never read here. */
export interface UserProps {
  id: string;
  name: string | null;
  mobile: string | null;
  email: string | null;
  identity: UserIdentity | null;
  birthDate: Date | null;
  /** `null` when the CRM holds a value the enum doesn't know. */
  registeredAs: RegisteredAs | null;
  status: UserStatus | null;
  state: UserState | null;
  profilePicturePath: string | null;
}
