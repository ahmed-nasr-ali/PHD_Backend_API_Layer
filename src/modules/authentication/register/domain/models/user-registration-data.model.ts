import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { UserStatus } from '../../../shared/domain/enums/user-status.enum';
import { UserIdentity } from './user-identity.model';

/**
 * What register SENDS to `com_users` (API → CRM). Built by the strategy from the form (and the invitation).
 * new user → a new record with these values · unfinished user (S6) → its record is updated with these values
 * The opposite direction (CRM → API) is `User`.
 */
export interface UserRegistrationData {
  name: string | null;
  mobile: string;
  email: string;
  /** Saved as it is (plain text), as the app does today. */
  password: string;
  identity: UserIdentity;
  birthDate: Date | null;
  registeredAs: RegisteredAs;
  status: UserStatus;
  notificationToken: string;
  /** true → the CRM sends an OTP SMS to the mobile (owner only) · missing → no OTP */
  requestOtp?: boolean;
}
