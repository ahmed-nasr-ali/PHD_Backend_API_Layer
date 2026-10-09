import { InvitedAs } from '../../domain/enums/invited-as.enum';
import { Relationship } from '../../domain/enums/relationship.enum';

/** The JSON returned by `POST /invitations/check-code`. Numbers are the CRM option-set values. */
export interface InvitationCheckResponseDto {
  /** The invitation's id; later steps send it back (e.g. to close the invitation). */
  invitationId: string;
  /** CRM `com_to`; always set for a valid invitation. */
  role: InvitedAs | null;
  name: string | null;
  mobile: string | null;
  /** CRM `com_relationship`. */
  relationship: Relationship | null;
  /** Empty unless the invitation is for a Tenant. */
  termsAndConditions: string[];
}
