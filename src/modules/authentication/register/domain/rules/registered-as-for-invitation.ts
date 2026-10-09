import { InvitedAs } from '../../../invitations/domain/enums/invited-as.enum';
import { RegisteredAs } from '../enums/registered-as.enum';

/** Invitation type (`com_to`) → the user type it registers as (`com_registeredas`). */
const REGISTERED_AS_BY_INVITATION: Record<InvitedAs, RegisteredAs | null> = {
  [InvitedAs.FamilyMember]: RegisteredAs.FamilyMember,
  [InvitedAs.Tenant]: RegisteredAs.Tenant,
  [InvitedAs.Helpers]: null,
  [InvitedAs.Ref]: RegisteredAs.Ref,
  [InvitedAs.TenantFamilyMember]: RegisteredAs.TenantFamilyMember,
  [InvitedAs.RefOwner]: RegisteredAs.RefOwner,
};

/** known invitation type → its user type · Helpers or empty → null (not supported) */
export function registeredAsForInvitation(
  invitedAs: InvitedAs | null,
): RegisteredAs | null {
  return invitedAs === null ? null : REGISTERED_AS_BY_INVITATION[invitedAs];
}
