import type { StorageKey } from './storage-key';

/** A saved file, without its bytes. */
export interface StoredFile {
  key: StorageKey;
  name: string;
  contentType: string;
  size: number;
  /** Changes whenever the content changes (used for ETag / 304 and versioned links). */
  version: string;
  updatedAt: Date;
}
