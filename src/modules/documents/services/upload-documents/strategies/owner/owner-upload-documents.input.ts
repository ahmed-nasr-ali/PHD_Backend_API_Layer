import type { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import type { ReceivedFile } from '../../../../domain/models/received-file';

/** What OwnerDocumentsUploadStrategy needs. File fields are named after DocumentKind values. */
export interface OwnerUploadDocumentsInput {
  type: RegisteredAs.Owner;
  userId: string;
  selfie: ReceivedFile;
  idFront: ReceivedFile;
  idBack?: ReceivedFile;
}
