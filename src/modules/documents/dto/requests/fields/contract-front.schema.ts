import { DocumentFileType } from '../../../domain/enums/document-file-type.enum';
import { documentFileSchema } from './document-file.schema';

/** First page of the contract · photo or PDF · up to 10 MB */
export const contractFrontSchema = documentFileSchema(
  'Contract first page',
  [DocumentFileType.Jpeg, DocumentFileType.Png, DocumentFileType.Pdf],
  10,
);
