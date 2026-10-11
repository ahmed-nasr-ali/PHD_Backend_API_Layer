import { DocumentFileType } from '../../../domain/enums/document-file-type.enum';
import { documentFileSchema } from './document-file.schema';

/** Marriage certificate · photo or PDF · up to 10 MB */
export const marriageCertificateSchema = documentFileSchema(
  'Marriage certificate',
  [DocumentFileType.Jpeg, DocumentFileType.Png, DocumentFileType.Pdf],
  10,
);
