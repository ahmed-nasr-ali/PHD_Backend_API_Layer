import { PhdAccount } from '../domain/models/phd-account.model';
import { UserIdentity } from '../domain/models/user-identity.model';

/**
 * What the services need from Palm Hills customer storage (`accounts`).
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class PhdAccountRepository {
  /** Accounts whose mobile OR national ID / passport matches; empty when there is none. */
  abstract findByMobileOrIdentity(
    mobile: string,
    identity: UserIdentity,
  ): Promise<PhdAccount[]>;
}
