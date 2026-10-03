import { PipeTransform } from '@nestjs/common';
import { ValidationExceptionFactory, Validator } from '../contracts';
import { ValidationFailedError } from '../errors';

export class SchemaValidationPipe implements PipeTransform {
  constructor(
    private readonly validator: Validator,
    private readonly exceptionFactory: ValidationExceptionFactory,
  ) {}

  transform(value: unknown) {
    try {
      return this.validator.validate(value);
    } catch (error) {
      if (error instanceof ValidationFailedError) {
        throw this.exceptionFactory.create(error);
      }
      throw error;
    }
  }
}
