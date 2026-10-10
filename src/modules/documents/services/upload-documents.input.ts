import type { FamilyMemberUploadDocumentsInput } from './upload-documents/strategies/family-member/family-member-upload-documents.input';
import type { OwnerUploadDocumentsInput } from './upload-documents/strategies/owner/owner-upload-documents.input';
import type { RefOwnerUploadDocumentsInput } from './upload-documents/strategies/ref-owner/ref-owner-upload-documents.input';
import type { RefUploadDocumentsInput } from './upload-documents/strategies/ref/ref-upload-documents.input';
import type { TenantFamilyMemberUploadDocumentsInput } from './upload-documents/strategies/tenant-family-member/tenant-family-member-upload-documents.input';
import type { TenantUploadDocumentsInput } from './upload-documents/strategies/tenant/tenant-upload-documents.input';

/** What UploadDocumentsService needs: one shape per user type, `type` tells which one. */
export type UploadDocumentsInput =
  | OwnerUploadDocumentsInput
  | FamilyMemberUploadDocumentsInput
  | TenantFamilyMemberUploadDocumentsInput
  | TenantUploadDocumentsInput
  | RefUploadDocumentsInput
  | RefOwnerUploadDocumentsInput;
