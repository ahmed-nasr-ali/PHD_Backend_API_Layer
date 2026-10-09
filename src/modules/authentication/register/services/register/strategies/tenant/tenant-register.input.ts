import type { RegisteredAs } from '../../../../../shared/domain/enums/registered-as.enum';
import type { UserIdentity } from '../../../../domain/models/user-identity.model';

/** What TenantRegistrationStrategy needs: name + mobile come from the invitation, not from here. */
export interface TenantRegisterInput {
  type: RegisteredAs.Tenant;
  invitationId: string;
  code: string;
  identity: UserIdentity;
  email: string;
  password: string;
  notificationToken: string;
}
