import { Injectable } from '@nestjs/common';
import { Invitation } from '../domain/models/invitation.model';
import { pickInvitationForCode } from '../domain/rules/pick-invitation-for-code';
import { InvitationRepository } from '../repositories/invitation.repository';

@Injectable()
export class CheckInvitationCodeService {
  constructor(private readonly invitations: InvitationRepository) {}

  /** The usable invitation for this code; throws the reason when there is none. */
  async execute(code: string): Promise<Invitation> {
    const invitations = await this.invitations.findAllByCode(code);
    return pickInvitationForCode(invitations);
  }
}
