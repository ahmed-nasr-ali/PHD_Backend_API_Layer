import { DocumentFileType } from '../enums/document-file-type.enum';

/** A file the user sent, already kept in the temp store: the request is answered before it reaches SharePoint. */
export interface ReceivedFile {
  tempFileId: string;
  /** Read from the file's first bytes and checked against the document's allowed types. */
  fileType: DocumentFileType;
}
