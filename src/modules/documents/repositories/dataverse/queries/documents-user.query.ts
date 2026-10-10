import {
  DOCUMENT_COLUMNS,
  DocumentFilesTableRow,
  DocumentsUserTableRow,
} from '../tables/documents-user.table';
import { DocumentsUserInvitationTableRow } from '../tables/documents-user-invitation.table';

/** User columns to read ($select). */
export const DOCUMENTS_USER_COLUMNS: (keyof DocumentsUserTableRow)[] = [
  'com_userid',
  'com_registeredas',
  'com_birthdate',
  'statecode',
];

/** The path column of every document ($select), taken from DOCUMENT_COLUMNS so the two never drift apart. */
export const DOCUMENT_PATH_COLUMNS: (keyof DocumentFilesTableRow)[] =
  Object.values(DOCUMENT_COLUMNS).map((columns) => columns.path);

/** Invitation columns to read ($select). */
export const DOCUMENTS_USER_INVITATION_COLUMNS: (keyof DocumentsUserInvitationTableRow)[] =
  ['com_invitationrequestid', 'com_relationship'];

/**
 * The column that holds the user an invitation is linked to (the `com_LinkedUser` lookup that register sets).
 * Guessed from the lookup's name, not yet checked on phdtest (OPEN_QUESTIONS D1): if it is wrong, only this line changes.
 */
export const LINKED_USER_COLUMN = '_com_linkeduser_value';
