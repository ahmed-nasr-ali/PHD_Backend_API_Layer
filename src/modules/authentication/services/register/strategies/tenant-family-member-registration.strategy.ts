import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../domain/enums/registered-as.enum';
import { UserStatus } from '../../../domain/enums/user-status.enum';
import { User } from '../../../domain/models/user.model';
import { TenantFamilyMemberRegisterDto } from '../../../dto/register/tenant-family-member-register.dto';
import { InvitedUserRegistrar } from '../invited-user-registrar';
import { RegistrationInvitationVerifier } from '../registration-invitation.verifier';
import { RegistrationStrategy } from '../registration.strategy';

/** Tenant Family Member: name + mobile from the invitation · birth date from the form */
@Injectable()
export class TenantFamilyMemberRegistrationStrategy extends RegistrationStrategy {
  readonly type = RegisteredAs.TenantFamilyMember;

  constructor(
    private readonly invitationVerifier: RegistrationInvitationVerifier,
    private readonly registrar: InvitedUserRegistrar,
  ) {
    super();
  }

  /** check the invitation → save the user (InvitedUserRegistrar handles the invitation) */
  async execute(body: TenantFamilyMemberRegisterDto): Promise<User> {
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
