import { Injectable } from '@nestjs/common';
import { InvitationRepository } from '../../../invitations/repositories/invitation.repository';
import { UserExistsError } from '../../domain/errors/authentication.errors';
import { UserRegistrationData } from '../../domain/models/user-registration-data.model';
import { User } from '../../domain/models/user.model';
import { UserRegistrar } from './user-registrar';

/** Saves an invited user and keeps their invitation in step with the result. */
@Injectable()
export class InvitedUserRegistrar {
  constructor(
    private readonly registrar: UserRegistrar,
    private readonly invitations: InvitationRepository,
  ) {}

  /**
   * saved → link the invitation to the user (it stays Confirmed, S26)
   * · complete user found → close the invitation (Completed, not linked) + USER_EXISTS (S27)
   * · any other USER_EXISTS → invitation stays Confirmed
   */
  async register(
    invitationId: string,
    data: UserRegistrationData,
  ): Promise<User> {
    let user: User;
    try {
      user = await this.registrar.save(data);
    } catch (error) {
      if (error instanceof UserExistsError && error.hasCompleteAccount) {
        await this.invitations.complete(invitationId);
      }
      throw error;
    }

    await this.invitations.linkUser(invitationId, user.id);
    return user;
  }
}
