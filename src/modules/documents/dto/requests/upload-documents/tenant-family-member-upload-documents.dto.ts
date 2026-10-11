import { z } from 'zod';
import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';
import { birthCertificateSchema } from '../fields/birth-certificate.schema';
import { idFrontSchema } from '../fields/id-front.schema';
import { marriageCertificateSchema } from '../fields/marriage-certificate.schema';
import { selfieSchema } from '../fields/selfie.schema';
import { userIdSchema } from '../fields/user-id.schema';
import { userTypeSchema } from '../fields/user-type.schema';

/** idFront + marriageCertificate are optional here: whether they are needed depends on the CRM data (ensureFamilyDocuments). */
export const tenantFamilyMemberUploadDocumentsSchema = z.strictObject({
  type: userTypeSchema(RegisteredAs.TenantFamilyMember),
  userId: userIdSchema,
  selfie: selfieSchema,
  birthCertificate: birthCertificateSchema,
  idFront: idFrontSchema.optional(),
  marriageCertificate: marriageCertificateSchema.optional(),
});
