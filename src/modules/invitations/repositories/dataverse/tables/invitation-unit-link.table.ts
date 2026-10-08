import { InvitationUnitTableRow } from './invitation-unit.table';

/** A `com_invitationunits` row (links an invitation to a unit) as the invitation query returns it. */
export interface InvitationUnitLinkTableRow {
  com_invitationunitid: string;
  /** `null` when the unit lookup is empty. */
  com_Unit: InvitationUnitTableRow | null;
}
