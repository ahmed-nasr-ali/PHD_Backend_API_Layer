/** Dataverse table (entity set) of Palm Hills customers. */
export const PHD_ACCOUNT_TABLE = 'accounts';

/** One `accounts` row, exactly as the Web API returns it (only the columns we read). */
export interface PhdAccountTableRow {
  accountid: string;
}

/** `accounts` columns register searches by ($filter only, never read back). */
export interface PhdAccountSearchColumns {
  new_mobilenumber: string | null;
  new_cbrnumber: string | null; // national ID
  blser_passportno: string | null;
}
