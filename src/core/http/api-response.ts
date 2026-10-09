export interface FieldError {
  field?: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  data: null;
  errors?: FieldError[];
  /** Only on 429: seconds to wait before trying again. */
  retryAfterSeconds?: number;
}

export class ApiResponseBuilder {
  static success<T>(
    statusCode: number,
    data: T,
    message = 'OK',
  ): ApiSuccessResponse<T> {
    return { success: true, statusCode, message, data };
  }

  static error(
    statusCode: number,
    code: string,
    message: string,
    errors?: FieldError[],
  ): ApiErrorResponse {
    return {
      success: false,
      statusCode,
      code,
      message,
      data: null,
      ...(errors?.length ? { errors } : {}),
    };
  }
}
