import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, type Observable } from 'rxjs';
import { TempFileStore } from '../storage';
import type { UploadedFile } from './uploaded-file';

/** What multer leaves on the request: the text fields in `body`, and each file with its field name + our UploadedFile info. */
interface MultipartRequest {
  body?: Record<string, unknown>;
  files?: (UploadedFile & { fieldname: string })[];
}

/**
 * Runs after multer: builds the body from the text fields + one entry per file under its field name, so one zodBody schema
 * checks fields and files together (like register). If anything after this fails (validation, a business error), the
 * request's temp files are deleted, because nobody will ever use them.
 */
@Injectable()
export class FilesToBodyInterceptor implements NestInterceptor {
  constructor(private readonly tempFiles: TempFileStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<MultipartRequest>();
    const files = request.files ?? [];
    request.body = this.buildBody(request.body ?? {}, files);

    return next.handle().pipe(
      catchError(async (error: unknown) => {
        await Promise.allSettled(
          files.map((file) => this.tempFiles.delete(file.tempFileId)),
        );
        throw error;
      }),
    );
  }

  /**
   * Text fields are kept only if they are text: a JSON body could otherwise pass a made-up file object (another request's
   * temp file id) where a file is expected. Files come only from multer.
   * one file in a field → body[field] = the file · the same field twice → body[field] = [both] (the schema then rejects it)
   */
  private buildBody(
    fields: Record<string, unknown>,
    files: (UploadedFile & { fieldname: string })[],
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(fields)) {
      if (typeof value === 'string') {
        body[name] = value;
      }
    }
    for (const file of files) {
      const uploaded: UploadedFile = {
        tempFileId: file.tempFileId,
        detectedType: file.detectedType,
        size: file.size,
      };
      const existing = body[file.fieldname];
      body[file.fieldname] =
        existing === undefined ? uploaded : [existing, uploaded].flat();
    }
    return body;
  }
}
