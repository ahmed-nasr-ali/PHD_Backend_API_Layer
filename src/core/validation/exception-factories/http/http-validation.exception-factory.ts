import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationExceptionFactory } from '../contracts';
import { ValidationFailedError } from '../errors';

/** Turns a validation failure into an `HttpException` with the given status (400 for query/params, 422 for bodies). */
export class HttpValidationExceptionFactory implements ValidationExceptionFactory {
  constructor(private readonly status: HttpStatus) {}

  create(error: ValidationFailedError): HttpException {
    return new HttpException(
      {
        code: error.code,
        message: error.message,
        errors: error.issues,
      },
      this.status,
    );
  }
}
