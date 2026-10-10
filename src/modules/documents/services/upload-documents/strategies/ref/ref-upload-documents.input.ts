import type { RegisteredAs } from '../../../../../authentication/shared/domain/enums/registered-as.enum';
import type { ReceivedFile } from '../../../../domain/models/received-file';

/** What RefDocumentsUploadStrategy needs. File fields are named after DocumentKind values. */
export interface RefUploadDocumentsInput {
  type: RegisteredAs.Ref;
  userId: string;
  selfie: ReceivedFile;
}
