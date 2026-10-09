import { Catch, HttpStatus } from '@nestjs/common';
import {
  BusinessError,
  BusinessErrorKind,
  RetryLaterError,
} from '../../errors';
import { ApiErrorResponse, ApiResponseBuilder } from '../api-response';
import { ApiExceptionFilter } from './api-exception.filter';

const STATUS_BY_KIND: Record<BusinessErrorKind, HttpStatus> = {
  [BusinessErrorKind.NotFound]: HttpStatus.NOT_FOUND,
  [BusinessErrorKind.Conflict]: HttpStatus.CONFLICT,
  [BusinessErrorKind.RuleViolation]: HttpStatus.UNPROCESSABLE_ENTITY,
  [BusinessErrorKind.Forbidden]: HttpStatus.FORBIDDEN,
  [BusinessErrorKind.TooManyRequests]: HttpStatus.TOO_MANY_REQUESTS,
};

/** Business errors raised on purpose by domain and services. */
@Catch(BusinessError)
export class BusinessErrorFilter extends ApiExceptionFilter<BusinessError> {
  /** RetryLaterError → the body also says how long to wait · any other → the plain envelope */
  protected toResponse(error: BusinessError): ApiErrorResponse {
    const body = ApiResponseBuilder.error(
      STATUS_BY_KIND[error.kind],
      error.code,
      error.message,
    );
    return error instanceof RetryLaterError
      ? { ...body, retryAfterSeconds: error.retryAfterSeconds }
      : body;
  }
}
