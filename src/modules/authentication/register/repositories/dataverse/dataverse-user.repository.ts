import { Injectable } from '@nestjs/common';
import { DataverseClient, odataString } from '../../../../core/dataverse';
import { IdentityKind } from '../../domain/enums/identity-kind.enum';
import { UserIdentity } from '../../domain/models/user-identity.model';
import { UserRegistrationData } from '../../domain/models/user-registration-data.model';
import { User } from '../../domain/models/user.model';
import { UserRepository } from '../user.repository';
import { UserTableMapper } from './mappers/user.table-mapper';
import { USER_COLUMNS } from './queries/user.query';
import { USER_TABLE, UserTableRow } from './tables/user.table';

@Injectable()
export class DataverseUserRepository extends UserRepository {
  constructor(private readonly dataverse: DataverseClient) {
    super();
  }

  /**
   * Finds users with the same mobile OR the same ID number.
   * mobile → com_mobilenumber ends with its last 10 digits (old records mix +20…, 0…, 20…)
   * · national ID → com_nationalid · passport → com_passportnumber
   */
  async findByMobileOrIdentity(
    mobile: string,
    identity: UserIdentity,
  ): Promise<User[]> {
    const identityColumn: keyof UserTableRow =
      identity.kind === IdentityKind.National
        ? 'com_nationalid'
        : 'com_passportnumber';

    const rows = await this.dataverse.retrieveMultiple<UserTableRow>(
      USER_TABLE,
      {
        select: USER_COLUMNS,
        filter: `endswith(com_mobilenumber, ${odataString(mobile.slice(-10))}) or ${identityColumn} eq ${odataString(identity.number)}`,
      },
    );
    return rows.map((row) => UserTableMapper.toDomain(row));
  }

  /** One request: the CRM creates the row and sends it back (return=representation). */
  async create(data: UserRegistrationData): Promise<User> {
    const row = await this.dataverse.createAndRetrieve<UserTableRow>(
      USER_TABLE,
      UserTableMapper.toTableWriteRow(data),
      USER_COLUMNS,
    );
    return UserTableMapper.toDomain(row);
  }

  /** One request: the CRM updates the row and sends it back (return=representation). */
  async update(id: string, data: UserRegistrationData): Promise<User> {
    const row = await this.dataverse.updateAndRetrieve<UserTableRow>(
      USER_TABLE,
      id,
      UserTableMapper.toTableWriteRow(data),
      USER_COLUMNS,
    );
    return UserTableMapper.toDomain(row);
  }
}
