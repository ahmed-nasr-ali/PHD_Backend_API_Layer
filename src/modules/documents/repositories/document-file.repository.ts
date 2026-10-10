import { DocumentFile } from '../domain/models/document-file';
import { StoredDocument } from '../domain/models/stored-document';

/**
 * What the services need to keep a user's document files and to know which ones are already kept.
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class DocumentFileRepository {
  /**
   * Keeps the file and writes its name + path on the user's record.
   * Kept → resolves · refused or no answer → throws (the job tries again)
   */
  abstract save(userId: string, file: DocumentFile): Promise<void>;

  /** The documents already on the user's record (path filled); none, or no such user → empty. */
  abstract findStored(userId: string): Promise<StoredDocument[]>;
}
