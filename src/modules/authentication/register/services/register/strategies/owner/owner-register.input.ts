import type { RegisteredAs } from '../../../../../shared/domain/enums/registered-as.enum';
import type { UserIdentity } from '../../../../domain/models/user-identity.model';

/** What OwnerRegistrationStrategy needs: everything comes from the form (no invitation). */
export interface OwnerRegisterInput {
  type: RegisteredAs.Owner;
  name: string;
  mobile: string;
  identity: UserIdentity;
  email: string;
  password: string;
  notificationToken: string;
}
