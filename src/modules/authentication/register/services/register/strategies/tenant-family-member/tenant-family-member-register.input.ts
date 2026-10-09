import type { RegisteredAs } from '../../../../../shared/domain/enums/registered-as.enum';
import type { UserIdentity } from '../../../../domain/models/user-identity.model';

/** What TenantFamilyMemberRegistrationStrategy needs: name + mobile come from the invitation, not from here. */
export interface TenantFamilyMemberRegisterInput {
  type: RegisteredAs.TenantFamilyMember;
  invitationId: string;
  code: string;
  birthDate: Date;
  identity: UserIdentity;
  email: string;
  password: string;
  notificationToken: string;
}
