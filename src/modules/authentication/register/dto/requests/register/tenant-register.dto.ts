import { z } from 'zod';
import { invitationCodeSchema } from '../../../../../invitations/dto/requests/fields/invitation-code.schema';
import { RegisteredAs } from '../../../../shared/domain/enums/registered-as.enum';
import { emailSchema } from '../fields/email.schema';
import { identitySchema } from '../fields/identity.schema';
import { invitationIdSchema } from '../fields/invitation-id.schema';
import { notificationTokenSchema } from '../fields/notification-token.schema';
import { passwordSchema } from '../fields/password.schema';

export const tenantRegisterSchema = z.strictObject({
  type: z.literal(RegisteredAs.Tenant),
  invitationId: invitationIdSchema,
  code: invitationCodeSchema,
  identity: identitySchema,
  email: emailSchema,
  password: passwordSchema,
  notificationToken: notificationTokenSchema,
});
