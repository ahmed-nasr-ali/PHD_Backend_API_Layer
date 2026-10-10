import { Injectable } from '@nestjs/common';
import { JobName, JobQueue } from '../../../../core/jobs';
import { DocumentFileType } from '../../domain/enums/document-file-type.enum';
import { DocumentKind } from '../../domain/enums/document-kind.enum';
import { ReceivedFile } from '../../domain/models/received-file';
import { UploadDocumentsJobData } from './upload-documents.job-data';

/** The file extension of each file type, for the simple name sent to the flow (selfie.jpg). */
const FILE_EXTENSIONS: Record<DocumentFileType, string> = {
  [DocumentFileType.Jpeg]: 'jpg',
  [DocumentFileType.Png]: 'png',
  [DocumentFileType.Pdf]: 'pdf',
};

/** Queues the upload of a user's documents, so the request can be answered at once. */
@Injectable()
export class DocumentsJobScheduler {
  constructor(private readonly jobs: JobQueue) {}

  /**
   * Adds one job with every file that was sent (in DocumentKind order) and gives back its id.
   *
   * @param sent the files by document, e.g. the upload input itself (its file fields are named after DocumentKind values)
   */
  async schedule(
    userId: string,
    sent: Partial<Record<DocumentKind, ReceivedFile>>,
  ): Promise<string> {
    const data: UploadDocumentsJobData = {
      userId,
      documents: Object.values(DocumentKind).flatMap((kind) => {
        const file = sent[kind];
        return file
          ? [
              {
                kind,
                tempFileId: file.tempFileId,
                fileName: `${kind}.${FILE_EXTENSIONS[file.fileType]}`,
              },
            ]
          : [];
      }),
    };
    return this.jobs.add({ name: JobName.UploadDocuments, data });
  }
}
