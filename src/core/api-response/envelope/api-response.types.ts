export interface FieldError {
  field?: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  errors?: FieldError[];
  /** Only on 429: seconds to wait before trying again. */
  retryAfterSeconds?: number;
}
