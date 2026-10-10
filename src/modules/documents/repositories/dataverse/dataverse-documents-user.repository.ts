import { Injectable } from '@nestjs/common';
import {
  DataverseClient,
  DataverseException,
} from '../../../../core/dataverse';
import { RegisteredAs } from '../../../authentication/shared/domain/enums/registered-as.enum';
import {
  UserState,
  UserStatus,
} from '../../../authentication/shared/domain/enums/user-status.enum';
import { DocumentsUser } from '../../domain/models/documents-user.model';
import { DocumentsUserRepository } from '../documents-user.repository';
import { DocumentsUserTableMapper } from './mappers/documents-user.table-mapper';
import {
  DOCUMENTS_USER_COLUMNS,
  DOCUMENTS_USER_INVITATION_COLUMNS,
  LINKED_USER_COLUMN,
} from './queries/documents-user.query';
import {
  DOCUMENTS_USER_INVITATION_TABLE,
  DocumentsUserInvitationTableRow,
} from './tables/documents-user-invitation.table';
import {
  DOCUMENTS_USER_TABLE,
  DocumentsUserStatusWriteRow,
  DocumentsUserTableRow,
} from './tables/documents-user.table';

@Injectable()
export class DataverseDocumentsUserRepository extends DocumentsUserRepository {
  constructor(private readonly dataverse: DataverseClient) {
    super();
  }

  /**
   * Reads the user, then (invited users only) the newest invitation linked to them, for the relationship.
   * The second read waits for the first: no user → no second call, and the id in its filter comes from the CRM, not from the request.
   * found → the user · Dataverse 404 → null · any other error → rethrown
   */
  async findById(id: string): Promise<DocumentsUser | null> {
    let row: DocumentsUserTableRow;
    try {
      row = await this.dataverse.retrieve<DocumentsUserTableRow>(
        DOCUMENTS_USER_TABLE,
        id,
        DOCUMENTS_USER_COLUMNS,
      );
    } catch (error) {
      if (error instanceof DataverseException && error.status === 404) {
        return null;
      }
      throw error;
    }

    const invitation =
      row.com_registeredas === RegisteredAs.Owner
        ? null
        : await this.findLinkedInvitation(row.com_userid);
    return DocumentsUserTableMapper.toDomain(row, invitation);
  }

  /** Rejected belongs to the Active state, so both are written together. */
  async markRejectedAndAllowForResubmission(id: string): Promise<void> {
    const row: DocumentsUserStatusWriteRow = {
      statecode: UserState.Active,
      statuscode: UserStatus.Rejected,
    };
    await this.dataverse.update(DOCUMENTS_USER_TABLE, id, row);
  }

  /** The newest invitation linked to the user (a user invited twice keeps only the last) · none → null */
  private async findLinkedInvitation(
    userId: string,
  ): Promise<DocumentsUserInvitationTableRow | null> {
    const rows =
      await this.dataverse.retrieveMultiple<DocumentsUserInvitationTableRow>(
        DOCUMENTS_USER_INVITATION_TABLE,
        {
          select: DOCUMENTS_USER_INVITATION_COLUMNS,
          filter: `${LINKED_USER_COLUMN} eq ${userId}`,
          orderBy: ['createdon desc'],
          top: 1,
        },
      );
    return rows[0] ?? null;
  }
}
