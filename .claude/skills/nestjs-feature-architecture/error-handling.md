# Error Handling Across Layers

## Flow

```text
Dataverse Web API failure
  → DataverseException { status, cause }            core/dataverse
  → repository: 404 → null; known conflict → BusinessError; else rethrow
  → service: business outcomes → BusinessError
  → global filters                                  core/http/filters
       BusinessError      → 404 / 409 / 422 / 403  code = error.code
       DataverseException → 503 (429/503) or 502   code = UPSTREAM_UNAVAILABLE, details logged, never exposed
       HttpException      → its own status          validation: VALIDATION_FAILED + errors (422 body, 400 query/params);
                                                    a 500 becomes INTERNAL_ERROR with a generic message
       anything else      → 500                     code = INTERNAL_ERROR, details logged, never exposed

Every response with status ≥ 500 is logged once, by the base filter.
```

Every response, success or error, uses one envelope (built only by `ApiResponseBuilder` in `src/core/http/api-response.ts`):

```jsonc
// success: controllers return the response DTO; ResponseInterceptor wraps it
{ "success": true,  "statusCode": 200, "message": "OK", "data": { /* response DTO */ } }
// error: built by the exception filters
{ "success": false, "statusCode": 404, "code": "CUSTOMER_NOT_FOUND", "message": "Customer 42 was not found", "data": null }
// validation error
{ "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [{ "field": "email", "message": "Invalid email address" }] }
```

`code` is the stable value clients switch on; `message` is for display and may change. Adding envelope fields is safe; removing or renaming one is a breaking change.

The codes the system itself returns are the `ErrorCode` enum (`src/core/errors/error-code.ts`): `VALIDATION_FAILED`, `UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`, `HTTP_ERROR` (an `HttpException` whose status has no name). Never hand-type these strings; other `HttpException`s use the status name (`NOT_FOUND`), and business errors bring their own code (`CUSTOMER_NOT_FOUND`).

## Base class (`src/core/errors/business-error.ts`)

`core/errors` is framework-free (no NestJS, no HTTP), so `domain/` and `services/` may import it.

```ts
/** What went wrong, from the business point of view. Each caller (HTTP, CLI, queue) maps it its own way. */
export enum BusinessErrorKind {
  NotFound = 'not_found',
  Conflict = 'conflict',
  RuleViolation = 'rule_violation',
  Forbidden = 'forbidden',
}

/** Base class for errors the business layers raise on purpose. Framework-free. */
export abstract class BusinessError extends Error {
  abstract readonly kind: BusinessErrorKind;

  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}
```

A module declares **one** error-code enum, `domain/enums/<module>-error-code.enum.ts`, and **one** errors file, `domain/errors/<module>.errors.ts`, for all its entities. Never one enum or errors file per entity (e.g. the `authentication` module has `AuthenticationErrorCode` and `authentication.errors.ts` holding both `UserExistsError` and `NotPhdCustomerError`). `<module>` is the singular module name (`customers` → `customer`):

```ts
// domain/enums/customer-error-code.enum.ts
/** Codes the customers feature returns in the error envelope. Part of the API contract: never rename a value. */
export enum CustomerErrorCode {
  NotFound = 'CUSTOMER_NOT_FOUND',
}
```

```ts
// domain/errors/customer.errors.ts
import { BusinessError, BusinessErrorKind } from '../../../../core/errors';
import { CustomerErrorCode } from '../enums/customer-error-code.enum';

export class CustomerNotFoundError extends BusinessError {
  readonly kind = BusinessErrorKind.NotFound;

  constructor(id: string) {
    super(`Customer ${id} was not found`, CustomerErrorCode.NotFound);
  }
}
```

## Filters and interceptor (`src/core/http/`)

These already exist; features never touch them.

| File | Role |
| --- | --- |
| `filters/api-exception.filter.ts` | abstract base (Template Method): `catch()` logs any response ≥ 500 (message from `describe()`, overridable) and writes the response through `HttpAdapterHost` (not Express); subclasses only implement `toResponse(exception): ApiErrorResponse` |
| `filters/business-error.filter.ts` | `@Catch(BusinessError)`: `Record<BusinessErrorKind, HttpStatus>` → 404 / 409 / 422 / 403 |
| `filters/dataverse-exception.filter.ts` | `@Catch(DataverseException)`: 503 / 502 `UPSTREAM_UNAVAILABLE`; overrides `describe()` to log the Dataverse status |
| `filters/http-exception.filter.ts` | `@Catch(HttpException)`: keeps the exception's status; `code` from the body or the status name (`NOT_FOUND`); validation `errors` carried through; a `message` array becomes one `errors` entry per message; a 500 is answered with `INTERNAL_ERROR` and a generic message |
| `filters/unhandled-exception.filter.ts` | `@Catch()`: 500 `INTERNAL_ERROR` with a generic message |
| `response.interceptor.ts` | wraps successful results in the success envelope; skips `StreamableFile`, 204 and non-HTTP contexts |
| `http.module.ts` | registers the 4 filters (`APP_FILTER`) and the interceptor (`APP_INTERCEPTOR`); imported once in `AppModule` |

A filter is only a translation (logging and writing the response are inherited):

```ts
@Catch(BusinessError)
export class BusinessErrorFilter extends ApiExceptionFilter<BusinessError> {
  protected toResponse(error: BusinessError): ApiErrorResponse {
    return ApiResponseBuilder.error(
      STATUS_BY_KIND[error.kind],
      error.code,
      error.message,
    );
  }
}
```

**Filter order matters.** Nest tries global filters in reverse registration order and uses the first whose `@Catch` matches (`instanceof`). The catch-all `UnhandledExceptionFilter` must therefore be registered **first** in `HttpModule`, or it would swallow every error as a 500.

**Adding an error source** (e.g. a PostgreSQL error filter after a migration): a new `ApiExceptionFilter` subclass in `core/http/filters/` + one `APP_FILTER` line in `HttpModule` after the catch-all. If it returns ≥ 500 it is logged automatically; override `describe()` only to add details to the log line. Nothing else changes.

## Same error, different callers

Domain and services throw an error with a `kind` + `code` only. **Each caller maps it.** HTTP is just one caller:

| `kind` | HTTP (`BusinessErrorFilter`) | CLI / queue consumer (example) |
| --- | --- | --- |
| `RuleViolation` | 422 | print message, exit 1 / reject the message |
| `Conflict` | 409 | print message, exit 1 / skip as duplicate |
| `NotFound` | 404 | print message, exit 1 |
| `Forbidden` | 403 | print message, exit 1 |

```ts
// A CLI command calling the same service: no HTTP involved.
try {
  await createCustomer.execute(input);
} catch (error) {
  if (error instanceof BusinessError) {
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
- No HTTP status codes in `domain/` or `services/`, not even in comments (`// kind: Conflict`, not `// → 409`). Only `core/http/` and controllers know HTTP.
- Never `catch (DataverseException)` in a service. Repositories translate expected errors (see `dataverse-data-access` → `error-handling.md`).
- Never put Dataverse or unexpected error text in API responses; log it.
- Keep `cause` when wrapping errors.
- Controllers never build the envelope themselves; they return the response DTO.
- Never hand-type a business error code: use the feature's error-code enum (`CustomerErrorCode.NotFound`), the same way system codes use `ErrorCode`.
