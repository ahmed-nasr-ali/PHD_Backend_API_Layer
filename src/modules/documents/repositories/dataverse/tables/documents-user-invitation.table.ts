/** Dataverse table (entity set) that stores invitations; the invitations module reads it through its own table file. */
export const DOCUMENTS_USER_INVITATION_TABLE = 'com_invitationrequests';

/** The invitation columns the documents step reads (the one linked to the user), exactly as the Web API returns them. */
export interface DocumentsUserInvitationTableRow {
  com_invitationrequestid: string;
  com_relationship: number | null;
}
