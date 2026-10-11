import { DocumentFileType } from '../../../domain/enums/document-file-type.enum';
import { documentFileSchema } from './document-file.schema';

/** Back of the national ID · photo or PDF · up to 10 MB */
export const idBackSchema = documentFileSchema(
  'ID back',
  [DocumentFileType.Jpeg, DocumentFileType.Png, DocumentFileType.Pdf],
  10,
);
