import { z } from 'zod';
import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';
import { idBackSchema } from '../fields/id-back.schema';
import { idFrontSchema } from '../fields/id-front.schema';
import { selfieSchema } from '../fields/selfie.schema';
import { userIdSchema } from '../fields/user-id.schema';
import { userTypeSchema } from '../fields/user-type.schema';

export const ownerUploadDocumentsSchema = z.strictObject({
  type: userTypeSchema(RegisteredAs.Owner),
  userId: userIdSchema,
  selfie: selfieSchema,
  idFront: idFrontSchema,
  idBack: idBackSchema.optional(),
});
