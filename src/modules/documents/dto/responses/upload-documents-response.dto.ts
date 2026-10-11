import type { DocumentsStatus } from '../../domain/enums/documents-status.enum';

/** What the app gets right after sending the documents (202): the job to ask about later. */
export interface UploadDocumentsResponseDto {
  jobId: string;
  /** Always processing here: the files are still on their way to SharePoint. */
  status: DocumentsStatus;
}
