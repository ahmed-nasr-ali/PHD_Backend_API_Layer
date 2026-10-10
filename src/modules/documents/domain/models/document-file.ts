import { DocumentKind } from '../enums/document-kind.enum';

/** One document file to keep for a user. */
export interface DocumentFile {
  kind: DocumentKind;
  /** A simple name such as selfie.jpg; the upload flow turns it into 20260708063904_selfie_1783492741985.jpg. */
  fileName: string;
  content: Buffer;
  /** The path of the file this one replaces (from StoredDocument). First time → null. */
  replacesPath: string | null;
}
