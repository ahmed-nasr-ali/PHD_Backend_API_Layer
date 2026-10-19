import {
  ApiErrorResponse,
  ApiSuccessResponse,
  FieldError,
} from './api-response.types';

export class ApiResponseBuilder {
  static success<T>(
    statusCode: number,
    data: T,
    message = 'OK',
  ): ApiSuccessResponse<T> {
    return { statusCode, message, data };
  }

  static error(
    statusCode: number,
    code: string,
    message: string,
    errors?: FieldError[],
  ): ApiErrorResponse {
    return {
      statusCode,
      code,
      message,
      ...(errors?.length ? { errors } : {}),
    };
  }
}
