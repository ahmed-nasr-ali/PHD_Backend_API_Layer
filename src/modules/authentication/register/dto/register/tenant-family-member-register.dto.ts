import { z } from 'zod';
import { invitationCodeSchema } from '../../../../invitations/dto/fields/invitation-code.schema';
import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { birthDateSchema } from '../fields/birth-date.schema';
import { emailSchema } from '../fields/email.schema';
import { identitySchema } from '../fields/identity.schema';
import { invitationIdSchema } from '../fields/invitation-id.schema';
import { notificationTokenSchema } from '../fields/notification-token.schema';
import { passwordSchema } from '../fields/password.schema';

export const tenantFamilyMemberRegisterSchema = z.strictObject({
  type: z.literal(RegisteredAs.TenantFamilyMember),
  invitationId: invitationIdSchema,
  code: invitationCodeSchema,
  birthDate: birthDateSchema,
  identity: identitySchema,
  email: emailSchema,
  password: passwordSchema,
  notificationToken: notificationTokenSchema,
});
