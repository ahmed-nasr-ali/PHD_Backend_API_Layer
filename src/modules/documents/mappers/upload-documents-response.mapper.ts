import { DocumentsStatus } from '../domain/enums/documents-status.enum';
import type { UploadDocumentsResponseDto } from '../dto/responses/upload-documents-response.dto';

/** Turns the queued job's id into the upload response. */
export class UploadDocumentsResponseMapper {
  static toResponse(jobId: string): UploadDocumentsResponseDto {
    return { jobId, status: DocumentsStatus.Processing };
  }
}
