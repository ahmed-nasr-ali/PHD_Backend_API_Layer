import type { FileUpload } from '../types/file-upload';
import type { StorageKey } from '../types/storage-key';
import type { StoredFile } from '../types/stored-file';

/** Writes files. Only real stores implement it. */
export abstract class FileWriter {
  /** saves a new file · name already taken → a unique name, never an overwrite */
  abstract upload(file: FileUpload): Promise<StoredFile>;

  /**
   * swaps the file at `key` for `file` · `key` missing → just saves `file`.
   * The returned key may differ from `key` (some stores rename): callers keep the returned one.
   */
  abstract replace(key: StorageKey, file: FileUpload): Promise<StoredFile>;

  /** removes the file · already missing → no error (safe to retry) */
  abstract delete(key: StorageKey): Promise<void>;
}
