import { PhdAccountTableRow } from '../tables/phd-account.table';

/** Account columns to read ($select): only the id, register just needs to know one exists. */
export const PHD_ACCOUNT_COLUMNS: (keyof PhdAccountTableRow)[] = ['accountid'];
