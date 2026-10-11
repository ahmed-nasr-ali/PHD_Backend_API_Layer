import { Readable, Transform, type TransformCallback } from 'node:stream';
import { TempFileStore } from '../storage';
import { detectFileType, SIGNATURE_LENGTH } from './detect-file-type';
import type { UploadedFile } from './uploaded-file';

/** The part of multer's file object this engine reads (multer's own types are not installed). */
interface IncomingFile {
  stream: Readable;
}

/** Passes the file through unchanged, counting its size and keeping its first bytes to read its type. */
class FileInspector extends Transform {
  size = 0;
  private head = Buffer.alloc(0);

  _transform(chunk: Buffer, _encoding: string, done: TransformCallback): void {
    this.size += chunk.length;
    if (this.head.length < SIGNATURE_LENGTH) {
      this.head = Buffer.concat([this.head, chunk]).subarray(0, SIGNATURE_LENGTH);
    }
    done(null, chunk);
  }

  get detectedType(): string | null {
    return detectFileType(this.head);
  }
}

/**
 * A multer storage engine (multer calls these two methods): each uploaded file goes straight to the TempFileStore as it
 * arrives, so a request with several big files is never held whole in memory. Its real type and size are read on the way.
 */
export class TempFileStorageEngine {
  constructor(private readonly tempFiles: TempFileStore) {}

  /** written → done with the file's UploadedFile info (multer adds it to the file) · writing failed → done with the error */
  _handleFile(
    _request: unknown,
    file: IncomingFile,
    done: (error: Error | null, info?: UploadedFile) => void,
  ): void {
    const inspector = new FileInspector();
    // pipe() doesn't pass errors on: a broken upload must also break the write, so the half file is removed.
    file.stream.on('error', (error) => inspector.destroy(error));
    this.tempFiles
      .save(file.stream.pipe(inspector))
      .then((tempFileId) =>
        done(null, {
          tempFileId,
          detectedType: inspector.detectedType,
          size: inspector.size,
        }),
      )
      .catch((error: Error) => done(error));
  }

  /** Multer calls this when the request fails after some files were written (e.g. a later file is too big). */
  _removeFile(
    _request: unknown,
    file: UploadedFile,
    done: (error: Error | null) => void,
  ): void {
    this.tempFiles
      .delete(file.tempFileId)
      .then(() => done(null))
      .catch((error: Error) => done(error));
  }
}
