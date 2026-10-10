import { RegisteredAs } from '../../../authentication/shared/domain/enums/registered-as.enum';
import { Relationship } from '../../../invitations/domain/enums/relationship.enum';

/** What the documents step needs to know about a user (from `com_users` and, for invited users, their invitation). */
export interface DocumentsUserProps {
  id: string;
  /** `null` when the CRM holds a value the enum doesn't know. */
  registeredAs: RegisteredAs | null;
  birthDate: Date | null;
  /** statecode Inactive → deactivated by the CRM team. */
  isDeactivated: boolean;
  /** The invitation linked to this user (com_LinkedUser). Owners have none → null. */
  invitationId: string | null;
  /** From the linked invitation. No invitation, or a value the enum doesn't know → null. */
  relationship: Relationship | null;
}
