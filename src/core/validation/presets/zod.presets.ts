import { HttpStatus } from '@nestjs/common';
import type { ZodType } from 'zod';
import { SchemaValidationPipe } from '../pipes';
import { ZodValidator } from '../validators';
import { HttpValidationExceptionFactory } from '../exception-factories';
import type { ValidationExceptionFactory } from '../contracts';

/** Builds a Zod validation pipe that rejects with the given exception. */
const zodPipe =
  (exceptionFactory: ValidationExceptionFactory) =>
  <T>(schema: ZodType<T>) =>
    new SchemaValidationPipe(new ZodValidator(schema), exceptionFactory);

/** Request body validation — rejects with 422 Unprocessable Entity. */
export const zodBody = zodPipe(
  new HttpValidationExceptionFactory(HttpStatus.UNPROCESSABLE_ENTITY),
);

/** Query string validation — rejects with 400 Bad Request. */
export const zodQuery = zodPipe(
  new HttpValidationExceptionFactory(HttpStatus.BAD_REQUEST),
);

/** Route param validation — rejects with 400 Bad Request. */
export const zodParam = zodPipe(
  new HttpValidationExceptionFactory(HttpStatus.BAD_REQUEST),
);
