import { optionSetValue } from '../../../../../core/dataverse';
import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';
import { UserState } from '../../../../authentication/shared/domain/enums/user-status.enum';
import { Relationship } from '../../../../invitations/domain/enums/relationship.enum';
import { DocumentKind } from '../../../domain/enums/document-kind.enum';
import { DocumentsUser } from '../../../domain/models/documents-user.model';
import { StoredDocument } from '../../../domain/models/stored-document';
import {
  DOCUMENT_COLUMNS,
  DocumentFilesTableRow,
  DocumentsUserTableRow,
} from '../tables/documents-user.table';
import { DocumentsUserInvitationTableRow } from '../tables/documents-user-invitation.table';

/** Translates `com_users` rows (and the user's invitation) into the documents domain. */
export class DocumentsUserTableMapper {
  /** The user row + their invitation (none for owners) → DocumentsUser */
  static toDomain(
    row: DocumentsUserTableRow,
    invitation: DocumentsUserInvitationTableRow | null,
  ): DocumentsUser {
    return DocumentsUser.restore({
      id: row.com_userid,
      registeredAs: optionSetValue(RegisteredAs, row.com_registeredas),
      birthDate: row.com_birthdate ? new Date(row.com_birthdate) : null,
      isDeactivated:
        optionSetValue(UserState, row.statecode) === UserState.Inactive,
      invitationId: invitation?.com_invitationrequestid ?? null,
      relationship: invitation
        ? optionSetValue(Relationship, invitation.com_relationship)
        : null,
    });
  }

  /** Every document whose path column is filled → one StoredDocument · empty path → not stored yet, left out */
  static toStoredDocuments(row: DocumentFilesTableRow): StoredDocument[] {
    return Object.values(DocumentKind).flatMap((kind) => {
      const path = row[DOCUMENT_COLUMNS[kind].path];
      return path ? [{ kind, path }] : [];
    });
  }
}
