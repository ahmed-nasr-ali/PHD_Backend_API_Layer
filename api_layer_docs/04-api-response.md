# Step 4: The API response

Every HTTP response the app sends has **one shape**, whether the request succeeded or failed. The frontend parses one structure and switches on `code`.

Two folders build that shape and send it:

```
src/core/api-response/                             the shape + success
├── envelope/
│   ├── api-response.types.ts                      FieldError, ApiSuccessResponse, ApiErrorResponse
│   └── api-response.builder.ts                    ApiResponseBuilder
├── interceptors/
│   └── response.interceptor.ts                    ResponseInterceptor: success → envelope
├── api-response.module.ts                         ApiResponseModule: registers the interceptor
└── index.ts

src/core/exception-filters/                        failure → envelope
├── api-exception.filter.ts                        ApiExceptionFilter (abstract base)
├── business-error/business-error.filter.ts
├── dataverse-exception/dataverse-exception.filter.ts
├── http-exception/http-exception.filter.ts
├── unhandled-exception/unhandled-exception.filter.ts
├── exception-filters.module.ts                    ExceptionFiltersModule: registers the filters
└── index.ts
```

`exception-filters` builds its responses with `ApiResponseBuilder`, imported from `core/api-response`.

Success and failure take **two separate paths**; neither passes through the other:

```
Request
   │
   ▼
Controller
   │
   ├── returns ✅ ──► ResponseInterceptor ──► { statusCode, message, data }            ──► client
   │
   └── throws  ❌ ──► matching filter    ──► { statusCode, code, message, errors? }    ──► client
```

Features never build the envelope and never register filters. Controllers return their response DTO; services and the domain throw errors.

---

## 1. The envelope

### 1.1 The shapes: `api-response.types.ts`

```ts
export interface FieldError {
  field?: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  errors?: FieldError[];
  /** Only on 429: seconds to wait before trying again. */
  retryAfterSeconds?: number;
}
```

What the client receives:

```jsonc
// success
{ "statusCode": 200, "message": "OK", "data": { /* response DTO */ } }

// error
{ "statusCode": 404, "code": "INVITATION_NOT_FOUND", "message": "No invitation was found for this code" }

// validation error
{ "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email address" }] }

// try again later
{ "statusCode": 429, "code": "OTP_RESEND_TOO_SOON", "message": "Please wait 50 seconds…", "retryAfterSeconds": 50 }
```

| Field | Present on | Meaning |
|---|---|---|
| `statusCode` | both | Same as the HTTP status; 2xx = success |
| `message` | both | Human-readable; may change, so clients must not branch on it |
| `data` | success | The payload (the controller's response DTO) |
| `code` | error | Stable, machine-readable; the client branches on this |
| `errors` | error, optional | Field-level problems (`{ field?, message }[]`) |
| `retryAfterSeconds` | 429 only | Seconds to wait before trying again |

These are `interface`s: shapes only, no logic, gone after compilation.

### 1.2 Building it: `api-response.builder.ts`

```ts
export class ApiResponseBuilder {
  static success<T>(statusCode: number, data: T, message = 'OK'): ApiSuccessResponse<T> {
    return { statusCode, message, data };
  }

  static error(statusCode: number, code: string, message: string, errors?: FieldError[]): ApiErrorResponse {
    return {
      statusCode,
      code,
      message,
      ...(errors?.length ? { errors } : {}),
    };
  }
}
```

- **The only place the envelope is built.** The interceptor and every filter call it, so the shape cannot drift between them.
- `static`: no state, nothing to inject; called as `ApiResponseBuilder.error(...)`.
- `...(errors?.length ? { errors } : {})`: adds `errors` only when there is at least one. An empty or missing list leaves the field out instead of sending `"errors": []`.

**The envelope is a contract with the frontend.** Adding a field is safe; removing or renaming one breaks clients.

---

## 2. Success: `ResponseInterceptor`

```ts
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile || response.statusCode === HttpStatus.NO_CONTENT) {
          return data;
        }
        return ApiResponseBuilder.success(response.statusCode, data ?? null);
      }),
    );
  }
}
```

Step by step:

1. **Not HTTP → leave it alone.** Nest can also serve WebSockets, microservices or queues; the envelope is for HTTP only.
2. **Get the response object** of this request. The type `{ statusCode: number }` says we only read its status.
3. **`next.handle()`** runs the controller. **`map`** runs on its result, **only on success**; a thrown error skips `map` and goes to the filters.
4. **The status is read inside `map`**, after the controller finished, so `@HttpCode(201)` is respected.
5. **Two results are sent as they are:**

   | Result | Why it is not wrapped |
   |---|---|
   | `StreamableFile` (file download) | The file goes in the body as raw bytes; headers (`Content-Type`, `Content-Length`, `Content-Disposition`) describe it. Wrapping it in JSON would break the download. |
   | Status 204 No Content | 204 means "no body". Express drops any body on a 204 and clients ignore it. If the frontend wants the envelope, return 200 with `null` instead. |

6. **Everything else** is wrapped: `{ statusCode, message: 'OK', data }`. `data ?? null` turns `undefined` (a controller that returns nothing) into `null`, so `data` is always present.

---

## 3. Failure: the filters

### 3.1 The base class: `ApiExceptionFilter`

```ts
@Injectable()
export abstract class ApiExceptionFilter<E> implements ExceptionFilter<E> {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: E, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();

    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }

    const body = this.toResponse(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(this.describe(exception), this.stackOf(exception));
    }
    httpAdapter.reply(response, body, body.statusCode);
  }

  protected abstract toResponse(exception: E): ApiErrorResponse;

  protected describe(exception: E): string {
    return exception instanceof Error ? exception.message : String(exception);
  }

  private stackOf(exception: E): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
  }
}
```

**Template Method.** The steps that are the same for every error (check, log, send) are written once here. Each subclass fills in one step only, `toResponse()`: how *its* error becomes the envelope.

| Member | Who writes it | Job |
|---|---|---|
| `catch()` | base | The fixed steps below |
| `toResponse()` | **each subclass** (abstract) | Error → `ApiErrorResponse` |
| `describe()` | base; a subclass may override | The log line for a ≥ 500 error |
| `stackOf()` | base | The stack trace for the log |

**`logger`**: `new Logger(this.constructor.name)` uses the **subclass** name, so logs read `[DataverseExceptionFilter] …`, not `[ApiExceptionFilter] …`.

**`HttpAdapterHost`**: Nest can run on Express or Fastify, and each sends a response differently (`res.status().json()` vs `res.code().send()`). `httpAdapter` sends it the same way on both. Nest provides `HttpAdapterHost` automatically; we inject the *host* (a holder) and read `httpAdapter` inside `catch()`, because the filters are created at startup, possibly before the adapter is ready.

**`catch()` step by step:**

1. **`response`** comes from `host`: this request's own response object. The adapter is one object for the whole app, so it needs to know *which* client to answer.
2. **Headers already sent → close the connection.** If a response had started (e.g. a file download that fails halfway), the status and part of the body are already with the client. HTTP cannot change them, and writing again would throw *"Cannot set headers after they are sent"*. Ending the connection lets the client detect the cut (with `Content-Length`, it knows the file is incomplete). Uploads do not hit this case: their errors happen before any response starts.
3. **`toResponse()`**: the subclass builds the envelope.
4. **≥ 500 → log it** with the real details. The client gets a generic message; the developer gets the cause in the logs. 4xx errors are expected client mistakes and are not logged.
5. **`httpAdapter.reply(response, body, status)`** sends the envelope straight to the client.

### 3.2 The four filters

Each subclass declares with `@Catch(...)` which errors it handles and implements `toResponse()`.

#### `BusinessErrorFilter`: `@Catch(BusinessError)`

Errors the domain and services throw **on purpose**. They carry a `kind` (what went wrong) and a `code` (which error exactly), never an HTTP status; this filter picks the status:

```ts
const STATUS_BY_KIND: Record<BusinessErrorKind, HttpStatus> = {
  [BusinessErrorKind.NotFound]: HttpStatus.NOT_FOUND,                    // 404
  [BusinessErrorKind.Conflict]: HttpStatus.CONFLICT,                     // 409
  [BusinessErrorKind.RuleViolation]: HttpStatus.UNPROCESSABLE_ENTITY,    // 422
  [BusinessErrorKind.Forbidden]: HttpStatus.FORBIDDEN,                   // 403
  [BusinessErrorKind.TooManyRequests]: HttpStatus.TOO_MANY_REQUESTS,     // 429
};
```

- `Record<BusinessErrorKind, HttpStatus>` requires **every** kind to have a status: adding a kind without a status here is a compile error.
- `[BusinessErrorKind.NotFound]`: the brackets use the enum's **value** (`'not_found'`) as the key, not the literal word.
- A `RetryLaterError` also gets `retryAfterSeconds` in the body.
- `code` and `message` come from the error itself (e.g. `INVITATION_NOT_FOUND`).

#### `DataverseExceptionFilter`: `@Catch(DataverseException)`

Dataverse failures that **no repository handled**. Expected cases (like a 404 meaning "not found") are translated by repositories before they get here, so anything reaching this filter is unexpected:

| Dataverse status | Client gets | Meaning |
|---|---|---|
| 429 / 503 | **503** `UPSTREAM_UNAVAILABLE` | Busy; try again later |
| 4xx (400, 401, 403, 404 …) | **500** `INTERNAL_ERROR` | Our request was wrong (bad query, wrong table/column, app permissions): a bug on our side |
| Other 5xx, or no status (network, token) | **502** `UPSTREAM_ERROR` | Dataverse failed or did not answer |

- Dataverse's own message is **never sent** to the client: it reveals table/column names and query details, and the user cannot act on it.
- It is **logged** instead: `describe()` is overridden to include the Dataverse status (`Dataverse call failed (status 400): …`). All three answers are ≥ 500, so all three are logged.

#### `HttpExceptionFilter`: `@Catch(HttpException)`

Nest's own `HttpException`s and the validation pipes (`zodBody` 422, `zodQuery`/`zodParam` 400).

1. **Normalise the body** with `toBody()`. `exception.getResponse()` is a **string** or an **object**, depending on how the exception was thrown; a string becomes `{ message: raw }`, so the rest of the code reads one shape (`HttpExceptionBody`: `code?`, `message?`, `error?`, `errors?`).
2. **Pick the code**: the body's `code` (validation pipes send `VALIDATION_FAILED`) → else the status name (`NOT_FOUND`, `BAD_REQUEST`) → else `HTTP_ERROR`.
3. **500 → generic answer** (`INTERNAL_ERROR`): a 500 may carry internal details; they are logged, never exposed.
4. **`message` is an array** (Nest's built-in pipes list several problems): the main message becomes `body.error` (e.g. `"Bad Request"`) and each string becomes one `{ message }` in `errors`.
5. **Otherwise**: the body's `message` and `errors` as they are. This is the path the validation pipes take: their `errors` already have `field`.

#### `UnhandledExceptionFilter`: `@Catch()`

`@Catch()` with no argument catches **everything**. Any error no other filter handled (a bug, a library error) becomes **500** `INTERNAL_ERROR` with a generic message. The real error and stack trace are logged by the base class.

---

## 4. Wiring: two modules

```ts
// core/api-response/api-response.module.ts
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor }],
})
export class ApiResponseModule {}

// core/exception-filters/exception-filters.module.ts
@Module({
  providers: [
    { provide: APP_FILTER, useClass: UnhandledExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DataverseExceptionFilter },
    { provide: APP_FILTER, useClass: BusinessErrorFilter },
  ],
})
export class ExceptionFiltersModule {}
```

- `APP_INTERCEPTOR` / `APP_FILTER` register them **globally**: every controller in every module gets them. `AppModule` imports both modules once.
- **Order matters.** Nest tries global filters in **reverse** registration order and uses the first whose `@Catch` matches (`instanceof`). The catch-all `UnhandledExceptionFilter` must therefore be registered **first** (tried last); otherwise it would answer every error with a 500.

---

## 5. Adding an error source

For example, a filter for PostgreSQL errors after a migration:

1. Add `exception-filters/postgres-exception/postgres-exception.filter.ts`: `@Catch(PostgresError)`, extends `ApiExceptionFilter<PostgresError>`, implements `toResponse()` with `ApiResponseBuilder.error(...)`.
2. Add one `APP_FILTER` line in `ExceptionFiltersModule`, **after** the catch-all.

Logging ≥ 500 and sending the response come from the base class. Override `describe()` only to add details to the log line.

---

## Summary

| Piece | Role |
|---|---|
| `api-response.types.ts` | The envelope shapes: the contract with the frontend |
| `ApiResponseBuilder` | The only place the envelope is built |
| `ResponseInterceptor` | Success → `{ statusCode, message, data }`; files and 204 sent as they are |
| `ApiExceptionFilter` | Fixed steps for every error: headers check, log ≥ 500, send |
| `BusinessErrorFilter` | `kind` → 404 / 409 / 422 / 403 / 429, with the error's own `code` |
| `DataverseExceptionFilter` | 503 busy · 502 Dataverse failed · 500 our bug; details logged only |
| `HttpExceptionFilter` | Nest and validation exceptions; string or object body; arrays → `errors` |
| `UnhandledExceptionFilter` | Anything else → 500, logged |
| `ApiResponseModule` | Registers the interceptor globally |
| `ExceptionFiltersModule` | Registers the 4 filters globally; catch-all first |
