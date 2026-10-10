import type { DocumentKind } from '../../domain/enums/document-kind.enum';

/** What the upload job is added with (kept as JSON in the queue): who the documents belong to and where each file waits. */
export interface UploadDocumentsJobData {
  userId: string;
  documents: {
    kind: DocumentKind;
    tempFileId: string;
    /** A simple name such as idFront.jpg; the upload flow turns it into 20260708063904_idFront_1783492741985.jpg. */
    fileName: string;
  }[];
}
