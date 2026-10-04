import { Catch, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../errors';
import { ApiErrorResponse, ApiResponseBuilder } from '../api-response';
import { ApiExceptionFilter } from './api-exception.filter';

/** Anything no other filter handled: logged by the base class, never exposed. */
@Catch()
export class UnhandledExceptionFilter extends ApiExceptionFilter<unknown> {
  protected toResponse(): ApiErrorResponse {
    return ApiResponseBuilder.error(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.InternalError,
      'An unexpected error occurred.',
    );
  }
}
