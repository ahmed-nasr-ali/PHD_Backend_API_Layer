import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../domain/enums/registered-as.enum';
import { UserStatus } from '../../../domain/enums/user-status.enum';
import { User } from '../../../domain/models/user.model';
import { InvitedUserRegistrar } from '../invited-user-registrar';
import { RegistrationInvitationVerifier } from '../registration-invitation.verifier';
import { RegistrationStrategy } from '../registration.strategy';
import type { TenantRegisterInput } from './tenant-register.input';

/** Tenant: name + mobile from the invitation · no birth date */
@Injectable()
export class TenantRegistrationStrategy extends RegistrationStrategy {
  readonly type = RegisteredAs.Tenant;

  constructor(
    private readonly invitationVerifier: RegistrationInvitationVerifier,
    private readonly registrar: InvitedUserRegistrar,
  ) {
    super();
  }

  /** check the invitation → save the user (InvitedUserRegistrar handles the invitation) */
  async execute(input: TenantRegisterInput): Promise<User> {
    const invitation = await this.invitationVerifier.verify(
      input.code,
      input.invitationId,
      this.type,
    );

    return this.registrar.register(invitation.id, {
      name: invitation.name,
      mobile: invitation.mobile,
      email: input.email,
      password: input.password,
      identity: input.identity,
      birthDate: null,
      registeredAs: this.type,
      status: UserStatus.UnderReview,
      notificationToken: input.notificationToken,
    });
  }
}
