import { Catch, HttpStatus } from '@nestjs/common';
import { DataverseException } from '../../dataverse';
import { ApiErrorResponse, ApiResponseBuilder } from '../../api-response';
import { ApiExceptionFilter } from '../api-exception.filter';
import { ErrorCode } from '../../errors';

const BUSY_STATUSES = [429, 503];

/**
 * Last-resort translation of Dataverse failures that no repository handled, so the client sees who is at fault without internal details.
 * 429/503 → 503 UPSTREAM_UNAVAILABLE (try again later) · other 5xx or no status → 502 UPSTREAM_ERROR · 4xx → 500 INTERNAL_ERROR (our request was wrong)
 */
@Catch(DataverseException)
export class DataverseExceptionFilter extends ApiExceptionFilter<DataverseException> {
  protected toResponse(error: DataverseException): ApiErrorResponse {
    const status = error.status;

    if (status !== undefined && BUSY_STATUSES.includes(status)) {
      return ApiResponseBuilder.error(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCode.UpstreamUnavailable,
        'The data service is busy. Please try again later.',
      );
    }

    if (status !== undefined && status < 500) {
      return ApiResponseBuilder.error(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCode.InternalError,
        'An unexpected error occurred.',
      );
    }

    return ApiResponseBuilder.error(
      HttpStatus.BAD_GATEWAY,
      ErrorCode.UpstreamError,
      'The data service failed to answer. Please try again later.',
    );
  }

  protected describe(error: DataverseException): string {
    return `Dataverse call failed (status ${error.status ?? 'N/A'}): ${error.message}`;
  }
}
