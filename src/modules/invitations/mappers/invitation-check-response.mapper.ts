import { Invitation } from '../domain/models/invitation.model';
import { InvitationCheckResponseDto } from '../dto/responses/invitation-check-response.dto';

/** Translates a checked invitation into the `check-code` response. */
export class InvitationCheckResponseMapper {
  static toResponse(invitation: Invitation): InvitationCheckResponseDto {
    return {
      invitationId: invitation.id,
      role: invitation.invitedAs,
      name: invitation.name,
      mobile: invitation.mobile,
      relationship: invitation.relationship,
      termsAndConditions: invitation.termsAndConditions,
    };
  }
}
