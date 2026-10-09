import { InvitationUnitLinkTableRow } from './invitation-unit-link.table';

/** Dataverse table (entity set) that stores invitations. */
export const INVITATION_TABLE = 'com_invitationrequests';

/** One `com_invitationrequests` row, exactly as the Web API returns it (with its expand). */
export interface InvitationTableRow {
  com_invitationrequestid: string;
  statuscode: number | null;
  com_to: number | null;
  com_familymembername: string | null;
  com_familymembermobilenumber: string | null;
  com_relationship: number | null;
  createdon: string; // UTC ISO date-time
  com_com_invitationrequest_com_invitationunit_InvitationRequest: InvitationUnitLinkTableRow[];
}

/** What a status change writes: Dataverse accepts a `statuscode` only together with its own `statecode`. */
export interface InvitationStatusWriteRow {
  statecode: number;
  statuscode: number;
}

/** What completing writes: the status pair + when it was accepted. */
export interface InvitationCompleteWriteRow extends InvitationStatusWriteRow {
  com_acceptedon: string; // UTC ISO date-time
}

/** What linking a user writes: the `com_LinkedUser` lookup, set by binding to the user's record. */
export interface InvitationLinkUserWriteRow {
  'com_LinkedUser@odata.bind': string;
}
