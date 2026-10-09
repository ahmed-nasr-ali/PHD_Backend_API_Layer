import { Injectable } from '@nestjs/common';
import { RegisteredAs } from '../../../domain/enums/registered-as.enum';
import type { RegisterInput } from '../../register.input';
import { RegistrationStrategy } from './registration.strategy';
import { FamilyMemberRegistrationStrategy } from './family-member/family-member-registration.strategy';
import { OwnerRegistrationStrategy } from './owner/owner-registration.strategy';
import { RefOwnerRegistrationStrategy } from './ref-owner/ref-owner-registration.strategy';
import { RefRegistrationStrategy } from './ref/ref-registration.strategy';
import { TenantFamilyMemberRegistrationStrategy } from './tenant-family-member/tenant-family-member-registration.strategy';
import { TenantRegistrationStrategy } from './tenant/tenant-registration.strategy';

/** Gives the registration strategy for a user type. */
@Injectable()
export class RegistrationStrategyFactory {
  /** One strategy per accepted type: a type without a strategy fails `tsc`, so `for()` never misses at runtime. */
  private readonly strategies: Record<
    RegisterInput['type'],
    RegistrationStrategy
  >;

  constructor(
    owner: OwnerRegistrationStrategy,
    familyMember: FamilyMemberRegistrationStrategy,
    tenantFamilyMember: TenantFamilyMemberRegistrationStrategy,
    tenant: TenantRegistrationStrategy,
    ref: RefRegistrationStrategy,
    refOwner: RefOwnerRegistrationStrategy,
  ) {
    this.strategies = {
      [RegisteredAs.Owner]: owner,
      [RegisteredAs.FamilyMember]: familyMember,
      [RegisteredAs.TenantFamilyMember]: tenantFamilyMember,
      [RegisteredAs.Tenant]: tenant,
      [RegisteredAs.Ref]: ref,
      [RegisteredAs.RefOwner]: refOwner,
    };
  }

  /** input → the strategy for its type (always one: checked by the compiler, see `strategies`) */
  for(input: RegisterInput): RegistrationStrategy {
    return this.strategies[input.type];
  }
}
