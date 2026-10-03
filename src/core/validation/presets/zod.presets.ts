import { ZodSchema } from 'zod';
import { SchemaValidationPipe } from '../pipes';
import { ZodValidator } from '../validators';
import {
  BadRequestValidationExceptionFactory,
  UnprocessableValidationExceptionFactory,
} from '../exception-factories';

/** Request body validation — rejects with 422 Unprocessable Entity. */
export const zodBody = <T>(schema: ZodSchema<T>) =>
  new SchemaValidationPipe(
    new ZodValidator(schema),
    new UnprocessableValidationExceptionFactory(),
  );

/** Query string or route param validation — rejects with 400 Bad Request. */
export const zodQuery = <T>(schema: ZodSchema<T>) =>
  new SchemaValidationPipe(
    new ZodValidator(schema),
    new BadRequestValidationExceptionFactory(),
  );
