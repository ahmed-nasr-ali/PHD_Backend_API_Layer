import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { FileStorage } from '../ports/file-storage';
import type { FileContent } from '../types/file-content';
import type { FileUpload } from '../types/file-upload';
import type { StorageKey } from '../types/storage-key';
import type { StoredFile } from '../types/stored-file';

interface InMemoryEntry {
  file: StoredFile;
  content: Buffer;
}

/** Keeps files in memory: tests and isolated runs only, never production. Behaves like a real store (same contract). */
export class InMemoryFileStorage extends FileStorage {
  private readonly entries = new Map<StorageKey, InMemoryEntry>();

  async describe(key: StorageKey): Promise<StoredFile | null> {
    return this.entries.get(key)?.file ?? null;
  }

  async open(key: StorageKey): Promise<FileContent | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    return { file: entry.file, stream: Readable.from(entry.content) };
  }

  async upload(upload: FileUpload): Promise<StoredFile> {
    const name = this.freeName(upload);
    const file: StoredFile = {
      key: `${upload.folder}/${name}`,
      name,
      contentType: upload.contentType,
      size: upload.content.length,
      version: randomUUID(),
      updatedAt: new Date(),
    };
    this.entries.set(file.key, { file, content: Buffer.from(upload.content) });
    return file;
  }

  async replace(key: StorageKey, upload: FileUpload): Promise<StoredFile> {
    await this.delete(key);
    return this.upload(upload);
  }

  async delete(key: StorageKey): Promise<void> {
    this.entries.delete(key);
  }

  /** name free → the same name · taken → "<base>-<n><ext>" with the first free n */
  private freeName({ folder, name }: FileUpload): string {
    const extension = extname(name);
    const base = name.slice(0, name.length - extension.length);
    let candidate = name;
    for (let n = 1; this.entries.has(`${folder}/${candidate}`); n++) {
      candidate = `${base}-${n}${extension}`;
    }
    return candidate;
  }
}
