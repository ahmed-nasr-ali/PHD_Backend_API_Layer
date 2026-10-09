import { Injectable } from '@nestjs/common';
import { UserRegistrationData } from '../../domain/models/user-registration-data.model';
import { User } from '../../domain/models/user.model';
import { resolveExistingUser } from '../../domain/rules/resolve-existing-user';
import { UserRepository } from '../../repositories/user.repository';

/** Saves a registering user in `com_users`. */
@Injectable()
export class UserRegistrar {
  constructor(private readonly users: UserRepository) {}

  /** findExisting + write in one call (invited types). */
  async save(data: UserRegistrationData): Promise<User> {
    const existing = await this.findExisting(data);
    return this.write(existing, data);
  }

  /** nobody found → null · one unfinished user, same type (by mobile or ID) → that user · anyone else → USER_EXISTS */
  async findExisting(data: UserRegistrationData): Promise<User | null> {
    const found = await this.users.findByMobileOrIdentity(
      data.mobile,
      data.identity,
    );
    return resolveExistingUser(found, data.registeredAs);
  }

  /** existing user → update it · null → create a new one */
  write(existing: User | null, data: UserRegistrationData): Promise<User> {
    if (existing) {
      return this.users.update(existing.id, data);
    }
    return this.users.create(data);
  }
}
