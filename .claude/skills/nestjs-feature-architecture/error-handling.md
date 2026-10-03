# Error Handling Across Layers

## Flow

```text
Dataverse Web API failure
  → DataverseException { status, cause }            core/dataverse (exists)
  → repository: 404 → null; known conflict → ApplicationError; else rethrow
  → service: business outcomes → ApplicationError
  → global filters                                  core/errors
       ApplicationError   → 404 / 409 / 422 / 403  { statusCode, code, message }
       DataverseException → 503 (429/503) or 502, details logged, never exposed
       HttpException      → as thrown (validation pipes: 422 body, 400 query/params)
       anything else      → 500 (Nest default)
```

## Base class (`src/core/errors/application-error.ts`)

```ts
export type ApplicationErrorKind =
  | 'not_found'
  | 'conflict'
  | 'rule_violation'
  | 'forbidden';

/** Base class for errors the business layers raise on purpose. Framework-free. */
export abstract class ApplicationError extends Error {
  abstract readonly kind: ApplicationErrorKind;

  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
```

## Filters (`src/core/errors/`)

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DataverseException } from '../dataverse';
import { ApplicationError, ApplicationErrorKind } from './application-error';

const STATUS_BY_KIND: Record<ApplicationErrorKind, HttpStatus> = {
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  rule_violation: HttpStatus.UNPROCESSABLE_ENTITY,
  forbidden: HttpStatus.FORBIDDEN,
};

@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(error: ApplicationError, host: ArgumentsHost) {
    const status = STATUS_BY_KIND[error.kind];
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      code: error.code,
      message: error.message,
    });
  }
}

/** Last-resort translation of Dataverse failures that no repository handled. */
@Catch(DataverseException)
export class DataverseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DataverseExceptionFilter.name);

  catch(error: DataverseException, host: ArgumentsHost) {
    this.logger.error(
      `Dataverse call failed (status ${error.status ?? 'n/a'}): ${error.message}`,
      error.stack,
    );

    const status =
      error.status === 429 || error.status === 503
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_GATEWAY;

    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      message: 'The data service is unavailable. Please try again later.',
    });
  }
}
```

Register them in `AppModule`:

```ts
providers: [
  { provide: APP_FILTER, useClass: ApplicationErrorFilter },
  { provide: APP_FILTER, useClass: DataverseExceptionFilter },
],
```

## Same error, different callers

Domain and services throw an error with a `kind` + `code` only. **Each caller maps it.** HTTP is just one caller:

| `kind` | HTTP (`ApplicationErrorFilter`) | CLI / queue consumer (example) |
| --- | --- | --- |
| `rule_violation` | 422 | print message, exit 1 / reject the message |
| `conflict` | 409 | print message, exit 1 / skip as duplicate |
| `not_found` | 404 | print message, exit 1 |
| `forbidden` | 403 | print message, exit 1 |

```ts
// A CLI command calling the same service: no HTTP involved.
try {
  await createCustomer.execute(input);
} catch (error) {
  if (error instanceof ApplicationError) {
    console.error(`${error.code}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  throw error;
}
```

## Rules

- Never `throw new Error('…')` for business outcomes; it becomes a 500.
- Never throw `HttpException` subclasses from domain or services.
- No HTTP status codes in `domain/` or `services/`, not even in comments (`// kind: conflict`, not `// → 409`). Only `core/errors/` filters and controllers know HTTP.
- Never `catch (DataverseException)` in a service. Repositories translate expected errors (see `dataverse-data-access` → `error-handling.md`).
- Never put Dataverse error text in API responses; log it.
- Keep `cause` when wrapping errors.
