import type { FileContent } from '../types/file-content';
import type { StorageKey } from '../types/storage-key';
import type { StoredFile } from '../types/stored-file';

/** Reads files. Every store implements it; read-only sources (Dataverse image columns) will too. */
export abstract class FileReader {
  /** found → its description, no bytes · missing → null */
  abstract describe(key: StorageKey): Promise<StoredFile | null>;

  /** found → its description + bytes · missing → null */
  abstract open(key: StorageKey): Promise<FileContent | null>;
}
