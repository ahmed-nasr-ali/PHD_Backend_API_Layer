import { InvitationStatus } from '../enums/invitation-status.enum';
import { InvitedAs } from '../enums/invited-as.enum';
import { Relationship } from '../enums/relationship.enum';
import { InvitationCompound } from './invitation-compound.model';

/** Everything an `Invitation` is built from. */
export interface InvitationProps {
  id: string;
  /** `null` when the CRM holds a value the enum doesn't know. */
  status: InvitationStatus | null;
  invitedAs: InvitedAs | null;
  name: string | null;
  mobile: string | null;
  relationship: Relationship | null;
  createdOn: Date;
  /** One entry per invitation unit, so the same compound can appear more than once. */
  compounds: InvitationCompound[];
}
