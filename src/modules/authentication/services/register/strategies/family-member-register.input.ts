import type { RegisteredAs } from '../../../domain/enums/registered-as.enum';
import type { UserIdentity } from '../../../domain/models/user-identity.model';

/** What FamilyMemberRegistrationStrategy needs: name + mobile come from the invitation, not from here. */
export interface FamilyMemberRegisterInput {
  type: RegisteredAs.FamilyMember;
  invitationId: string;
  code: string;
  birthDate: Date;
  identity: UserIdentity;
  email: string;
  password: string;
  notificationToken: string;
}
