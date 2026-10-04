import { Catch, HttpStatus } from '@nestjs/common';
import { DataverseException } from '../../dataverse';
import { ApiErrorResponse, ApiResponseBuilder } from '../api-response';
import { ApiExceptionFilter } from './api-exception.filter';
import { ErrorCode } from '../../errors';

/** Last-resort translation of Dataverse failures that no repository handled. */
@Catch(DataverseException)
export class DataverseExceptionFilter extends ApiExceptionFilter<DataverseException> {
  protected toResponse(error: DataverseException): ApiErrorResponse {
    const status =
      error.status === 429 || error.status === 503
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_GATEWAY;

    return ApiResponseBuilder.error(
      status,
      ErrorCode.UpstreamUnavailable,
      'The data service is unavailable. Please try again later.',
    );
  }

  protected describe(error: DataverseException): string {
    return `Dataverse call failed (status ${error.status ?? 'N/A'}): ${error.message}`;
  }
}
