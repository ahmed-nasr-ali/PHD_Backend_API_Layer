import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../../../shared/domain/enums/registered-as.enum';
import { UserStatus } from '../../../../../shared/domain/enums/user-status.enum';
import { User } from '../../../../domain/models/user.model';
import { InvitedUserRegistrar } from '../../invited-user-registrar';
import { RegistrationInvitationVerifier } from '../../registration-invitation.verifier';
import { RegistrationStrategy } from '../registration.strategy';
import type { RefRegisterInput } from './ref-register.input';

/** REF: name from the form (S9) · mobile from the invitation · no birth date */
@Injectable()
export class RefRegistrationStrategy extends RegistrationStrategy {
  readonly type = RegisteredAs.Ref;

  constructor(
    private readonly invitationVerifier: RegistrationInvitationVerifier,
    private readonly registrar: InvitedUserRegistrar,
  ) {
    super();
  }

  /** check the invitation → save the user (InvitedUserRegistrar handles the invitation) */
  async execute(input: RefRegisterInput): Promise<User> {
    const invitation = await this.invitationVerifier.verify(
      input.code,
      input.invitationId,
      this.type,
    );

    return this.registrar.register(invitation.id, {
      name: input.name,
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
