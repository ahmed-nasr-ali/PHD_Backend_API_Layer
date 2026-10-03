import { HttpException } from '@nestjs/common';
import { ValidationFailedError } from '../errors';

export interface ValidationExceptionFactory {
  create(error: ValidationFailedError): HttpException;
}
