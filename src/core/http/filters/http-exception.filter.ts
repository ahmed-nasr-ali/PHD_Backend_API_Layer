import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiErrorResponse,
  ApiResponseBuilder,
  FieldError,
} from '../api-response';
import { ApiExceptionFilter } from './api-exception.filter';
import { ErrorCode } from '../../errors';

/** The body a Nest `HttpException` may carry (validation pipes add `code` + `errors`). */
interface HttpExceptionBody {
  code?: string;
  message?: string | string[];
  error?: string;
  errors?: FieldError[];
}

/** Nest and validation `HttpException`s, re-shaped into the envelope. */
@Catch(HttpException)
export class HttpExceptionFilter extends ApiExceptionFilter<HttpException> {
  protected toResponse(exception: HttpException): ApiErrorResponse {
    const status = exception.getStatus();
    const body = this.toBody(exception.getResponse());
    const code = body.code ?? HttpStatus[status] ?? ErrorCode.HttpError;

    // A 500 may carry internal details: logged by the base class, never exposed.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return ApiResponseBuilder.error(
        status,
        ErrorCode.InternalError,
        'An unexpected error occurred.',
      );
    }

    if (Array.isArray(body.message)) {
      return ApiResponseBuilder.error(
        status,
        code,
        body.error ?? exception.message,
        body.message.map((message) => ({ message })),
      );
    }

    return ApiResponseBuilder.error(
      status,
      code,
      body.message ?? exception.message,
      body.errors,
    );
  }

  private toBody(raw: string | object): HttpExceptionBody {
    return typeof raw === 'string'
      ? { message: raw }
      : (raw as HttpExceptionBody);
  }
}
