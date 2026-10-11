import { DocumentFileType } from '../../../domain/enums/document-file-type.enum';
import { documentFileSchema } from './document-file.schema';

/** Birth certificate · photo or PDF · up to 10 MB */
export const birthCertificateSchema = documentFileSchema(
  'Birth certificate',
  [DocumentFileType.Jpeg, DocumentFileType.Png, DocumentFileType.Pdf],
  10,
);
