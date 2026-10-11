import { DocumentFileType } from '../../../domain/enums/document-file-type.enum';
import { documentFileSchema } from './document-file.schema';

/** Front of the national ID or the passport page · photo or PDF · up to 10 MB */
export const idFrontSchema = documentFileSchema(
  'ID front',
  [DocumentFileType.Jpeg, DocumentFileType.Png, DocumentFileType.Pdf],
  10,
);
