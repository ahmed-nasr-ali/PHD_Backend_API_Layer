import { RegisteredAs } from '../enums/registered-as.enum';
import {
  UserDeactivatedError,
  UserExistsError,
} from '../errors/authentication.errors';
import { User } from '../models/user.model';

/**
 * Decides what register does with the users found in `com_users` (by the mobile OR the ID; both belong to one person).
 * nothing found → null (continue to create)
 * · one of them deactivated (complete or not, any type) → USER_DEACTIVATED
 * · one unfinished user, same type (found by the mobile, the ID or both) → that user (reuse: its mobile, ID, … are overwritten)
 * · complete user, 2+ records, or unfinished with another type → USER_EXISTS
 *   (`hasCompleteAccount` = one of the found users is complete)
 *
 * @param found users found by the mobile OR the ID (0, 1 or more records)
 * @param registeredAs the registering user's type (`body.type`)
 */
export function resolveExistingUser(
  found: User[],
  registeredAs: RegisteredAs,
): User | null {
  if (found.length === 0) {
    return null;
  }

  if (found.some((u) => u.isDeactivated)) {
    throw new UserDeactivatedError();
  }

  const [user] = found;
  const canReuse =
    found.length === 1 &&
    user.registeredAs === registeredAs &&
    !user.isProfileComplete;

  if (canReuse) {
    return user;
  }
  throw new UserExistsError(found.some((u) => u.isProfileComplete));
}
