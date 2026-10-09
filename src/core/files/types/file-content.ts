import type { Readable } from 'node:stream';
import type { StoredFile } from './stored-file';

/** A saved file with its bytes, as a stream (sent to the client without loading it all in memory). */
export interface FileContent {
  file: StoredFile;
  stream: Readable;
}
