import { InvitationStatus } from '../enums/invitation-status.enum';
import { InvitedAs } from '../enums/invited-as.enum';
import {
  InvitationAlreadyUsedError,
  InvitationInvalidError,
  InvitationNotFoundError,
  InvitationRoleNotSupportedError,
} from '../errors/invitation.errors';
import { Invitation } from '../models/invitation.model';

/**
 * Picks the invitation a code refers to: the newest Confirmed one.
 * Otherwise throws the reason the code can't be used.
 */
export function pickInvitationForCode(invitations: Invitation[]): Invitation {
  if (invitations.length === 0) {
    throw new InvitationNotFoundError();
  }

  const [newestConfirmed] = invitations
    .filter((invitation) => invitation.status === InvitationStatus.Confirmed)
    .sort((a, b) => b.createdOn.getTime() - a.createdOn.getTime());

  if (newestConfirmed) {
    if (newestConfirmed.invitedAs === InvitedAs.Helpers) {
      throw new InvitationRoleNotSupportedError();
    }
    if (newestConfirmed.invitedAs === null) {
      throw new InvitationInvalidError();
    }
    return newestConfirmed;
  }

  const completed = invitations.some(
    (invitation) => invitation.status === InvitationStatus.Completed,
  );
  if (completed) {
    throw new InvitationAlreadyUsedError();
  }

  throw new InvitationInvalidError();
}
