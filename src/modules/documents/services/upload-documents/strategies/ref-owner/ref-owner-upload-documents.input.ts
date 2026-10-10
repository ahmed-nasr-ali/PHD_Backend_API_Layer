import type { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import type { ReceivedFile } from '../../../../domain/models/received-file';

/** What RefOwnerDocumentsUploadStrategy needs: every document is required. File fields are named after DocumentKind values. */
export interface RefOwnerUploadDocumentsInput {
  type: RegisteredAs.RefOwner;
  userId: string;
  selfie: ReceivedFile;
  idFront: ReceivedFile;
  contractFront: ReceivedFile;
  contractBack: ReceivedFile;
}
