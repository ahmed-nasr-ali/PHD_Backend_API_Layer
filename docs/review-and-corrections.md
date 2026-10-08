# Review and Corrections

A review of the architecture notes in [`project-arch.txt`](project-arch.txt) against this project's constraints: NestJS 12, Microsoft Dataverse as the data platform, and a possible future move to PostgreSQL or SQL Server. Corrected explanations are in [`nestjs-crm-architecture-guide.md`](nestjs-crm-architecture-guide.md).

Legend: ❌ Incorrect · ⚠️ Misleading · 🔧 Needs improvement · 💡 Missing consideration · ✅ Correct

---

## Summary

The notes are **sound in direction**. Separating validation kinds, splitting HTTP DTOs from service inputs, keeping the domain ignorant of the CRM, defining repository contracts from application needs, and stating that "each kind of change goes to the place responsible for it" are all correct, and they remain the backbone of the recommended architecture.

The problems are in the **details**: code that doesn't work as written, ORM-centred examples in a project with no ORM, CRM payloads that don't match Dataverse, connection logic duplicated per feature, generic errors, string DI tokens, and several CRM realities (throttling, paging, authorisation, OData injection, data written by other people) that are not mentioned at all.

---

## What the notes get right ✅

| Idea | Section in the notes |
| --- | --- |
| Three kinds of validation; "do I need the database to answer this?" | validation sections |
| A DTO is a dumb container; the service shouldn't know the HTTP DTO | DTO sections |
| Use-case-specific Result, mapped to a response by the controller | dashboard section |
| Changing the frontend shape should only touch the response mapper | "frontend wants `profile`" example |
| No architecture prevents a change to the business concept itself from spreading | "what if User changes?" |
| ORM entity ≠ domain entity; the repository converts between them | ORM section |
| The domain must not know the data comes from a CRM | CRM section 1 |
| CRM payload → CRM mapper → domain model, and CRM complexity stays in infrastructure | CRM sections 4–7 |
| MSAL, tokens and secrets live only in infrastructure | CRM section 8 |
| Treat the CRM as an external system, not a database | CRM section 15 |
| Don't build a full domain layer *just because* there is a CRM | CRM section 12 |
| Contract methods express application needs (`getFromCrm()` is wrong) | migration section |
| Switching data source changes infrastructure, not business logic, but is never free | migration section, final caveat |

---

## Problems found and corrections

### 1. `@Body({ schema })` presented as sufficient ⚠️

- **Original idea:** "Nest can use a Zod schema directly via `StandardSchemaValidationPipe`", with `@Body({ schema: createUserSchema })`.
- **Problem:** in NestJS 12 the `schema` option only attaches metadata. Validation runs only if a `StandardSchemaValidationPipe` is registered globally or on the parameter.
- **Why it matters:** without the pipe, invalid bodies reach the service silently.
- **Correct approach:** use the project's existing `@Body(zodBody(schema))` / `@Query(zodQuery(schema))` / `@Param('id', zodParam(schema))`.
- **Reason:** explicit, cannot be silently disabled, and it gives a consistent error body with a deliberate 422 (body) / 400 (query and params) policy.

### 2. Weak justification for separating the HTTP DTO from the service input ⚠️

- **Original idea:** HTTP validators "might cause issues or carry useless web-related metadata" when the service is called from a CLI or cron job.
- **Problem:** with Zod, the inferred DTO is a plain type with no metadata. The stated reason doesn't hold, which invites the reader to skip the separation.
- **Correct approach:** keep the separation, for the real reasons: dependency direction (`services/` must not import `dto/`), independent evolution of the public API vs internal input, and inputs that combine body + params + authenticated user.
- **Reason:** the separation is right; the argument should be too.

### 3. One mapper class mixing directions 🔧

- **Original idea:** `users/mappers/user.mapper.ts` with `toCreateInput(dto)` and `toResponse(user)`.
- **Problem:** one class mixes HTTP→service-input and domain→HTTP mapping. The field-by-field `toCreateInput` adds ceremony. (A feature-level `mappers/` folder is fine; mixing jobs in one class is not.)
- **Correct approach:** build the Input inline in the controller; `mappers/` holds only response mappers (`CustomerResponseMapper`: Domain → Response DTO); storage mapping is `CustomerTableMapper` (Table ↔ Domain) in `repositories/dataverse/`.
- **Reason:** each mapper does one translation and changes for one reason.

### 4. TypeORM used to teach persistence ❌ (for this project) / ORM-specific concept

- **Original idea:** `UserOrmEntity` with `@Entity()`, `@Column()`, `@InjectRepository()`, `Repository<UserOrmEntity>`; folder file `user.orm-entity.ts`.
- **Problem:** the project has no ORM. Dataverse is reached over a Web API and has no entity classes.
- **Correct approach:** the persistence model for Dataverse is a plain interface describing the JSON (`CustomerTableRow` in `repositories/dataverse/tables/customer.table.ts`). An ORM entity would only appear inside a future `repositories/postgres/` (replacing `tables/customer.table.ts` there) if an ORM is chosen.
- **Reason:** the underlying concept (persistence model ≠ domain model, repository as bridge) is correct and kept; the ORM machinery is not relevant now.

### 5. "CRM DTO" naming ⚠️

- **Original idea:** `CrmUserDto` for the CRM payload.
- **Problem:** "DTO" already means HTTP request/response shapes in the same notes, which recreates the confusion the notes warn about. "Schema" is also taken: it means Zod validation in `dto/`.
- **Correct approach:** per storage technology, `tables/` for what the storage returns and `queries/` for what we ask: `repositories/dataverse/tables/customer.table.ts` exports `CUSTOMER_TABLE` (`'contacts'`) and `CustomerTableRow` (read shape; `OrderTableWriteRow` when writes differ), and `repositories/dataverse/queries/customer.query.ts` exports `CUSTOMER_COLUMNS` (+ `CUSTOMER_EXPAND`). `repositories/postgres/` later uses the same names.
- **Reason:** names should say which boundary a shape belongs to, and each word (`Dto`, `schema`, `table`) should have exactly one meaning.

### 6. Unrealistic CRM payloads and URLs ⚠️

- **Original idea:** `{ "userid": "123", "fullname": …, "units": [ { "unitid": "10" } ] }` and `GET /users/123?$expand=units`.
- **Problem:** Dataverse returns entity-set URLs (`/api/data/v9.2/contacts(<guid>)`), GUID ids, `@odata.etag`, lookups as `_x_value`, choices as integers, and related collections only via navigation-property `$expand`. Also, "users" in Dataverse means `systemusers` (licensed CRM staff), which is usually not your application's end user.
- **Correct approach:** see the realistic `CustomerTableRow` / `OrderTableRow` and table-mappers in guide chapter 10.
- **Reason:** mappers written against fictional payloads fail on real data.

### 7. CRM client and auth duplicated per feature ❌

- **Original idea:** `users/infrastructure/crm/crm.client.ts` and `crm-auth.service.ts`, registered in `UsersModule`.
- **Problem:** every feature would re-implement authentication, token refresh, retry and error normalisation.
- **Correct approach:** the existing `core/dataverse` module provides one `DataverseClient`; feature modules import `DataverseModule` and contain only `repositories/dataverse/` (repository + table + table-mapper).
- **Reason:** connection concerns are shared; translation concerns are per feature.

### 8. Example `CrmClient` returns raw HTTP responses and handles nothing 🔧

- **Original idea:** `return this.http.get('/users/' + id, { headers: { Authorization: 'Bearer ' + token } })`.
- **Problem:** returns an Axios response (not data), hand-builds URLs, has an entity-specific method on a shared client, and has no error handling and no 401 refresh.
- **Correct approach:** the existing `DynamicsWebApiClient` already returns data, normalises errors to `DataverseException` and retries once on 401 with a fresh token.
- **Reason:** the codebase is ahead of the notes here.

### 9. String DI token with interface ⚠️

- **Original idea:** `export interface UserRepository`, `@Inject('UserRepository')`, `provide: 'UserRepository'`.
- **Problem:** string tokens are unchecked, global and typo-prone, and `@Inject` must be repeated at every injection site.
- **Correct approach:** the repository in `repositories/<entity>.repository.ts` is an **abstract class** used as both type and token (`provide: CustomerRepository`), like `TokenProvider` and `DataverseClient` already are.
- **Reason:** compile-time safety and consistency with the codebase.

### 10. Repository receives application Inputs in one place and domain objects in another ❌

- **Original idea:** `usersRepository.create(input)` in one service, `usersRepository.save(user)` in another.
- **Problem:** inconsistent contract; passing `CreateUserInput` makes the repository depend on the application's input shape.
- **Correct approach:** repositories accept and return **domain objects** only (`create(customer: Customer)`).
- **Reason:** the abstract repository speaks the domain language; every implementation maps from the same thing.

### 11. Generic `throw new Error('User not found')` ❌

- **Original idea:** `OrderService.placeOrder` throws `new Error('User not found')` and `new Error('User cannot place order')`.
- **Problem:** both become HTTP 500, and clients can't tell "not found" from "rule violated" from "server bug".
- **Correct approach:** typed errors extending a framework-free `BusinessError` with a `kind` and `code`, mapped to 404/409/422/403 by one global `BusinessErrorFilter`.
- **Reason:** HTTP status is decided at the edge, from business meaning.

### 12. No error flow for infrastructure failures 💡

- **Original idea:** not covered.
- **Problem:** without a policy, `DataverseException` becomes a generic 500, raw CRM messages risk leaking, and expected cases (404, duplicates) aren't distinguished from outages.
- **Correct approach:** repositories translate expected errors (404 → `null`, duplicate key → conflict); a `DataverseExceptionFilter` maps the rest to 502/503 and logs details. Services never catch `DataverseException`.
- **Reason:** each boundary translates errors, just as it translates data.

### 13. Controller returns the domain object directly ❌

- **Original idea:** `getUser(@Param('id') id: string) { return this.getUserService.execute(id); }` in the CRM and migration sections.
- **Problem:** contradicts the notes' own response-mapper advice. It exposes every public field, couples the API to the domain, and getters such as `fullName` are not serialised.
- **Correct approach:** always `return CustomerResponseMapper.toResponse(await service.execute(...))`, with an explicit response type.
- **Reason:** the response shape must be an explicit contract.

### 14. "Make invalid objects impossible via `User.create()`", ignoring existing CRM data 💡

- **Original idea:** put rules in `User.create(...)` so invalid users can't exist, whatever the entry point.
- **Problem:** with a CRM, other people (CRM staff, plugins, other integrations) write data that may violate your rules. If loading a record runs creation rules, reads fail.
- **Correct approach:** `Customer.create()` enforces creation rules for new objects; `Customer.restore()` rebuilds existing objects from storage. Table-mappers decide `null` handling per field explicitly.
- **Reason:** the rule is right for new data; stored data needs a separate, deliberate path.

### 15. Domain model design details 🔧

- **Original idea:** `new User(id, name, email, age)` with positional args, mutable public fields, `id: number | null`, and `age` stored.
- **Problems:** swapped string arguments compile silently; state changes bypass rules; database-generated numeric ids don't match Dataverse GUIDs; age goes stale.
- **Correct approach:** props-object constructor (private) + `create` / `restore`; `readonly` fields; `id: string` generated by the app with `randomUUID()`; store `birthDate` and compute age for a given date.
- **Reason:** app-generated GUIDs also keep ids stable across a future PostgreSQL/SQL Server migration and make a retried create fail with a duplicate key instead of creating a second record.

### 16. "Domain-oriented service" label for services that use repositories ⚠️

- **Original idea:** `UserService`, `OrderService` as domain-oriented services vs `…UseCase` application services.
- **Problem:** in DDD, a domain service holds pure domain logic and does not call repositories. A `UserService` that loads and saves is an application service.
- **Correct approach:** one service class per operation (`services/<verb>-<entity>.service.ts`, `execute(input)`) for orchestration; domain services only for pure multi-object logic.
- **Reason:** precise terms lead to correct placement. One-service-per-operation is also a rule that is easy to apply consistently.

### 17. Sequential remote calls and missing existence check in the dashboard service 🔧

- **Original idea:** `await users.findById(); await orders.findByUserId(); await coupons.findAvailableForUser();`, then return all three.
- **Problem:** with Dataverse, each call is an HTTPS round trip, so latencies add up; a missing user isn't handled.
- **Correct approach:** `Promise.all` for independent calls, then throw `CustomerNotFoundError` if the customer is `null`.
- **Reason:** latency is the dominant cost when the data platform is remote.

### 18. Wrong result handling in the PostgreSQL and Oracle examples ❌

- **Original idea:** `const row = await this.db.query(...); if (!row) return null;` (and the same for Oracle).
- **Problem:** `pg`'s `query()` returns a `QueryResult` object, and `oracledb` returns `{ rows }`. The object is always truthy, so "not found" never returns `null` and the mapper receives the wrong shape.
- **Correct approach:** `const { rows } = await pool.query(...); return rows[0] ? map(rows[0]) : null;` (`recordset[0]` for `mssql`).
- **Reason:** correctness.

### 19. Data-source switch via a factory that calls `new` ❌

- **Original idea:** `useFactory: () => config.dataSource === 'crm' ? new CrmUserRepository(...) : new PostgresUserRepository(...)`.
- **Problem:** constructs dependencies by hand, bypassing DI, and requires both technologies' dependencies to be available.
- **Correct approach:** choose when the module is defined (`CustomersModule.register('dataverse' | 'postgres')`), importing only the selected technology's module and using `useClass`.
- **Reason:** DI stays in charge; unused infrastructure isn't instantiated.

### 20. "Support both data sources by config" without saying when it's justified ⚠️

- **Original idea:** `USER_DATA_SOURCE=crm|postgres`.
- **Problem:** running two stores for the same aggregate means two copies of data that can diverge.
- **Correct approach:** migrate per aggregate (different abstract repositories use different implementations, with no runtime switch). Use a switch only for a short, planned cut-over or for tests.
- **Reason:** the abstraction makes switching *possible*; it doesn't make dual-running *safe*.

### 21. Oracle used as the alternative instead of PostgreSQL / SQL Server 🔧

- **Original idea:** Oracle examples.
- **Correct approach:** the same pattern shown for PostgreSQL and SQL Server, including their real differences: unique-violation codes (`23505` vs `2627`/`2601`), `date` parsing in `pg`, upper-case `uniqueidentifier` in SQL Server, and case-sensitivity of string comparison.
- **Reason:** these are the stated future targets.

### 22. "Database constraints" without a CRM equivalent 💡

- **Original idea:** database constraints are the last line of defence (unique email, int columns).
- **Problem:** Dataverse has no SQL constraints you control; check-then-insert alone races.
- **Correct approach:** Dataverse alternate keys (enforced uniqueness), required levels, column max lengths, plugins. Duplicate-detection rules are advisory only. The repository translates the violation to the same domain error.
- **Reason:** the principle holds; its implementation differs per platform.

### 23. Abstract repository location `domain/repositories/` 🔧

- **Original idea:** repository interface in `domain/repositories/user.repository.ts`.
- **Correct approach:** `repositories/<entity>.repository.ts`, next to its `dataverse/` (and later `postgres/`) implementations (decision documented in guide chapter 9). The contract carries application concerns (pagination cursors, "recent N", read projections), and keeping the abstract class with its implementations makes "how is this entity stored?" answerable in one folder.
- **Reason:** a defensible choice either way; the project needs **one** consistent choice.

### 24. CRM realities not mentioned 💡

| Missing topic | Why it matters | Where covered |
| --- | --- | --- |
| Throttling (429, service-protection limits, one shared application user) | bursts fail; retries needed | guide ch. 2, 11 |
| Pagination: `nextLink`, max 5,000 rows/page, no `$skip` | offset paging can't be implemented; lists silently truncate | guide ch. 9, 10 |
| Authorisation runs as the application user | end-user access checks must be in services | guide ch. 2, 11 |
| OData filter injection | user input in `$filter` strings | guide ch. 10 |
| `$select` explicit columns | performance and coupling | guide ch. 10 |
| Choices, lookups (`_x_value`, `@odata.bind`), read-only columns | correct mapping and writes | guide ch. 10 |
| No multi-request transactions (`$batch` changesets only) | atomic writes across records | guide ch. 2, 10 |
| Optimistic concurrency (ETag / If-Match) | lost updates | guide ch. 10 |
| Logic inside Dataverse (plugins, flows, business rules) | hidden behaviour; migration cost | guide ch. 2, 18 |
| Other writers to the same tables | stored data may violate your rules | guide ch. 7, 10 |
| Data migration, id preservation, sync during migration | a migration is not a DI change | guide ch. 18 |
| Testing strategy (fakes, contract tests) | proves repository implementations are interchangeable | guide ch. 16 |

---

## Observations about the current codebase

These are **proposals only**. No source code was changed.

| # | Observation | Location | Suggested follow-up |
| --- | --- | --- | --- |
| 1 | ✅ Abstract-class DI tokens, MSAL isolated in core, error normalisation with `cause`, retry once on 401 with a forced token refresh, `getOrThrow` config | `src/core/dataverse/` | keep; document as the convention |
| 2 | 💡 `retrieveMultiple` returns `response.value` and drops `oDataNextLink`: lists return at most the first page | `data-access/dynamics-web-api.client.ts` | return `{ items, nextLink }` (or add a paged variant) |
| 3 | 💡 No handling of 429 throttling (`dynamics-web-api` doesn't retry it either) | `policies/dataverse-retry.policy.ts` | bounded retry honouring `Retry-After`, at least for reads |
| 4 | 💡 `DataverseException` keeps HTTP status but not the Dataverse error code | `errors/dataverse.exception.ts` | add `code` so that repositories can recognise duplicate-key and similar errors |
| 5 | ✅ Done: `odataString()` in `data-access/odata.ts`, exported from `core/dataverse` | `data-access/odata.ts` | use it for every string value in a `$filter` |
| 6 | ✅ Done for lists: `DataverseQuery.expand` (nested `DataverseExpand`); single `retrieve` still has none | `data-access/dataverse-query.ts` | add to `retrieve` when first needed; no `top` with a nested one-to-many expand |
| 7 | ✅ Done: global exception filters (business, Dataverse, HTTP/validation, catch-all) + `ResponseInterceptor`, one response envelope for every response | `src/core/http/` (`HttpModule`, imported by `AppModule`) | see guide ch. 12 |
| 8 | ⚠️ Jest + ESM: NestJS 12 packages are ESM-only, and the current ts-jest (CommonJS) setup fails on any test importing `@nestjs/common` ("Must use import to load ES Module") | `jest.config.ts`, `tsconfig.json` | run Jest with `--experimental-vm-modules`, and add `"rootDir": "./"` to `tsconfig.json` (TypeScript 6 fails every suite with TS5011 without it); both verified in a scratch copy, not applied yet |
| 9 | ⚠️ Zod-inferred types used in decorated parameters must be imported with `import type` (TS1272 under `isolatedModules` + `emitDecoratorMetadata`) | `tsconfig.json` | convention, documented in the skills |
