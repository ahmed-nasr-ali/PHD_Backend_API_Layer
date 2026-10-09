import { UserIdentity } from '../domain/models/user-identity.model';
import { UserRegistrationData } from '../domain/models/user-registration-data.model';
import { User } from '../domain/models/user.model';

/**
 * What the services need from user storage (`com_users`).
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class UserRepository {
  /**
   * Users whose mobile OR national ID / passport matches; empty when there is none.
   * Can return several records: matched by the mobile (old duplicates) and/or by the ID.
   */
  abstract findByMobileOrIdentity(
    mobile: string,
    identity: UserIdentity,
  ): Promise<User[]>;

  /** Creates the user record and returns it as the CRM saved it. */
  abstract create(data: UserRegistrationData): Promise<User>;

  /** Overwrites an unfinished user's record with the new values (S6) and returns it as the CRM saved it. */
  abstract update(id: string, data: UserRegistrationData): Promise<User>;
}
