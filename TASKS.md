# Tasks: validation layer + global exception layer

Work one task at a time: finish it, verify it, then move to the next.

## Part 1: Validation layer (`src/core/validation/`)

- [x] **1. Async schemas return 500.** `safeParse` is sync, so async `refine`/`transform` threw `$ZodAsyncError`. Fixed with `safeParseAsync` + async `Validator` contract + async pipe.
- [x] **2. `field: ""` for root errors.** Route params and missing bodies produced an empty field name. Fixed: `ValidationIssue.field` is optional, the validator leaves it out for root issues, and the pipe fills it from `ArgumentMetadata` (`id`, `page`, `body`).
- [x] **3. `issue.path.join('.')` throws on symbol keys.** Zod 4 paths are `PropertyKey[]`. Fixed with `issue.path.map(String).join('.')`, which keeps the `tags.0.name` format.
- [x] **4. `ZodSchema` is a deprecated alias in Zod 4.** Replaced with `import type { ZodType }` in `zod.validator.ts` and `zod.presets.ts`.
- [x] **5. Pipe loses the validated type.** Fixed: `SchemaValidationPipe<T = unknown> implements PipeTransform<unknown, Promise<T>>` with `Validator<T>`; `zodBody(schema)` now infers `T`.
- [x] **6. Inconsistent factory names.** Renamed `UnprocessableValidationExceptionFactory` → `UnprocessableEntityValidationExceptionFactory` (pattern: `<NestException>ValidationExceptionFactory`).
- [x] **7. `zodParam` for route params.** Added; presets are now built by one `zodPipe(exceptionFactory)` builder (DRY): `zodBody` → 422, `zodQuery` / `zodParam` → 400. Skill + docs still say `zodQuery` for params → task 22.
- [ ] **8. (Deferred, YAGNI) `StandardSchemaValidator`.** One adapter for Zod, Valibot and ArkType. Not needed while Zod is the only library; swapping later = new `Validator` + change `zodPipe`.
- [ ] **9. (Deferred) Unit tests** for `ZodValidator`, `SchemaValidationPipe` (with a fake `Validator`) and both factories.

## Part 2: Global exception layer + unified response (`src/core/errors/`, `src/core/http/`)

- [x] **10. Decide the response envelope.** Every response (success and error) uses one shape:

  ```jsonc
  // success
  { "success": true,  "statusCode": 200, "message": "OK", "data": { /* ... */ } }
  // error
  { "success": false, "statusCode": 404, "code": "CUSTOMER_NOT_FOUND", "message": "...", "data": null }
  // validation error
  { "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
    "errors": [{ "field": "email", "message": "Invalid email" }] }
  ```

  Rules: `data` holds the success payload only (`null` on errors); field errors go in `errors`; `code` is the stable, machine-readable value clients switch on. Error codes: `VALIDATION_FAILED`, the `BusinessError` code, `UPSTREAM_UNAVAILABLE` (Dataverse), the HTTP name for other `HttpException`s (`NOT_FOUND`, ...), `INTERNAL_ERROR` (unexpected).
  Compatibility: adding fields later is safe; removing or renaming one is a breaking change (needs deprecation or `/v2`).
- [x] **11. `core/errors/business-error.ts`.** Framework-free abstract `BusinessError` with `kind` + `code` (+ `cause` via `ErrorOptions`). Renamed from `ApplicationError` (code, docs, skills); `kind` is the `BusinessErrorKind` enum (`NotFound`, `Conflict`, `RuleViolation`, `Forbidden`).
- [x] **12. `core/http/api-response.ts`.** Envelope types + `ApiResponseBuilder.success()` / `.error()`: the only place that knows the shape.
- [x] **13. `core/http/filters/business-error.filter.ts`.** Maps `BusinessErrorKind` → 404 / 409 / 422 / 403 through a `Record` (a new kind won't compile until mapped).
- [x] **14. `core/http/filters/dataverse-exception.filter.ts`.** 429/503 → 503, everything else → 502, `code: UPSTREAM_UNAVAILABLE`; logs details, never exposes Dataverse text.
- [x] **15. `core/http/filters/http-exception.filter.ts`.** Validation and Nest `HttpException`s → envelope; validation `errors` carried through (`code: VALIDATION_FAILED` set by the validation factories); a `message` array becomes one `errors` entry per message.
- [x] **16. `core/http/filters/unhandled-exception.filter.ts`.** `@Catch()`: unexpected errors → 500 `INTERNAL_ERROR`; logs the error, never exposes its message.
- [x] **17. `core/http/filters/api-exception.filter.ts`.** Abstract base (Template Method): subclasses only implement `toResponse()`; it writes through `HttpAdapterHost` and ends the response if headers were already sent.
- [x] **18. `core/http/http.module.ts`.** Registers the 4 filters as `APP_FILTER` (catch-all first: Nest tries global filters in reverse order) + the interceptor; imported in `AppModule`.
- [x] **19. `core/http/response.interceptor.ts`.** Wraps controller results in the success envelope (`undefined` → `data: null`); skips `StreamableFile`, 204 and non-HTTP contexts.

  Verified: `tsc` + `nest build` pass; 25 cases run in an isolated Nest app (fake controller, no Dataverse / `.env`): success, 204, file download, the 4 business kinds, Dataverse 429/400/no status, body/param/query validation, Nest 404/unknown route/array message/string body, bugs → 500.
- [ ] **20. (Deferred) Unit tests** for the filters and the interceptor with a fake `ArgumentsHost` / `ExecutionContext`.
- [ ] **21. (Deferred, YAGNI) Add `code` to `DataverseException`.** Only needed to turn a concurrent duplicate-key create into 409 instead of 502. Do it with the first feature that creates records with an alternate key, after observing the real Dataverse error code (the library's `RequestError.code` is often empty). Change: `readonly code?: string` before `options` + pass `requestError?.code` in `DynamicsWebApiClient.toDataverseException`.
- [x] **22. Update the skills and docs.** Envelope + `ResponseInterceptor`, `zodParam`, filters in `core/http/filters/` (`core/errors` framework-free), `ApiExceptionFilter` + `HttpAdapterHost` examples, `HttpModule` registration and filter order, `BusinessError` rename, `BusinessErrorKind` enum. Skills: `nestjs-feature-architecture` (SKILL, error-handling, folder-structure), `request-validation-and-dtos`. Docs: guide (ch. 0, 3, 5, 12, 13, tree, cheat sheet), reference, `structure.md`, `flow.md`, `review-and-corrections.md`.

## Part 3: Review of `src/core` (OOP, SOLID, patterns, DRY)

- [x] **R1. Logging in one place.** `ApiExceptionFilter.catch()` logs any response ≥ 500 (`describe()` overridable; Dataverse adds its status). Fixed a gap: a 5xx `HttpException` was never logged, and a 500's message reached the client; now it gets a generic message.
- [x] **R2. `ErrorCode` enum** (`core/errors/error-code.ts`): `VALIDATION_FAILED`, `UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`, `HTTP_ERROR`; no hand-typed codes left. Every 500 is now `INTERNAL_ERROR` (an `InternalServerErrorException` used to give `INTERNAL_SERVER_ERROR`). `ApiResponseBuilder` keeps only `success()` / `error()`.
- [x] **R3. One validation exception factory.** `BadRequest…` + `UnprocessableEntity…` (identical) → `HttpValidationExceptionFactory(status)`.
- [x] **R4. File naming** to `<name>.<type>.ts` + plural folders: `http/filters/`, `dataverse-retry.policy.ts`, `msal-token.provider.ts`, `token.provider.ts`, `dataverse.client.ts` (`git mv`, imports + docs updated).
- [x] **R5. `DataverseRetryPolicy` is abstract** (like `TokenProvider` / `DataverseClient`); the 401 logic is `TokenRefreshRetryPolicy`. A 429 policy = new implementation + one `useClass` line.
- [ ] **R6. (Deferred, YAGNI) Filters check `host.getType() === 'http'`.** Needed only when WebSocket / microservice transports are added.
- [x] **R7. `DataverseConfig` takes a named object** instead of 4 positional strings.
- [x] **R8. Cleanup.** Removed unused `ApiResponse<T>`; `import type` + JSDoc in `zod.presets.ts`; `UnhandledExceptionFilter` comment and unused parameter.
- [x] **R9. Docs + skills updated** for R1–R7.
- [ ] **R10. (Deferred, YAGNI) Type-check the `HttpException` body at runtime.** `HttpExceptionFilter.toBody()` trusts the body with `as HttpExceptionBody`, so a hand-made `new HttpException({ message: 123 }, 400)` would put a number in `message` (same for a non-string `code` or a non-array / malformed `errors`). Our validation factory and Nest's own exceptions always send the right types, so this only matters if code or a library throws malformed `HttpException`s. Tested fix: read each field only if its type is right (`typeof` checks; keep only string items in a `message` array; keep only `{ field?: string, message: string }` items in `errors` via an `isFieldError` type guard); anything else is treated as missing and falls back.

  Verified: `tsc` + `nest build` pass; 27 HTTP cases (isolated Nest app, fake controller) + DI/retry/config checks (fake env and `TokenProvider`), no Dataverse or `.env`.
