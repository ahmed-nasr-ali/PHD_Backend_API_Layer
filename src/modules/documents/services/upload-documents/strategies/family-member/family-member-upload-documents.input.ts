import type { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import type { ReceivedFile } from '../../../../domain/models/received-file';

/** What FamilyMemberDocumentsUploadStrategy needs. File fields are named after DocumentKind values. */
export interface FamilyMemberUploadDocumentsInput {
  type: RegisteredAs.FamilyMember;
  userId: string;
  selfie: ReceivedFile;
  birthCertificate: ReceivedFile;
  /** Needed from 15 years old (checked by ensureFamilyDocuments, from the CRM birth date). */
  idFront?: ReceivedFile;
  /** Needed for a spouse (checked by ensureFamilyDocuments, from the invitation). */
  marriageCertificate?: ReceivedFile;
}
