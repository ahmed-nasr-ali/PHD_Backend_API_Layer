import { NotPhdCustomerError } from '../errors/register.errors';
import { PhdAccount } from '../models/phd-account.model';

/**
 * Owner only, and only when no user was found in `com_users`.
 * account found → continue · no account → NOT_PHD_CUSTOMER
 *
 * @param found accounts found by the mobile OR the ID
 */
export function ensurePhdCustomer(found: PhdAccount[]): void {
  if (found.length === 0) {
    throw new NotPhdCustomerError();
  }
}
