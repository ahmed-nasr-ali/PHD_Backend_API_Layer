import { ArgumentMetadata, PipeTransform } from '@nestjs/common';
import { ValidationExceptionFactory, Validator } from '../contracts';
import { ValidationFailedError } from '../errors';

export class SchemaValidationPipe<T = unknown> implements PipeTransform<
  unknown,
  Promise<T>
> {
  constructor(
    private readonly validator: Validator<T>,
    private readonly exceptionFactory: ValidationExceptionFactory,
  ) {}

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<T> {
    try {
      return await this.validator.validate(value);
    } catch (error) {
      if (error instanceof ValidationFailedError) {
        throw this.exceptionFactory.create(this.withSource(error, metadata));
      }
      throw error;
    }
  }

  /** Root-level issues have no field; name them after the param (`id`) or the source (`body`). */
  private withSource(
    error: ValidationFailedError,
    metadata: ArgumentMetadata,
  ): ValidationFailedError {
    const source = metadata.data ?? metadata.type;
    return new ValidationFailedError(
      error.issues.map((issue) => ({ ...issue, field: issue.field ?? source })),
    );
  }
}
