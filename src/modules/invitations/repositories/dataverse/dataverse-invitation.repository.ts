import { Injectable } from '@nestjs/common';
import { DataverseClient, odataString } from '../../../../core/dataverse';
import {
  InvitationState,
  InvitationStatus,
} from '../../domain/enums/invitation-status.enum';
import { Invitation } from '../../domain/models/invitation.model';
import { InvitationRepository } from '../invitation.repository';
import { InvitationTableMapper } from './invitation.table-mapper';
import {
  INVITATION_COLUMNS,
  INVITATION_EXPAND,
} from './queries/invitation.query';
import {
  INVITATION_TABLE,
  InvitationCompleteWriteRow,
  InvitationLinkUserWriteRow,
  InvitationStatusWriteRow,
  InvitationTableRow,
} from './tables/invitation.table';

@Injectable()
export class DataverseInvitationRepository extends InvitationRepository {
  constructor(private readonly dataverse: DataverseClient) {
    super();
  }

  async findAllByCode(code: string): Promise<Invitation[]> {
    const rows = await this.dataverse.retrieveMultiple<InvitationTableRow>(
      INVITATION_TABLE,
      {
        select: INVITATION_COLUMNS,
        filter: `com_code eq ${odataString(code)}`,
        expand: INVITATION_EXPAND,
      },
    );
    return rows.map((row) => InvitationTableMapper.toDomain(row));
  }

  /** Deactivated belongs to the Inactive state, so both are written together. */
  async deactivate(id: string): Promise<void> {
    const row: InvitationStatusWriteRow = {
      statecode: InvitationState.Inactive,
      statuscode: InvitationStatus.Deactivated,
    };
    await this.dataverse.update(INVITATION_TABLE, id, row);
  }

  /** Sets the `com_LinkedUser` lookup (same write as the app); the user then sees this invitation as theirs. */
  async linkUser(id: string, userId: string): Promise<void> {
    const row: InvitationLinkUserWriteRow = {
      'com_LinkedUser@odata.bind': `/com_users(${userId})`,
    };
    await this.dataverse.update(INVITATION_TABLE, id, row);
  }

  /** Completed belongs to the Inactive state; same write as the app (no com_LinkedUser). */
  async complete(id: string): Promise<void> {
    const row: InvitationCompleteWriteRow = {
      statecode: InvitationState.Inactive,
      statuscode: InvitationStatus.Completed,
      com_acceptedon: new Date().toISOString(),
    };
    await this.dataverse.update(INVITATION_TABLE, id, row);
  }
}
