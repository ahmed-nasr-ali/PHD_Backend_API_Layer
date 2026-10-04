import type { ZodType } from 'zod';
import { Validator } from '../contracts';
import { ValidationFailedError } from '../errors';

export class ZodValidator<T> implements Validator<T> {
  constructor(private readonly schema: ZodType<T>) {}

  async validate(value: unknown): Promise<T> {
    const result = await this.schema.safeParseAsync(value);

    if (result.success) {
      return result.data;
    }

    throw new ValidationFailedError(
      result.error.issues.map((issue) => ({
        field: issue.path.length ? issue.path.map(String).join('.') : undefined,
        message: issue.message,
      })),
    );
  }
}
