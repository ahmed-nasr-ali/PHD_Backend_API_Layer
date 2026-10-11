import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { FilesToBodyInterceptor } from '../../../core/uploads';
import { zodBody } from '../../../core/validation/presets';
import type { UploadDocumentsDto } from '../dto/requests/upload-documents.dto';
import { uploadDocumentsSchema } from '../dto/requests/upload-documents.dto';
import type { UploadDocumentsResponseDto } from '../dto/responses/upload-documents-response.dto';
import { UploadDocumentsResponseMapper } from '../mappers/upload-documents-response.mapper';
import type { UploadDocumentsInput } from '../services/upload-documents.input';
import { UploadDocumentsService } from '../services/upload-documents.service';

@Controller('auth/documents')
export class DocumentsController {
  constructor(private readonly uploadDocuments: UploadDocumentsService) {}

  /**
   * Receives every document in one multipart request and answers at once: 202 + the job id, the files reach SharePoint later.
   * AnyFilesInterceptor (multer) writes the files to the temp store, FilesToBodyInterceptor puts them in the body for Zod.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(AnyFilesInterceptor(), FilesToBodyInterceptor)
  async upload(
    @Body(zodBody(uploadDocumentsSchema)) dto: UploadDocumentsDto,
  ): Promise<UploadDocumentsResponseDto> {
    // the validated body already has the input's shape (type is a number, files are ReceivedFile); TypeScript checks they match
    const input: UploadDocumentsInput = dto;
    const jobId = await this.uploadDocuments.execute(input);
    return UploadDocumentsResponseMapper.toResponse(jobId);
  }
}
