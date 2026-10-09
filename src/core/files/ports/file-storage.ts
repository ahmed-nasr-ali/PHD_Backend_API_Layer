import type { FileContent } from '../types/file-content';
import type { FileUpload } from '../types/file-upload';
import type { StorageKey } from '../types/storage-key';
import type { StoredFile } from '../types/stored-file';
import type { FileReader } from './file-reader';
import type { FileWriter } from './file-writer';

/**
 * A full store (SharePoint, Azure Blob, in-memory…): reads and writes.
 * Adapters extend it; features inject FileReader or FileWriter when they only need one side.
 */
export abstract class FileStorage implements FileReader, FileWriter {
  abstract describe(key: StorageKey): Promise<StoredFile | null>;
  abstract open(key: StorageKey): Promise<FileContent | null>;
  abstract upload(file: FileUpload): Promise<StoredFile>;
  abstract replace(key: StorageKey, file: FileUpload): Promise<StoredFile>;
  abstract delete(key: StorageKey): Promise<void>;
}
