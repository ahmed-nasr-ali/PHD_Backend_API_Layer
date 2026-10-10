import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Injectable } from '@nestjs/common';
import { TempFilesConfig } from '../config/temp-files.config';
import { TempFileMissingException } from '../errors/temp-file-missing.exception';
import { TempFileStore } from '../temp-file-store';

/** The shape of the ids save() gives out. Anything else is refused, so an id can never point outside the folder (e.g. ../../.env). */
const TEMP_FILE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The error code Node gives when a file does not exist. */
const FILE_NOT_FOUND = 'ENOENT';

/** Keeps temp files in a folder on this server's disk (TEMP_FILES_DIR). Each file is named by its id only, never by the name the user sent. */
@Injectable()
export class LocalDiskTempFileStore extends TempFileStore {
  constructor(private readonly config: TempFilesConfig) {
    super();
  }

  async save(content: Readable): Promise<string> {
    await mkdir(this.config.folder, { recursive: true });
    const tempFileId = randomUUID();
    const path = join(this.config.folder, tempFileId);
    try {
      await pipeline(content, createWriteStream(path));
    } catch (error) {
      // The upload broke half way: remove the half-written file so no broken copy is left.
      await rm(path, { force: true });
      throw error;
    }
    return tempFileId;
  }

  /**
   * Reads the whole file (the flow needs it whole, as base64).
   * Found → its bytes · not on disk → TempFileMissingException · any other disk error (e.g. no permission) → thrown as it is, so the job tries again
   */
  async read(tempFileId: string): Promise<Buffer> {
    const path = this.pathOf(tempFileId);
    try {
      return await readFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === FILE_NOT_FOUND) {
        throw new TempFileMissingException(tempFileId, { cause: error });
      }
      throw error;
    }
  }

  async delete(tempFileId: string): Promise<void> {
    await rm(this.pathOf(tempFileId), { force: true });
  }

  /**
   * Builds the file's full path from its id.
   * An id save() gave out → the path · anything else → TempFileMissingException (no such file can exist)
   */
  private pathOf(tempFileId: string): string {
    if (!TEMP_FILE_ID.test(tempFileId)) {
      throw new TempFileMissingException(tempFileId);
    }
    return join(this.config.folder, tempFileId);
  }
}
