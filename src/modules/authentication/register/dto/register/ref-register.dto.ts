import { z } from 'zod';
import { invitationCodeSchema } from '../../../invitations/dto/fields/invitation-code.schema';
import { RegisteredAs } from '../../domain/enums/registered-as.enum';
import { emailSchema } from '../fields/email.schema';
import { identitySchema } from '../fields/identity.schema';
import { invitationIdSchema } from '../fields/invitation-id.schema';
import { nameSchema } from '../fields/name.schema';
import { notificationTokenSchema } from '../fields/notification-token.schema';
import { passwordSchema } from '../fields/password.schema';

export const refRegisterSchema = z.strictObject({
  type: z.literal(RegisteredAs.Ref),
  invitationId: invitationIdSchema,
  code: invitationCodeSchema,
  name: nameSchema,
  identity: identitySchema,
  email: emailSchema,
  password: passwordSchema,
  notificationToken: notificationTokenSchema,
});
