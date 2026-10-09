import { z } from 'zod';
import { familyMemberRegisterSchema } from './register/family-member-register.dto';
import {
  OwnerRegisterDto,
  ownerRegisterSchema,
} from './register/owner-register.dto';
import { refOwnerRegisterSchema } from './register/ref-owner-register.dto';
import { refRegisterSchema } from './register/ref-register.dto';
import { tenantFamilyMemberRegisterSchema } from './register/tenant-family-member-register.dto';
import { tenantRegisterSchema } from './register/tenant-register.dto';

/**
 * The register body: `type` picks the schema.
 * missing field → 422 · extra field (e.g. birthDate for an owner) → 422 · Helper or unknown type → 422
 */
export const registerSchema = z.discriminatedUnion('type', [
  ownerRegisterSchema,
  familyMemberRegisterSchema,
  tenantFamilyMemberRegisterSchema,
  tenantRegisterSchema,
  refRegisterSchema,
  refOwnerRegisterSchema,
]);

export type RegisterDto = z.infer<typeof registerSchema>;
