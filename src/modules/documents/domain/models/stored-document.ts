import { DocumentKind } from '../enums/document-kind.enum';

/** A document already on the user's record: the upload flow wrote its path there. */
export interface StoredDocument {
  kind: DocumentKind;
  /** Where the file is, exactly as the record holds it. Sent back as `replacesPath` when the user sends this document again. */
  path: string;
}
