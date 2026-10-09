import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../domain/enums/registered-as.enum';
import { UserStatus } from '../../../domain/enums/user-status.enum';
import { User } from '../../../domain/models/user.model';
import { ensurePhdCustomer } from '../../../domain/rules/ensure-phd-customer';
import { PhdAccountRepository } from '../../../repositories/phd-account.repository';
import { RegistrationStrategy } from '../registration.strategy';
import { UserRegistrar } from '../user-registrar';
import type { OwnerRegisterInput } from './owner-register.input';

/** Owner: everything from the form · must be a Palm Hills customer · gets an OTP */
@Injectable()
export class OwnerRegistrationStrategy extends RegistrationStrategy {
  readonly type = RegisteredAs.Owner;

  constructor(
    private readonly phdAccounts: PhdAccountRepository,
    private readonly registrar: UserRegistrar,
  ) {
    super();
  }

  /**
   * unfinished owner found → update it, no accounts check (S22)
   * · nobody found → no Palm Hills account → NOT_PHD_CUSTOMER · account found → create
   * · both cases → the CRM sends an OTP (requestOtp)
   */
  async execute(input: OwnerRegisterInput): Promise<User> {
    const data = {
      name: input.name,
      mobile: input.mobile,
      email: input.email,
      password: input.password,
      identity: input.identity,
      birthDate: null,
      registeredAs: this.type,
      status: UserStatus.UnderReview,
      notificationToken: input.notificationToken,
      requestOtp: true,
    };

    const existing = await this.registrar.findExisting(data);

    if (!existing) {
      const accounts = await this.phdAccounts.findByMobileOrIdentity(
        input.mobile,
        input.identity,
      );
      ensurePhdCustomer(accounts);
    }

    return this.registrar.write(existing, data);
  }
}
