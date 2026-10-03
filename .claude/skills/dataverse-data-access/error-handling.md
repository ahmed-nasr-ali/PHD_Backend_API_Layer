# Dataverse Error Handling

## What arrives

`DynamicsWebApiClient` normalises every failure into `DataverseException { message, status?, cause }`. MSAL failures also arrive as `DataverseException` (no status). A 401 has already been retried once with a fresh token.

| Status | Typical meaning | Handling |
| --- | --- | --- |
| 404 | record not found | repository returns `null` (single lookups) |
| 400 | malformed request (bad column, bad filter, value too long) or a plugin rejected the operation | usually our bug → rethrow (502). If a known plugin enforces a known rule, translate to an `ApplicationError`. |
| 401 | token invalid after retry | rethrow (502); configuration problem |
| 403 | the application user lacks a privilege | rethrow (502); security-role configuration |
| 412 | precondition failed (ETag mismatch on `If-Match`; also some duplicate-key cases) | concurrency → `ApplicationError` `conflict`; confirm the code in your environment |
| 429 | throttled | rethrow → filter returns 503 |
| 5xx | Dataverse problem | rethrow → 502/503 |

## Rules

1. **Repositories translate only expected errors with business meaning:**
   - 404 on `retrieve` → `null`
   - duplicate alternate key on create → e.g. `EmailAlreadyInUseError` (`conflict`)
   - ETag mismatch → a `conflict` error
2. **Everything else is rethrown unchanged.** The global `DataverseExceptionFilter` logs it and returns 502 (or 503 for 429/503) without exposing Dataverse text.
3. **Services never catch `DataverseException`.**
4. **Mapping failures** (missing required column, unknown choice) throw `DataverseException` with a clear message. They are data-quality problems in the CRM.

## Duplicate-key translation

Reliable translation needs the Dataverse **error code**, not just the HTTP status. `DataverseException` currently keeps only `status`. Before relying on duplicate-key translation, extend it with `code` (from the library's `RequestError`) and match on the specific code observed in your environment. Until then, the service's `findByEmail` check gives the friendly 409 in the common case, and a racing duplicate surfaces as 502.

## Pattern

```ts
async findById(id: string): Promise<Customer | null> {
  try {
    const row = await this.dataverse.retrieve<CustomerTableRow>(CUSTOMER_TABLE, id, CUSTOMER_TABLE_COLUMNS);
    return CustomerTableMapper.toDomain(row);
  } catch (error) {
    if (error instanceof DataverseException && error.status === 404) {
      return null;
    }
    throw error;
  }
}
```

Filters and the `ApplicationError` base class: see `nestjs-feature-architecture` → `error-handling.md`.
