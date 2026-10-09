import { Injectable } from '@nestjs/common';
import { DataverseClient, odataString } from '../../../../../core/dataverse';
import { IdentityKind } from '../../domain/enums/identity-kind.enum';
import { PhdAccount } from '../../domain/models/phd-account.model';
import { UserIdentity } from '../../domain/models/user-identity.model';
import { PhdAccountRepository } from '../phd-account.repository';
import { PhdAccountTableMapper } from './mappers/phd-account.table-mapper';
import { PHD_ACCOUNT_COLUMNS } from './queries/phd-account.query';
import {
  PHD_ACCOUNT_TABLE,
  PhdAccountSearchColumns,
  PhdAccountTableRow,
} from './tables/phd-account.table';

@Injectable()
export class DataversePhdAccountRepository extends PhdAccountRepository {
  constructor(private readonly dataverse: DataverseClient) {
    super();
  }

  /**
   * Finds accounts with the same mobile OR the same ID number.
   * mobile → new_mobilenumber ends with its last 10 digits (stored as 01…)
   * · national ID → new_cbrnumber · passport → blser_passportno
   * One match is enough (`top: 1`): register only needs to know an account exists.
   */
  async findByMobileOrIdentity(
    mobile: string,
    identity: UserIdentity,
  ): Promise<PhdAccount[]> {
    const identityColumn: keyof PhdAccountSearchColumns =
      identity.kind === IdentityKind.National
        ? 'new_cbrnumber'
        : 'blser_passportno';

    const rows = await this.dataverse.retrieveMultiple<PhdAccountTableRow>(
      PHD_ACCOUNT_TABLE,
      {
        select: PHD_ACCOUNT_COLUMNS,
        filter: `endswith(new_mobilenumber, ${odataString(mobile.slice(-10))}) or ${identityColumn} eq ${odataString(identity.number)}`,
        top: 1,
      },
    );
    return rows.map((row) => PhdAccountTableMapper.toDomain(row));
  }
}
