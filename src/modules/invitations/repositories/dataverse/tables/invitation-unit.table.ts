import { InvitationCompoundTableRow } from './invitation-compound.table';

/** A `com_units` row as the invitation query returns it (only the columns it selects). */
export interface InvitationUnitTableRow {
  com_unitid: string;
  /** `null` when the unit's compound lookup is empty. */
  com_Compound: InvitationCompoundTableRow | null;
}
