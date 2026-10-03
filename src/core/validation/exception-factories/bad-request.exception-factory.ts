import { BadRequestException, HttpException } from '@nestjs/common';
import { ValidationExceptionFactory } from '../contracts';
import { ValidationFailedError } from '../errors';

export class BadRequestValidationExceptionFactory implements ValidationExceptionFactory {
  create(error: ValidationFailedError): HttpException {
    return new BadRequestException({
      message: error.message,
      errors: error.issues,
    });
  }
}
