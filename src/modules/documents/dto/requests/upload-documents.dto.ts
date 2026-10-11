import { z } from 'zod';
import { familyMemberUploadDocumentsSchema } from './upload-documents/family-member-upload-documents.dto';
import { ownerUploadDocumentsSchema } from './upload-documents/owner-upload-documents.dto';
import { refOwnerUploadDocumentsSchema } from './upload-documents/ref-owner-upload-documents.dto';
import { refUploadDocumentsSchema } from './upload-documents/ref-upload-documents.dto';
import { tenantFamilyMemberUploadDocumentsSchema } from './upload-documents/tenant-family-member-upload-documents.dto';
import { tenantUploadDocumentsSchema } from './upload-documents/tenant-upload-documents.dto';

/**
 * The upload body (multipart: text fields + files): `type` picks the schema.
 * missing file → 422 · extra file (e.g. idBack for a tenant) → 422 · wrong type or too big → 422 · Helper or unknown type → 422
 */
export const uploadDocumentsSchema = z.discriminatedUnion('type', [
  ownerUploadDocumentsSchema,
  familyMemberUploadDocumentsSchema,
  tenantFamilyMemberUploadDocumentsSchema,
  tenantUploadDocumentsSchema,
  refUploadDocumentsSchema,
  refOwnerUploadDocumentsSchema,
]);

export type UploadDocumentsDto = z.infer<typeof uploadDocumentsSchema>;
