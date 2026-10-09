import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../domain/enums/registered-as.enum';
import { RegistrationStrategy } from './registration.strategy';
import { FamilyMemberRegistrationStrategy } from './strategies/family-member-registration.strategy';
import { OwnerRegistrationStrategy } from './strategies/owner-registration.strategy';
import { RefOwnerRegistrationStrategy } from './strategies/ref-owner-registration.strategy';
import { RefRegistrationStrategy } from './strategies/ref-registration.strategy';
import { TenantFamilyMemberRegistrationStrategy } from './strategies/tenant-family-member-registration.strategy';
import { TenantRegistrationStrategy } from './strategies/tenant-registration.strategy';

/** Gives the registration strategy for a user type. */
@Injectable()
export class RegistrationStrategyFactory {
  private readonly strategies: RegistrationStrategy[];

  constructor(
    owner: OwnerRegistrationStrategy,
    familyMember: FamilyMemberRegistrationStrategy,
    tenantFamilyMember: TenantFamilyMemberRegistrationStrategy,
    tenant: TenantRegistrationStrategy,
    ref: RefRegistrationStrategy,
    refOwner: RefOwnerRegistrationStrategy,
  ) {
    this.strategies = [
      owner,
      familyMember,
      tenantFamilyMember,
      tenant,
      ref,
      refOwner,
    ];
  }

  /** a strategy handles this type → that strategy · none → Error (500, a bug: the DTO accepted a type nobody handles) */
  for(type: RegisteredAs): RegistrationStrategy {
    const strategy = this.strategies.find((s) => s.type === type);
    if (!strategy) {
      throw new Error(`No registration strategy for type ${type}`);
    }
    return strategy;
  }
}
