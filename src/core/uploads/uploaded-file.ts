/** A file from a multipart request, already written to the temp store (one per form field). */
export interface UploadedFile {
  tempFileId: string;
  /** The real type, read from the file's first bytes (never from its name or the client's Content-Type). Not a known type → null. */
  detectedType: string | null;
  /** In bytes. */
  size: number;
}
