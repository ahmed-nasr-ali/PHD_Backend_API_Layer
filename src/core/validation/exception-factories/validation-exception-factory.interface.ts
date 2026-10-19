import { HttpException } from '@nestjs/common';
import { ValidationFailedError } from '../errors/validation-failed.error';

export interface ValidationExceptionFactory {
  create(error: ValidationFailedError): HttpException;
}
