import { PhdAccount } from '../../domain/models/phd-account.model';
import { PhdAccountTableRow } from './tables/phd-account.table';

/** Translates an `accounts` row into a PhdAccount. */
export class PhdAccountTableMapper {
  static toDomain(row: PhdAccountTableRow): PhdAccount {
    return { id: row.accountid };
  }
}
