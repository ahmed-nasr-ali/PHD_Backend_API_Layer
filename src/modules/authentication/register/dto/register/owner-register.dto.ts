import { z } from 'zod';
import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { emailSchema } from '../fields/email.schema';
import { identitySchema } from '../fields/identity.schema';
import { mobileSchema } from '../fields/mobile.schema';
import { nameSchema } from '../fields/name.schema';
import { notificationTokenSchema } from '../fields/notification-token.schema';
import { passwordSchema } from '../fields/password.schema';

export const ownerRegisterSchema = z.strictObject({
  type: z.literal(RegisteredAs.Owner),
  name: nameSchema,
  mobile: mobileSchema,
  identity: identitySchema,
  email: emailSchema,
  password: passwordSchema,
  notificationToken: notificationTokenSchema,
});
