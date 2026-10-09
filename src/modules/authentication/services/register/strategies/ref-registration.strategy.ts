import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../domain/enums/registered-as.enum';
import { UserStatus } from '../../../domain/enums/user-status.enum';
import { User } from '../../../domain/models/user.model';
import { RefRegisterDto } from '../../../dto/register/ref-register.dto';
import { InvitedUserRegistrar } from '../invited-user-registrar';
import { RegistrationInvitationVerifier } from '../registration-invitation.verifier';
import { RegistrationStrategy } from '../registration.strategy';

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
  async execute(body: RefRegisterDto): Promise<User> {
    const invitation = await this.invitationVerifier.verify(
      body.code,
      body.invitationId,
      this.type,
    );

    return this.registrar.register(invitation.id, {
      name: body.name,
      mobile: invitation.mobile,
      email: body.email,
      password: body.password,
      identity: body.identity,
      birthDate: null,
      registeredAs: this.type,
      status: UserStatus.UnderReview,
      notificationToken: body.notificationToken,
    });
  }
}
