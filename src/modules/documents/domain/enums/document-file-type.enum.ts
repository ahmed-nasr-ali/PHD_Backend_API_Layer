/** The kinds of file a document may be. The values are the MIME types, read from the file's first bytes (never from its name). */
export enum DocumentFileType {
  Jpeg = 'image/jpeg',
  Png = 'image/png',
  Pdf = 'application/pdf',
}
