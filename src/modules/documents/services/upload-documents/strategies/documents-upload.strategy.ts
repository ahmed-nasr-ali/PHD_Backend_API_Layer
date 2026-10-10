import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';
import { DocumentsUser } from '../../../domain/models/documents-user.model';
import type { UploadDocumentsInput } from '../../upload-documents.input';

/** Every documents-upload strategy (one per user type) must have these three things. */
export abstract class DocumentsUploadStrategy {
  /** Which user type this strategy handles, e.g. RegisteredAs.Tenant */
  abstract readonly type: RegisteredAs;

  /** Checks the user and their documents, queues the upload, and returns the job id. */
  abstract execute(input: UploadDocumentsInput): Promise<string>;

  /** Runs once every file is kept (from the job): what else changes in the CRM for this type. */
  abstract afterUpload(user: DocumentsUser): Promise<void>;
}
