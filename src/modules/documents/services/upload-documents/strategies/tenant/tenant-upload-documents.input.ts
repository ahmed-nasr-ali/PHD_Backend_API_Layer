import type { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import type { ReceivedFile } from '../../../../domain/models/received-file';

/** What TenantDocumentsUploadStrategy needs. File fields are named after DocumentKind values. */
export interface TenantUploadDocumentsInput {
  type: RegisteredAs.Tenant;
  userId: string;
  selfie: ReceivedFile;
}
