import { Injectable } from '@nestjs/common';
import {
  InvitationInvalidError,
  InvitationRoleMismatchError,
} from '../../../invitations/domain/errors/invitation.errors';
import { pickInvitationForCode } from '../../../invitations/domain/rules/pick-invitation-for-code';
import { InvitationRepository } from '../../../invitations/repositories/invitation.repository';
import { RegisteredAs } from '../../domain/enums/registered-as.enum';
import { registeredAsForInvitation } from '../../domain/rules/registered-as-for-invitation';

/** What an invited user's record takes from the invitation. */
export interface RegistrationInvitation {
  /** Used to link the registered user to the invitation. */
  id: string;
  name: string | null;
  mobile: string;
}

/** Checks that an invitation can be used to register. */
@Injectable()
export class RegistrationInvitationVerifier {
  constructor(private readonly invitations: InvitationRepository) {}

  /**
   * code → newest Confirmed invitation (same rules as check-code)
   * · id is not this code's invitation, or no mobile → INVITATION_INVALID
   * · invitation type ≠ type → close the invitation + INVITATION_ROLE_MISMATCH
   */
  async verify(
    code: string,
    invitationId: string,
    type: RegisteredAs,
  ): Promise<RegistrationInvitation> {
    const invitations = await this.invitations.findAllByCode(code);
    const invitation = pickInvitationForCode(invitations);

    const sameId = invitation.id.toLowerCase() === invitationId.toLowerCase();

    if (!sameId || !invitation.mobile) {
      throw new InvitationInvalidError();
    }

    if (registeredAsForInvitation(invitation.invitedAs) !== type) {
      await this.invitations.deactivate(invitation.id);
      throw new InvitationRoleMismatchError();
    }

    return {
      id: invitation.id,
      name: invitation.name,
      mobile: invitation.mobile,
    };
  }
}
