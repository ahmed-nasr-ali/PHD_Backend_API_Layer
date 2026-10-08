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
