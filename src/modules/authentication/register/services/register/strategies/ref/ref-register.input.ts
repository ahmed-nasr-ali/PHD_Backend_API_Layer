import type { RegisteredAs } from '../../../../domain/enums/registered-as.enum';
import type { UserIdentity } from '../../../../domain/models/user-identity.model';

/** What RefRegistrationStrategy needs: the name comes from here (S9), the mobile from the invitation. */
export interface RefRegisterInput {
  type: RegisteredAs.Ref;
  invitationId: string;
  code: string;
  name: string;
  identity: UserIdentity;
  email: string;
  password: string;
  notificationToken: string;
}
