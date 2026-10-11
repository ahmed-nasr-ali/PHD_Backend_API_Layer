import { DocumentFileType } from '../../../domain/enums/document-file-type.enum';
import { documentFileSchema } from './document-file.schema';

/** A photo only (it feeds face checks) · up to 5 MB */
export const selfieSchema = documentFileSchema(
  'Selfie',
  [DocumentFileType.Jpeg, DocumentFileType.Png],
  5,
);
