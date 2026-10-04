import { Catch, HttpStatus } from '@nestjs/common';
import { BusinessError, BusinessErrorKind } from '../../errors';
import { ApiErrorResponse, ApiResponseBuilder } from '../api-response';
import { ApiExceptionFilter } from './api-exception.filter';

const STATUS_BY_KIND: Record<BusinessErrorKind, HttpStatus> = {
  [BusinessErrorKind.NotFound]: HttpStatus.NOT_FOUND,
  [BusinessErrorKind.Conflict]: HttpStatus.CONFLICT,
  [BusinessErrorKind.RuleViolation]: HttpStatus.UNPROCESSABLE_ENTITY,
  [BusinessErrorKind.Forbidden]: HttpStatus.FORBIDDEN,
};

/** Business errors raised on purpose by domain and services. */
@Catch(BusinessError)
export class BusinessErrorFilter extends ApiExceptionFilter<BusinessError> {
  protected toResponse(error: BusinessError): ApiErrorResponse {
    return ApiResponseBuilder.error(
      STATUS_BY_KIND[error.kind],
      error.code,
      error.message,
    );
  }
}
