import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../domain/enums/registered-as.enum';
import { UserStatus } from '../../../domain/enums/user-status.enum';
import { User } from '../../../domain/models/user.model';
import { FamilyMemberRegisterDto } from '../../../dto/register/family-member-register.dto';
import { InvitedUserRegistrar } from '../invited-user-registrar';
import { RegistrationInvitationVerifier } from '../registration-invitation.verifier';
import { RegistrationStrategy } from '../registration.strategy';

/** Family Member: name + mobile from the invitation · birth date from the form */
@Injectable()
export class FamilyMemberRegistrationStrategy extends RegistrationStrategy {
  readonly type = RegisteredAs.FamilyMember;

  constructor(
    private readonly invitationVerifier: RegistrationInvitationVerifier,
    private readonly registrar: InvitedUserRegistrar,
  ) {
    super();
  }

  /** check the invitation → save the user (InvitedUserRegistrar handles the invitation) */
  async execute(body: FamilyMemberRegisterDto): Promise<User> {
    const invitation = await this.invitationVerifier.verify(
      body.code,
      body.invitationId,
      this.type,
    );

    return this.registrar.register(invitation.id, {
      name: invitation.name,
      mobile: invitation.mobile,
      email: body.email,
      password: body.password,
      identity: body.identity,
      birthDate: new Date(body.birthDate),
      registeredAs: this.type,
      status: UserStatus.UnderReview,
      notificationToken: body.notificationToken,
    });
  }
}
