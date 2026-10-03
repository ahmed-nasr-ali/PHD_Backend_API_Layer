import { HttpException, UnprocessableEntityException } from '@nestjs/common';
import { ValidationExceptionFactory } from '../contracts';
import { ValidationFailedError } from '../errors';

export class UnprocessableValidationExceptionFactory implements ValidationExceptionFactory {
  create(error: ValidationFailedError): HttpException {
    return new UnprocessableEntityException({
      message: error.message,
      errors: error.issues,
    });
  }
}
