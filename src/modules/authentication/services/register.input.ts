import type { FamilyMemberRegisterInput } from './register/strategies/family-member-register.input';
import type { OwnerRegisterInput } from './register/strategies/owner-register.input';
import type { RefOwnerRegisterInput } from './register/strategies/ref-owner-register.input';
import type { RefRegisterInput } from './register/strategies/ref-register.input';
import type { TenantFamilyMemberRegisterInput } from './register/strategies/tenant-family-member-register.input';
import type { TenantRegisterInput } from './register/strategies/tenant-register.input';

/** What RegisterService needs: one shape per user type, `type` tells which one. */
export type RegisterInput =
  | OwnerRegisterInput
  | FamilyMemberRegisterInput
  | TenantFamilyMemberRegisterInput
  | TenantRegisterInput
  | RefRegisterInput
  | RefOwnerRegisterInput;
