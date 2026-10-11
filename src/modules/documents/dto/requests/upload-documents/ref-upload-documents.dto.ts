import { z } from 'zod';
import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';
import { selfieSchema } from '../fields/selfie.schema';
import { userIdSchema } from '../fields/user-id.schema';
import { userTypeSchema } from '../fields/user-type.schema';

export const refUploadDocumentsSchema = z.strictObject({
  type: userTypeSchema(RegisteredAs.Ref),
  userId: userIdSchema,
  selfie: selfieSchema,
});
