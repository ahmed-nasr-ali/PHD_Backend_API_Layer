import { z } from 'zod';
import { DocumentFileType } from '../../../domain/enums/document-file-type.enum';
import type { ReceivedFile } from '../../../domain/models/received-file';

/** How each file type is named in error messages. */
const FILE_TYPE_NAMES: Record<DocumentFileType, string> = {
  [DocumentFileType.Jpeg]: 'JPEG',
  [DocumentFileType.Png]: 'PNG',
  [DocumentFileType.Pdf]: 'PDF',
};

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Builds the schema of one uploaded document (the object FilesToBodyInterceptor puts in the body), with its own limits,
 * and turns it into a ReceivedFile. Each document field file calls it with its label, allowed types and size.
 * not a single file (text, or the field sent twice) → 422 · real type not allowed → 422 (size check skipped) · too big → 422
 */
export function documentFileSchema(
  label: string,
  allowedTypes: DocumentFileType[],
  maxMegabytes: number,
) {
  const allowedNames = allowedTypes.map((type) => FILE_TYPE_NAMES[type]).join(', ');
  return z
    .object(
      {
        tempFileId: z.string(),
        detectedType: z.string().nullable(),
        size: z.number(),
      },
      { error: `${label} must be one file` },
    )
    .refine(
      (file) => allowedTypes.some((type) => type === file.detectedType),
      { error: `${label} must be ${allowedNames}`, abort: true },
    )
    .refine(
      (file) => file.size <= maxMegabytes * BYTES_PER_MEGABYTE,
      `${label} must be at most ${maxMegabytes} MB`,
    )
    .transform(
      (file): ReceivedFile => ({
        tempFileId: file.tempFileId,
        fileType: file.detectedType as DocumentFileType,
      }),
    );
}
