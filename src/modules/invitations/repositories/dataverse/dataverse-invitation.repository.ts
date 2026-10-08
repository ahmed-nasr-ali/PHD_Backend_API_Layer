import { Injectable } from '@nestjs/common';
import { DataverseClient, odataString } from '../../../../core/dataverse';
import { Invitation } from '../../domain/models/invitation.model';
import { InvitationRepository } from '../invitation.repository';
import { InvitationTableMapper } from './invitation.table-mapper';
import {
  INVITATION_COLUMNS,
  INVITATION_EXPAND,
} from './queries/invitation.query';
import {
  INVITATION_TABLE,
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
}
