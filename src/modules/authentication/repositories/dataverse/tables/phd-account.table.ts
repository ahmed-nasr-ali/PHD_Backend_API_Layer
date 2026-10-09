/** Dataverse table (entity set) of Palm Hills customers. */
export const PHD_ACCOUNT_TABLE = 'accounts';

/** One `accounts` row, exactly as the Web API returns it (only the columns we read). */
export interface PhdAccountTableRow {
  accountid: string;
}
