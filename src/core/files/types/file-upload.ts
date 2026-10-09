import type { StorageFolder } from './storage-folder.enum';

/** A file to save. The server builds the name and checks the type; the phone never decides them. */
export interface FileUpload {
  folder: StorageFolder;
  name: string;
  contentType: string;
  content: Buffer;
}
