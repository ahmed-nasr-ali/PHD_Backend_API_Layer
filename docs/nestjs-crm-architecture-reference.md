# NestJS + Dataverse Architecture Reference

One-page rules for this codebase. The reasoning behind each rule is in [`nestjs-crm-architecture-guide.md`](nestjs-crm-architecture-guide.md). Folder trees for every case: [`structure.md`](structure.md). Diagrams: [`flow.md`](flow.md).

**Stack:** NestJS 12 · Zod 4 · Microsoft Dataverse Web API (OData v4) via `dynamics-web-api` · MSAL client credentials (`@azure/msal-node`). Possible future stack: PostgreSQL or SQL Server.

---

## 1. Folders and dependency direction

```text
controllers/ ──► services/ ──► domain/
                     │
                     ▼
     repositories/<entity>.repository.ts   (abstract)
                     ▲
     repositories/dataverse/               (implements it)
```

| Folder | Layer | Contains | Must never import |
| --- | --- | --- | --- |
| `controllers/` | presentation | endpoints; build the service Input; call one service | `repositories/`, `core/dataverse` |
| `dto/` | presentation | Zod request schemas + inferred `…Dto` types; response DTO types | `services/`, `repositories/` |
| `mappers/` | presentation | Domain → Response DTO | `repositories/`, `core/dataverse` |
| `services/` | application | one class per operation (`*.service.ts`) + its Input type (`*.input.ts`) | `controllers/`, `dto/`, `mappers/`, `repositories/dataverse/`, `core/dataverse` |
| `domain/` | domain | models, rules, domain errors | `@nestjs/*`, `zod`, `core/dataverse`, other folders |
| `repositories/<entity>.repository.ts` | port | abstract class in domain terms | anything except `domain/` |
| `repositories/dataverse/` | infrastructure | Dataverse repository, table, table-mapper | `controllers/`, `dto/`, `mappers/`, `services/` |
| `core/` | technical | Dataverse connection, validation pipes, error base + filters | `modules/*` |

---

## 2. Folder structure

```text
src/
├── app.module.ts                         ConfigModule, HttpModule, feature modules
├── core/
│   ├── dataverse/                        connection only: MSAL, DataverseClient, retry, DataverseException
│   ├── validation/                       zodBody (422) / zodQuery / zodParam (400)
│   ├── errors/                           BusinessError + BusinessErrorKind + ErrorCode (framework-free)
│   └── http/                             response envelope, 4 global exception filters, ResponseInterceptor, HttpModule
└── modules/customers/
    ├── customers.module.ts
    ├── controllers/customers.controller.ts
    ├── dto/                              create-customer.dto.ts, customer-id.dto.ts, customer-response.dto.ts
    ├── mappers/                          customer-response.mapper.ts
    ├── services/                         create-customer.service.ts + create-customer.input.ts, get-customer.service.ts, ...
    ├── domain/                           customer.ts, customer.errors.ts
    └── repositories/
        ├── customer.repository.ts        abstract class
        └── dataverse/                    dataverse-customer.repository.ts, customer.table.ts, customer.table-mapper.ts
```

Features without business rules may omit `domain/`.

---

## 3. Naming

| Thing | File | Exported names |
| --- | --- | --- |
| Domain model | `domain/<entity>.ts` | `Customer` |
| Domain errors | `domain/<entity>.errors.ts` | `EmailAlreadyInUseError extends BusinessError` |
| Service | `services/<verb>-<entity>.service.ts` | `CreateCustomerService` (`execute(input)`) |
| Service input | `services/<verb>-<entity>.input.ts` (next to its service) | `CreateCustomerInput` |
| Request DTO | `dto/<verb>-<entity>.dto.ts` | `createCustomerSchema`, `CreateCustomerDto` |
| Param DTO | `dto/<entity>-id.dto.ts` | `customerIdSchema` |
| Response DTO | `dto/<entity>-response.dto.ts` | `CustomerResponseDto` |
| Response mapper | `mappers/<entity>-response.mapper.ts` | `CustomerResponseMapper` |
| Repository (abstract) | `repositories/<entity>.repository.ts` | `CustomerRepository` |
| Repository (Dataverse) | `repositories/dataverse/dataverse-<entity>.repository.ts` | `DataverseCustomerRepository` |
| Table | `repositories/dataverse/<entity>.table.ts` | `CUSTOMER_TABLE`, `CustomerTableRow`, `CUSTOMER_TABLE_COLUMNS` (+ `OrderTableWriteRow` when writes differ) |
| Table mapper | `repositories/dataverse/<entity>.table-mapper.ts` | `CustomerTableMapper` (`toDomain`, `toTableRow`) |
| PostgreSQL later | `repositories/postgres/…` | same file names; `PostgresCustomerRepository` |

| Word | Means only |
| --- | --- |
| `schema` | Zod validation (in `dto/`) |
| `Dto` | HTTP request/response shapes |
| `table` | the storage table |
| `TableMapper` / `ResponseMapper` | Table ↔ Domain / Domain → Response DTO |

---

## 4. Data shapes and mapping

```text
HTTP JSON ─zodBody─► CreateCustomerDto ─controller─► CreateCustomerInput ─service─► Customer (domain)
                                                                                       │
                       CustomerTableMapper.toTableRow ◄────── repository ◄─────────────┘
                                   │
                                   ▼
                       Dataverse JSON (CustomerTableRow)
                                   │
                       CustomerTableMapper.toDomain ──► Customer ──► CustomerResponseMapper ──► CustomerResponseDto
```

| Mapper | Direction | Folder |
| --- | --- | --- |
| controller (inline) | request DTO + params + user → Input | `controllers/` |
| `<Entity>ResponseMapper` | domain / Result → response DTO | `mappers/` |
| `<Entity>TableMapper` | Dataverse table row ↔ domain | `repositories/dataverse/` |
| `<Entity>TableMapper` (later) | SQL table row ↔ domain | `repositories/postgres/` |

Domain objects are never returned from controllers. Table rows never leave `repositories/<tech>/`.

---

## 5. Dependency injection

```ts
// repositories/customer.repository.ts: abstract class = DI token
export abstract class CustomerRepository {
  abstract findById(id: string): Promise<Customer | null>;
}

// customers.module.ts
@Module({
  imports: [DataverseModule],
  providers: [
    CreateCustomerService,
    { provide: CustomerRepository, useClass: DataverseCustomerRepository },
  ],
  exports: [CustomerRepository], // export the abstract class, never the implementation
})
export class CustomersModule {}

// services/*.service.ts: no @Inject needed
constructor(private readonly customers: CustomerRepository) {}
```

- No string tokens. No `new Repository(...)` in factories.
- Cross-feature use: import the feature module and inject its exported abstract repository. No circular module imports. A service never calls another service.

---

## 6. Request flow

```text
POST /customers
  zodBody(createCustomerSchema) → CustomersController → CreateCustomerService
      → Customer.create() (rules) → CustomerRepository.findByEmail → create
          → DataverseCustomerRepository → DataverseClient (MSAL token, 401 retry) → Dataverse Web API
          ← CustomerTableRow → CustomerTableMapper.toDomain → Customer
  ← Customer → CustomerResponseMapper → CustomerResponseDto → 201 JSON
```

---

## 7. Validation placement

| Question | Place |
| --- | --- |
| Is the request well-formed? (types, formats, lengths, ranges) | Zod schema in `dto/` + `zodBody` / `zodQuery` / `zodParam` |
| Is it intrinsically valid for the business? (adult, total > 0) | `domain/` model (`create()` / methods) |
| Does it need stored data? (unique, exists, belongs to caller, state allows) | `services/` via repositories |
| Guarantee under concurrency | Dataverse alternate key / SQL `UNIQUE`, translated by the repository |

Zod notes: use `z.guid()` for Dataverse ids; mirror Dataverse column max lengths; use `z.coerce.*` for query strings; `import type` Zod-inferred types used in decorated parameters (TS1272 under `isolatedModules` + `emitDecoratorMetadata`).

---

## 8. Error flow

| Source | Raised as | Translated by | HTTP | `code` |
| --- | --- | --- | --- | --- |
| invalid request | `ValidationFailedError` → `HttpException` | validation pipe → `HttpExceptionFilter` | 422 body / 400 query & params | `VALIDATION_FAILED` (+ `errors`) |
| business rule | `BusinessError` (`RuleViolation`) | `BusinessErrorFilter` | 422 | the error's code |
| missing aggregate | `BusinessError` (`NotFound`) | `BusinessErrorFilter` | 404 | the error's code |
| uniqueness / state conflict | `BusinessError` (`Conflict`) | `BusinessErrorFilter` | 409 | the error's code |
| authorisation | `BusinessError` (`Forbidden`) | `BusinessErrorFilter` | 403 | the error's code |
| Dataverse 404 on single read | — | repository → `null` | (service decides) | |
| Dataverse duplicate key | `DataverseException` | repository → `BusinessError` (`Conflict`) | 409 | the error's code |
| Dataverse 429 / 503 | `DataverseException` | `DataverseExceptionFilter` | 503 | `UPSTREAM_UNAVAILABLE` |
| other Dataverse failure | `DataverseException` | `DataverseExceptionFilter` (logs details) | 502 | `UPSTREAM_UNAVAILABLE` |
| other Nest `HttpException` (unknown route, …) | `HttpException` | `HttpExceptionFilter` | its status | status name (`NOT_FOUND`) |
| anything else | `Error` | `UnhandledExceptionFilter` (logs details) | 500 | `INTERNAL_ERROR` |

Every response uses one envelope (`src/core/http/api-response.ts`):

```jsonc
{ "success": true,  "statusCode": 200, "message": "OK", "data": { /* response DTO */ } }
{ "success": false, "statusCode": 404, "code": "CUSTOMER_NOT_FOUND", "message": "…", "data": null, "errors": [ /* optional */ ] }
```

Controllers return response DTOs; `ResponseInterceptor` wraps them. The filters live in `core/http/filters/` and are registered by `HttpModule` (catch-all first: Nest tries global filters in reverse order).

The HTTP column is decided **only** by the filters. Domain and services throw `kind` + `code`; another caller (CLI, queue consumer) catches the same `BusinessError` and maps `kind` its own way (e.g. print message, exit 1).

Never: `throw new Error('not found')`; `HttpException` in domain/services; HTTP status codes in domain/service code or comments; `catch (DataverseException)` in services; Dataverse messages in API responses.

---

## 9. Dataverse repository checklist

- [ ] Uses the shared `DataverseClient` (never `DynamicsWebApi`, `axios` or MSAL directly)
- [ ] Table name, row type and column list live in `<entity>.table.ts`; `$select` always uses the column list
- [ ] String filter values escaped with `odataString()`; GUIDs validated before interpolation
- [ ] `null` handling decided per column (nullable in domain / documented default / fail loudly)
- [ ] Choice integers and `statecode` mapped to domain values in the table-mapper; unknown values fail loudly
- [ ] Lookups read as `_x_value`, written as `NavProp@odata.bind: "/entityset(guid)"`
- [ ] Read-only/computed columns (`fullname`, `createdon`) never written
- [ ] Client-generated GUID sent as the primary key on create
- [ ] 404 → `null`; expected conflicts → `BusinessError`; everything else rethrown
- [ ] Lists return a cursor (`nextLink`), never offset pages
- [ ] Independent calls in services run with `Promise.all`
- [ ] End-user authorisation checked in the service (Dataverse only sees the application user)

---

## 10. Migration summary (Dataverse → PostgreSQL / SQL Server)

| Unchanged | Replaced / added | Removed |
| --- | --- | --- |
| `domain/`, `services/`, `controllers/`, `dto/`, `mappers/`, abstract repositories, `BusinessErrorFilter`, domain & service tests, contract tests | `repositories/postgres/` (repository + table + table-mapper, same file names), DB connection module, schema migrations, DB error filter, one `useClass` line per repository | `repositories/dataverse/` of migrated features; finally `core/dataverse`, `DataverseExceptionFilter`, `DV_*` config |

Not covered by the abstraction (plan explicitly): data migration and/or sync, logic living in Dataverse (plugins, flows, business rules, rollups), Dataverse security model → app authorisation, other CRM consumers, transaction and paging semantics, case-sensitivity and date handling, GUID casing (SQL Server returns upper case).

---

## 11. Change-impact table

| Change | Edit only |
| --- | --- |
| Dataverse column renamed | `<entity>.table.ts` + `<entity>.table-mapper.ts` |
| Dataverse auth / URL / retry | `core/dataverse` |
| Frontend wants a new response shape | `dto/<entity>-response.dto.ts` + `mappers/<entity>-response.mapper.ts` |
| Request shape changes | `dto/<verb>-<entity>.dto.ts` + controller input building |
| Business rule changes | `domain/` or `services/` |
| Storage technology changes | new `repositories/<tech>/` + module provider line + data migration |
