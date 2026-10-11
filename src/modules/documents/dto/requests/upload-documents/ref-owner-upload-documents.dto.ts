import { z } from 'zod';
import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';
import { contractBackSchema } from '../fields/contract-back.schema';
import { contractFrontSchema } from '../fields/contract-front.schema';
import { idFrontSchema } from '../fields/id-front.schema';
import { selfieSchema } from '../fields/selfie.schema';
import { userIdSchema } from '../fields/user-id.schema';
import { userTypeSchema } from '../fields/user-type.schema';

/** Every document is required for a REF owner. */
export const refOwnerUploadDocumentsSchema = z.strictObject({
  type: userTypeSchema(RegisteredAs.RefOwner),
  userId: userIdSchema,
  selfie: selfieSchema,
  idFront: idFrontSchema,
  contractFront: contractFrontSchema,
  contractBack: contractBackSchema,
});
