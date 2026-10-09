# NestJS + Dataverse (CRM) Architecture Guide

> A corrected and reorganised version of the notes in [`project-arch.txt`](project-arch.txt).
> It explains each idea from the notes, says where the notes are right or wrong, and shows how each idea applies to **this** project: a NestJS 12 backend whose data platform is **Microsoft Dataverse (Dynamics 365 CRM)**, which might later move to PostgreSQL or SQL Server.

Companion documents:

- [`nestjs-crm-architecture-reference.md`](nestjs-crm-architecture-reference.md): one-page rules, folder structure and flows.
- [`review-and-corrections.md`](review-and-corrections.md): every problem found in the original notes.
- [`.claude/skills/`](../.claude/skills/): the same knowledge as reusable skills for AI coding agents.

---

## 0. How to read this guide

### What already exists in the codebase

The guide builds on code that is already in the repository rather than inventing parallel infrastructure:

| Existing code | What it does |
| --- | --- |
| [`src/core/dataverse/`](../src/core/dataverse/) | Connection to Dataverse: MSAL client-credentials auth (`TokenProvider` / `MsalTokenProvider`), a generic `DataverseClient` (abstract class) implemented with the `dynamics-web-api` library, a retry-on-401 policy and `DataverseException`. |
| [`src/core/validation/`](../src/core/validation/) | Zod-based request validation: `zodBody(schema)` (422 on failure), `zodQuery(schema)` and `zodParam(schema)` (400 on failure). |
| [`src/core/errors/`](../src/core/errors/) | Framework-free `BusinessError` base class + `BusinessErrorKind` enum for errors the business layers raise on purpose, and the `ErrorCode` enum of codes the system itself returns. |
| [`src/core/http/`](../src/core/http/) | One response envelope for every response: global exception filters (business, Dataverse, HTTP/validation, catch-all) and a `ResponseInterceptor` for successes, registered by `HttpModule` (chapter 12). |

The CRM is therefore concrete: **Dataverse Web API (OData v4) authenticated with Microsoft Entra ID through MSAL**. The guide uses that technology. It does not use a generic "CRM".

### The running example

Every chapter uses the same small domain so that the examples stay consistent:

| Concept | Domain model | Dataverse table (placeholder names) |
| --- | --- | --- |
| Customer | `Customer` | standard `contacts` table (`contactid`, `firstname`, `lastname`, `fullname`, `emailaddress1`, `birthdate`, `statecode`) |
| Order | `Order` | custom `new_orders` table (`new_orderid`, `new_status` choice, `new_total` currency, lookup `new_CustomerId` → contact) |

`new_` is a placeholder publisher prefix. Use the real schema names from your Dataverse solution.

Business rules used throughout:

1. A customer must be at least 18 years old to be created.
2. A customer's email must be unique.
3. Only an active, adult customer may place an order.
4. An order total must be greater than zero.

All TypeScript in this guide was type-checked against this repository's `node_modules` and `tsconfig.json` (NestJS 12, Zod 4, TypeScript 6). The PostgreSQL and SQL Server snippets are the exception, because `pg` and `mssql` are not installed.

### Naming used in this project

The guide uses architecture terms (layer, use case, port). In the code, they map to these folders and names:

| Architecture term | Folder / file in this project | Example |
| --- | --- | --- |
| Presentation layer | `controllers/`, `dto/`, `mappers/` | `CustomersController`, `CreateCustomerDto`, `CustomerResponseMapper` |
| Use case (application layer) | `services/<verb>-<entity>.service.ts`, one class per operation | `CreateCustomerService` |
| Domain layer | `domain/` | `Customer`, `CustomerNotFoundError` |
| Port (repository contract) | `repositories/<entity>.repository.ts` (abstract class) | `CustomerRepository` |
| Infrastructure / adapter | `repositories/dataverse/` (later `repositories/postgres/`) | `DataverseCustomerRepository` |
| Persistence model | `repositories/dataverse/tables/<entity>.table.ts` | `CUSTOMER_TABLE`, `CustomerTableRow` |
| Persistence mapper | `repositories/dataverse/mappers/<entity>.table-mapper.ts` | `CustomerTableMapper` |

The word **schema** is reserved for Zod validation in `dto/`; Dataverse table shapes are called **table**. The full folder trees are in [`structure.md`](structure.md).

### Learning path

```text
Part I   Foundations        1 Layers & dependency direction   2 CRM is not a database
Part II  The inbound edge   3 Validation   4 DTOs, inputs, results   5 Controllers & response mapping
Part III The core           6 Domain vs persistence models   7 Business rules   8 Services (use cases)
Part IV  The outbound edge  9 Abstract repository   10 Dataverse repository   11 Auth & the Dataverse client
                            12 Error handling   13 Module wiring
Part V   Putting it together 14 Folder structure   15 End-to-end flows   16 Testing
Part VI  The future         17 PostgreSQL / SQL Server repositories   18 Migration scenario
                            19 Change-impact table   20 Final mental model
```

### Where each section of the original notes is covered

| Original section | Chapter |
| --- | --- |
| "Controller → validation DTO → Service → Response DTO" | 1, 5 |
| Kinds of validation; validation that needs the database | 3 |
| What is a DTO; why architects separate them; DTO vs Input | 4 |
| Folder structure #1 (`users/…`, `mappers/`, `user.orm-entity.ts`) | 14 |
| Full `POST /users` example | 4, 5, 15 |
| Where business validation goes (`User.create`) | 7 |
| ORM entity vs domain entity; repository as bridge; two meanings of "Entity" | 6, 9 |
| Service with User + Orders + Coupons; domain vs application services; dashboard result | 8, 5 |
| CRM section: domain doesn't know CRM, contract, CRM DTO, mapper, `$expand`, MSAL, module wiring, folder structure #2, response mapper, change table | 2, 9, 10, 11, 13, 14, 19 |
| Moving to PostgreSQL / Oracle; dual data sources; contract design | 17, 18 |

Each chapter ends with a **Review of the original** box using these marks: ✅ correct · ⚠️ misleading · ❌ incorrect · 🔧 needs improvement · 💡 missing consideration.

---

# Part I: Foundations

## 1. Layers and dependency direction

### Core concept

The application is split by **responsibility**, and dependencies always point **inward**, toward business logic:

```text
            ┌───────────────────────────────────────────────┐
HTTP  ───►  │ Presentation   controllers/, dto/, mappers/   │
            ├───────────────────────────────────────────────┤
            │ Application    services/ (one per operation)  │
            │                abstract repositories          │
            ├───────────────────────────────────────────────┤
            │ Domain         domain/: models + rules        │
            └───────────────────────────────────────────────┘
                              ▲  implements the abstract repository
            ┌───────────────────────────────────────────────┐
            │ Infrastructure repositories/dataverse/:       │ ───►  Dataverse Web API
            │                repository + table + mapper    │
            └───────────────────────────────────────────────┘
```

| Layer | Folders | Knows about | Must not know about |
| --- | --- | --- | --- |
| Domain | `domain/` | business concepts and rules | NestJS, HTTP, Zod, Dataverse, SQL |
| Application | `services/`, abstract repositories | domain, abstract repositories, service inputs/results | HTTP shapes, Dataverse column names, MSAL |
| Presentation | `controllers/`, `dto/`, `mappers/` | HTTP, Zod schemas, services | Dataverse, repositories |
| Infrastructure | `repositories/dataverse/` | Dataverse/SQL, its own table shapes, the abstract repository it implements | controllers, HTTP |

### Why it exists

Each kind of change should have exactly **one place** to happen. A renamed CRM column should not ripple into controllers. A new JSON shape for the frontend should not ripple into business rules.

### Mental model

```text
Domain                       → the business rules            ("what is allowed")
Service (use case)           → the script for one operation  ("do these steps, in this order")
Abstract repository (port)   → a job description             ("I need someone who can find customers")
repositories/dataverse/      → a translator that speaks Dataverse/OData
repositories/postgres/       → another translator that speaks SQL
Controller                   → the receptionist who speaks HTTP
```

### The pipeline from the original notes, corrected

The notes open with `Controller -> validation DTO -> Service -> Response DTO`. That is correct for a simple app, but it hides the outbound side, which is where a CRM integration does most of its work. The full pipeline is:

```text
HTTP request
  → validation pipe (Zod schema in dto/)        controllers/ + dto/
  → Controller builds Input                     controllers/
  → Service                                     services/
      → Domain model / rules                    domain/
      → Abstract repository                     repositories/<entity>.repository.ts
          → Dataverse repository                repositories/dataverse/
              → DataverseClient → Dataverse Web API
          ← table row → table-mapper → Domain model
  ← Result (domain objects)
  → Response mapper → Response DTO → JSON       mappers/ + dto/
```

### What NOT to layer

Layers are a tool, not a goal. Do **not** add:

- a `domain/` folder for a feature that is only a pass-through proxy over Dataverse with no rules (for example, a lookup list of countries). A service plus a repository is enough.
- one interface per class "for testability". Abstract only at the boundary where you actually expect a second implementation or need a fake: the abstract repository.
- a generic `BaseRepository<T>`. Each abstract repository expresses what one feature needs (see chapter 9).

> **Review of the original.** ✅ The layer idea and the "dependencies point inward" spirit are correct. 🔧 The opening pipeline omits the outbound side (repository → adapter → CRM), which is where CRM-specific complexity lives. 💡 The notes never say when *not* to add a layer. Recommendation #12 in the notes ("don't build a full domain layer just because you use a CRM") is right and is reinforced here.

---

## 2. CRM is not a database

### Core concept

The notes say "consider the CRM an external system, not a database" (section 15). That is the single most important idea in the material, and it is correct. This chapter makes it precise.

| Term | What it is in this project |
| --- | --- |
| **Database** | Dataverse stores data in Azure SQL internally, but you **cannot** connect to it. A read-only TDS (SQL) endpoint exists for reporting; it is not a data-access layer for an application. |
| **CRM platform** | Dynamics 365 / Dataverse: tables, relationships, security roles, business rules, plugins, workflows/Power Automate flows, auditing, duplicate detection and model-driven apps used by CRM staff. |
| **CRM API** | Dataverse Web API: REST + OData v4 at `https://<org>.crm.dynamics.com/api/data/v9.2/`. |
| **CRM SDK / client library** | `dynamics-web-api`, a community-maintained JavaScript client for the Web API, wrapped by `DynamicsWebApiClient`. |
| **CRM authentication** | Microsoft Entra ID (Azure AD) OAuth 2.0 **client credentials** via `@azure/msal-node`. The app authenticates as an **application user** that has a Dataverse security role. |
| **CRM data model** | Tables with logical names (`contact`) and entity-set names (`contacts`), columns (`emailaddress1`), choices (option sets stored as integers), lookups (`_parentcustomerid_value`), navigation properties (`new_CustomerId`), `statecode` / `statuscode`. |
| **Application data-access layer** | Ours: `core/dataverse` (connection concerns) plus each feature's `repositories/dataverse/` repository, table and table-mapper (translation concerns). |

```text
Service ─► CustomerRepository (abstract)
                 │
                 ▼
         DataverseCustomerRepository ── CustomerTableMapper ── CustomerTableRow
                 │
                 ▼
         DataverseClient  (core/dataverse: auth, retry, errors)
                 │  HTTPS + OAuth bearer token (MSAL)
                 ▼
         Dataverse Web API ─► platform logic (plugins, business rules, security) ─► Azure SQL (hidden)
```

### What changes compared with talking to PostgreSQL directly

| Concern | PostgreSQL / SQL Server | Dataverse |
| --- | --- | --- |
| Call cost | local network, ~1 ms, connection pool | HTTPS round trip, often 50–300 ms or more. **Parallelise independent calls.** |
| Authentication | DB user/password once per connection | OAuth token per request, refreshed on expiry (already handled: `onTokenRefresh` + retry on 401) |
| Authorisation | you implement it | Dataverse security roles apply to the **application user**, not to your end user. End-user authorisation ("this customer belongs to this tenant") must be enforced in the application, unless you deliberately use impersonation. |
| Failures | rare, mostly constraint violations | network errors, timeouts, 401, 403 (missing privilege), 404, **429 throttling**, 5xx, and errors thrown by CRM plugins |
| Rate limits | none (only capacity) | service-protection limits per user over a sliding window (request count, execution time, concurrency). **All your traffic runs as one application user**, so it all counts against one budget. |
| Transactions | `BEGIN … COMMIT` across many statements | each request is its own transaction. Atomic multi-operation writes require an OData `$batch` changeset. |
| Querying | full SQL, joins, aggregates | OData `$select`, `$filter`, `$orderby`, `$top`, `$expand`; FetchXML for complex queries. No arbitrary joins and **no `$skip`**. |
| Pagination | `LIMIT/OFFSET` or keyset | server-driven paging: `@odata.nextLink` (an opaque cursor), max 5,000 rows per page |
| Uniqueness | `UNIQUE` constraint | **alternate keys** (enforced) or duplicate-detection rules (advisory, per request) |
| Identifiers | whatever you choose | GUIDs. You **may** supply the GUID yourself on create. |
| Data shape | your schema | CRM schema: odd names (`emailaddress1`), integers for choices, `_x_value` lookups, computed read-only columns (`fullname`), nullable everything |
| Who else writes | usually only your app | CRM users, plugins, flows and other integrations write to the same tables. **Your rules are not the only rules, and your data may violate them.** |
| Consistency | strong | strong for direct reads after writes; data derived by **asynchronous** plugins/flows is eventually consistent |

### Consequences for the architecture

1. **Remote calls belong in one place.** Only repositories in `repositories/dataverse/` call `DataverseClient`, never services or controllers.
2. **Translation belongs in one place.** Only `<entity>.table.ts` and `<entity>.table-mapper.ts` know `emailaddress1` and `100000001`.
3. **Latency is a design input.** Services call independent repositories with `Promise.all`; abstract repositories offer methods that fetch what a screen needs in one round trip (see `$expand`, chapter 10).
4. **Errors are richer.** Repositories translate expected errors (404 becomes `null`, duplicate key becomes a domain conflict); a global filter maps unexpected Dataverse failures to 502/503 (chapter 12).
5. **Do not trust stored data blindly.** Table-mappers must handle `null` columns and unknown choice values explicitly (chapter 10).

> **Review of the original.** ✅ "CRM is an external system, not a database" and "the domain doesn't know the data came from CRM" are correct and central. 💡 Missing: rate limits, single-application-user authorisation, no multi-request transactions, paging without `$skip`, alternate keys, other writers (CRM users, plugins), and latency. ⚠️ The notes' sample CRM JSON (`userid`, `units` nested inline) is not what Dataverse returns. Real payloads are shown in chapter 10.

---

# Part II: The inbound edge

## 3. Validation: three kinds, three places

### Core concept

The notes identify three kinds of validation. The classification is correct:

| Kind | Question it answers | Needs stored data? | Where |
| --- | --- | --- | --- |
| **Request (input) validation** | Is the request well-formed? (`email` is an email, `birthDate` is a date, `total` > 0) | No | Zod schema in `dto/` + `zodBody` / `zodQuery` / `zodParam` pipe |
| **Business / domain validation** | Is this allowed by the business? (customer must be adult, email unique, customer must be active to order) | Sometimes | `domain/` model (rules on the data itself) or service (rules that need lookups) |
| **Storage constraints** | Last line of defence if everything above is bypassed or races | — | Dataverse: required columns, max lengths, **alternate keys**, plugins. PostgreSQL / SQL Server: `NOT NULL`, `UNIQUE`, `CHECK`, foreign keys. |

### The decision rule

The notes' rule is correct, and it is the most useful sentence in the section:

> **"Do I need stored data to answer this?"** No: request schema. Yes: service / domain, backed by a storage constraint where possible.

| Rule | Kind | Where |
| --- | --- | --- |
| `email` is a valid email | request | Zod |
| `birthDate` is an ISO date | request | Zod |
| customer is ≥ 18 | business (pure) | `Customer.create()` |
| email not already used | business (needs storage) | `CreateCustomerService` + alternate key on `emailaddress1` |
| `customerId` exists | business (needs storage) | service (`findById` → `CustomerNotFoundError`) |
| customer belongs to the caller's tenant | authorisation (needs storage) | service. Dataverse won't do it for you (chapter 2). |
| order is in a state that allows cancelling | business (pure, on loaded data) | `Order` method |

### Why "check then insert" is not enough

```ts
const existing = await this.customers.findByEmail(customer.email);
if (existing) throw new EmailAlreadyInUseError(customer.email);
await this.customers.create(customer);
```

Two concurrent requests can both pass the check. The check gives a **friendly error** in the common case. Only a **storage constraint** guarantees uniqueness:

- **Dataverse:** define an *alternate key* on `contact.emailaddress1`. Duplicate-detection rules are not a guarantee, because they only run when the request asks for them. Note that an alternate key also blocks duplicates created by CRM users, which may or may not be what the business wants.
- **PostgreSQL / SQL Server:** a `UNIQUE` constraint/index on `email`.

The repository translates the constraint violation into the same `EmailAlreadyInUseError` (chapters 12 and 17).

### Request validation in this project

The project already provides pipes in [`src/core/validation/presets/zod.presets.ts`](../src/core/validation/presets/zod.presets.ts):

```ts
// dto/create-customer.dto.ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1).max(50), // mirror the Dataverse column max length
  lastName: z.string().trim().min(1).max(50),
  email: z.email().max(100),
  birthDate: z.iso.date(),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
```

```ts
// dto/customer-id.dto.ts
import { z } from 'zod';

/** Dataverse ids are GUIDs; z.guid() accepts any 8-4-4-4-12 hex id, z.uuid() is stricter. */
export const customerIdSchema = z.guid();
```

```ts
@Post()
async create(@Body(zodBody(createCustomerSchema)) dto: CreateCustomerDto) { … }

@Get(':id')
async findOne(@Param('id', zodParam(customerIdSchema)) id: string) { … }
```

`zodQuery(schema)` validates query strings the same way (400). A failure returns the error envelope (chapter 12) with `code: "VALIDATION_FAILED"` and one `errors` entry per issue; `field` is the dotted path, or the param name / source (`id`, `body`) for a root-level issue:

```json
{ "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [{ "field": "email", "message": "Invalid email address" }] }
```

Details that matter:

- **Mirror CRM column limits in the schema** (`max(50)`, `max(100)`, set to your real column lengths). Otherwise an over-long value travels all the way to Dataverse and comes back as an opaque 400 that surfaces as a 502.
- **Zod 4 syntax:** `z.email()`, `z.iso.date()`, `z.guid()` are top-level in Zod 4 (the notes' `z.email()` is correct for Zod 4).
- **Use `z.guid()` for Dataverse ids**, not `z.uuid()`. `z.uuid()` enforces RFC variant bits, and you should not assume every Dataverse key satisfies them.
- **Query strings are strings:** use `z.coerce.number()` for numeric query params.
- **`import type` for inferred types in decorated parameters.** This repo compiles with `isolatedModules` + `emitDecoratorMetadata`, so `import { CreateCustomerDto }` used in a decorated parameter fails with TS1272. Use `import type { CreateCustomerDto } from '../dto/create-customer.dto'`. Since `tsc` reports it, it can't slip through. Don't add a lint auto-fix for type imports: it can't see decorator metadata and may turn DI imports into `import type`, breaking injection.

#### `@Body({ schema })` vs `zodBody(schema)`

The notes say "Nest can use a Zod schema directly via `StandardSchemaValidationPipe`" and use `@Body({ schema: createUserSchema })`. That is **true in NestJS 12 but incomplete**: the `schema` option only attaches metadata. Nothing validates unless a `StandardSchemaValidationPipe` is registered, globally or on the parameter. Without the pipe, invalid bodies pass straight through.

| Approach | Pros | Cons |
| --- | --- | --- |
| `@Body({ schema })` + global `StandardSchemaValidationPipe` | built into Nest; works with any Standard Schema library | silent no-op if the pipe isn't registered; error shape and status are configured globally |
| `@Body(zodBody(schema))` (this project) | explicit; consistent error envelope with `code: "VALIDATION_FAILED"` and `errors: [{ field, message }]`; deliberate 422 for bodies and 400 for params/query; async refinements supported | project-specific helper |

**Use `zodBody` / `zodQuery` / `zodParam`.** They already exist, they encode a deliberate status-code policy, and they cannot be silently disabled.

> **Review of the original.** ✅ The three kinds of validation and the "do I need the database?" rule are correct and valuable. 🔧 "Database constraints" needs a CRM translation: Dataverse has alternate keys, required levels and plugins, not SQL constraints. ⚠️ `@Body({ schema })` is presented as sufficient; it needs a registered pipe. 💡 Missing: the check-then-insert race, mirroring column limits, `z.guid()` for Dataverse ids, and authorisation as a storage-dependent rule.

---

## 4. DTOs, Inputs and Results

### Core concept

The notes' definition is correct: **a DTO is a dumb container for moving data across a boundary**. What matters is *which* boundary, because each boundary has its own reasons to change:

| Shape | Boundary | Defined in | Example |
| --- | --- | --- | --- |
| **Request DTO** | HTTP → app | `dto/create-customer.dto.ts` | `createCustomerSchema` + `CreateCustomerDto` (Zod-inferred) |
| **Input** | caller → service | `services/create-customer.input.ts`, next to its service | `CreateCustomerInput` |
| **Result** | service → caller | the service file (only when it isn't a domain object) | `Customer`, or `CustomerOverview { customer, recentOrders }` |
| **Response DTO** | app → HTTP | `dto/customer-response.dto.ts` | `CustomerResponseDto` |
| **Table row** | Dataverse/DB ↔ repository | `repositories/dataverse/customer.table.ts` | `CustomerTableRow` |

### Why separate the HTTP DTO from the service Input? (corrected reasoning)

The notes justify the split by saying HTTP validators "might cause issues or carry useless metadata" if a CLI or cron job calls the service. That is **weak, and with Zod mostly untrue**: `CreateCustomerDto` is a plain TypeScript type with no decorators and no runtime metadata. The real reasons are these:

1. **Dependency direction.** If a service imports from `dto/`, the application layer depends on the HTTP layer. Arrows must point inward.
2. **Independent evolution.** The HTTP contract is a public API with versioning constraints. The input is internal and can change freely. For example, the frontend sends `birthDate` as `"1990-05-14"` (a string), while the service wants a `Date`.
3. **Inputs combine more than the body.** Real inputs merge body + route params + the authenticated user + tenant. None of these is "the DTO".
4. **Other callers.** A message consumer or a CLI command builds the same `Input` without pretending to be an HTTP request. (This is the notes' argument, and it is valid once restated this way.)

```ts
// services/create-customer.input.ts
export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date; // a real Date, not the HTTP string
}
```

**Put each Input in its own file next to its service** (`services/create-customer.service.ts` + `services/create-customer.input.ts`). The Input belongs to one service, so it stays beside it. The notes' top-level `application/inputs/` folder spreads one operation across two directories for no benefit. The `.input.ts` file is a plain type: no Zod, no NestJS, no imports from `dto/`. A service whose only argument is an id takes `execute(id: string)` and needs no input file.

### When the shapes are identical

If body and input are field-for-field identical, the explicit mapping in the controller is still cheap (a few lines) and is the seam where they will diverge later. A `UserMapper.toCreateInput()` class that copies fields one by one is unnecessary ceremony. Build the input inline in the controller, as in chapter 5.

### Results: what a service returns

The notes are correct: **a service returns a result designed for the operation, not an HTTP shape and not a table row.** Returning domain objects inside the result is fine:

```ts
/** What this service produces: business objects, not an HTTP shape. */
export interface CustomerOverview {
  customer: Customer;
  recentOrders: Order[];
}
```

> **Review of the original.** ✅ The DTO definition, "the service shouldn't know `CreateUserDto`", and use-case-specific results are correct. ⚠️ The "HTTP validators cause issues in a CLI" argument is weak; the real reasons are dependency direction and independent evolution. 🔧 A top-level `inputs/` folder (far from its service) and a mapper class for field copying add ceremony. 💡 Inputs usually combine body, params and the authenticated user.

---

## 5. Controllers and response mapping

### Core concept

A controller is a thin HTTP adapter. It:

1. receives already-validated input (from pipes),
2. builds the service Input (body + params + current user),
3. calls **one** service,
4. maps the result to a Response DTO.

It never calls repositories, never contains business `if`s and never sees Dataverse types.

```ts
// controllers/customers.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { zodBody, zodParam } from '../../../core/validation/presets';
import type { CreateCustomerDto } from '../dto/create-customer.dto';
import { createCustomerSchema } from '../dto/create-customer.dto';
import { customerIdSchema } from '../dto/customer-id.dto';
import { CustomerResponseDto } from '../dto/customer-response.dto';
import { CustomerResponseMapper } from '../mappers/customer-response.mapper';
import { CreateCustomerService } from '../services/create-customer.service';
import { GetCustomerService } from '../services/get-customer.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerService,
    private readonly getCustomer: GetCustomerService,
  ) {}

  @Post()
  async create(
    @Body(zodBody(createCustomerSchema)) dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.createCustomer.execute({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      birthDate: new Date(`${dto.birthDate}T00:00:00Z`),
    });
    return CustomerResponseMapper.toResponse(customer);
  }

  @Get(':id')
  async findOne(
    @Param('id', zodParam(customerIdSchema)) id: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.getCustomer.execute(id);
    return CustomerResponseMapper.toResponse(customer);
  }
}
```

### Response DTO and response mapper

The **response DTO** is the shape of the JSON (a type, no logic). The **response mapper** is the function that builds it from the domain. The DTO is the form; the mapper is who fills it in.

```ts
// dto/customer-response.dto.ts
import { CustomerStatus } from '../domain/enums/customer-status.enum';

/** The JSON shape returned to API clients. Option sets go out as their CRM numbers. */
export interface CustomerResponseDto {
  id: string;
  fullName: string;
  email: string;
  status: CustomerStatus | null;
}
```

```ts
// mappers/customer-response.mapper.ts
import { Customer } from '../domain/models/customer.model';
import { CustomerResponseDto } from '../dto/customer-response.dto';

/** Translates the Customer domain model into the API response. */
export class CustomerResponseMapper {
  static toResponse(customer: Customer): CustomerResponseDto {
    return {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      status: customer.status,
    };
  }
}
```

**Never return a domain object directly** (the notes do this in `getUser(@Param('id') id) { return this.getUserService.execute(id); }`). Serialising a class instance exposes every public field, adding a field to the domain silently changes the public API, and getters such as `fullName` are **not** serialised by `JSON.stringify`.

**The response DTO is the `data` of the envelope.** The global `ResponseInterceptor` (`src/core/http/`) wraps whatever the controller returns, so `findOne` above produces `{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "…", "fullName": "…", … } }`. Controllers return the response DTO and never build the envelope themselves. File downloads (`StreamableFile`) and 204 responses are not wrapped. Error responses use the same envelope (chapter 12).

### The notes' "frontend wants a different shape" example: correct

If the frontend changes from `{ user: { id, name } }` to `{ profile: { id, displayName } }`, only the response mapper changes:

```ts
export class CustomerOverviewResponseMapper {
  static toResponse(result: CustomerOverview): CustomerOverviewResponseDto {
    return {
      profile: {
        id: result.customer.id,
        displayName: result.customer.fullName,
      },
      recentOrders: result.recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        total: order.total,
      })),
    };
  }
}
```

Domain, service, repositories and Dataverse stay unchanged. The notes are also right that if the **business concept itself** changes (`name` becomes `firstName` + `lastName`), no architecture prevents that from touching several layers. Layering contains *technical* change, not *business* change.

### Small corrections to the notes' controller code

- `@Req() req` + `req.user.id` is untyped and couples the controller to Express. Prefer a typed `@CurrentUser()` param decorator once authentication exists.
- Declare the response type (`Promise<CustomerResponseDto>`) so that the API contract is visible and checked.

> **Review of the original.** ✅ Response mapping in the presentation layer and the "frontend shape change only touches the mapper" example are correct. ❌ Returning the domain object straight from the controller (CRM section 13 / migration section) contradicts the notes' own advice. 🔧 Prefer typed current-user decorators over `@Req()`.

---

# Part III: The core

## 6. Domain models vs persistence models

### Core concept

The notes correctly point out that "Entity" means two different things:

| | Persistence model | Domain model |
| --- | --- | --- |
| Answers | "How is this stored or transferred?" | "What is this, and what may it do?" |
| Shape | follows storage: `emailaddress1`, `statecode: 0`, `_new_customerid_value` | follows the business: `email`, `status: CustomerStatus.Active`, `customerId` |
| Lives in | `repositories/<technology>/tables/<entity>.table.ts` | `domain/models/` |
| In this project | `CustomerTableRow` (Dataverse JSON shape) | `Customer` |
| With an ORM | an ORM entity class (`@Entity()`), replacing `tables/customer.table.ts` | still `Customer` |

### ORM-specific concepts

> **ORM-specific concept: `@Entity()`, `@Column()`, `@InjectRepository()`, `Repository<T>` (TypeORM).**
> TypeORM is **not** part of this project. These classes describe SQL tables for an ORM. The equivalent in this project is a plain TypeScript interface describing the Dataverse JSON (`CustomerTableRow`), because Dataverse has no ORM. Its "schema" lives in Dataverse and is reached through the Web API. If the project moves to a relational database, an ORM entity, a query-builder row type or a hand-written row interface becomes the new persistence model in `repositories/postgres/`. The **domain model does not change**.

> **Persistence-abstraction concept (not ORM-specific): "the repository is the bridge that converts the persistence model into the domain model."**
> Correct in general, and it applies unchanged to Dataverse.

### Naming: avoid "CRM DTO", and avoid "schema"

The notes call the Dataverse payload type `CrmUserDto`. "DTO" is already used for HTTP request/response shapes, and reusing it for storage shapes causes exactly the confusion the notes warn about. "Schema" would be accurate (it *is* the table's schema), but in this project "schema" already means a Zod validation schema in `dto/`. So storage shapes are called **table**:

- `repositories/dataverse/tables/customer.table.ts` holds the table name (`CUSTOMER_TABLE = 'contacts'`) and the row type (`CustomerTableRow`); each related table read through an `$expand` gets its own file, prefixed with the querying entity (`InvitationCompoundTableRow`),
- `repositories/dataverse/queries/customer.query.ts` holds what we ask for: the column list (`CUSTOMER_COLUMNS`) and the `$expand` (`CUSTOMER_EXPAND`),
- when writes need a different shape (lookups), the table file adds `OrderTableWriteRow`,
- `repositories/dataverse/mappers/customer.table-mapper.ts` holds `CustomerTableMapper` (Table ↔ Domain),
- a future `repositories/postgres/` uses **the same file names**.

The files are named after the business entity (`customer`), not the Dataverse table (`contact`). The real table name appears once, as the constant.

### Do not let the table row become the domain model

It is tempting to use `CustomerTableRow` everywhere ("it's just data"). Do not, because:

- business code would test bare `statecode === 0` and `new_status === 100000001` (option sets belong in domain enums with the CRM values: `CustomerStatus.Active`, `OrderStatus.Placed`),
- a migration to PostgreSQL would touch every file that reads these fields,
- `null` handling for CRM columns would spread everywhere.

> **Review of the original.** ✅ ORM entity vs domain entity, and the repository as the bridge, are correct. 🔧 The concept is taught through TypeORM, which this project doesn't use. Above, it is restated with Dataverse table rows. ⚠️ "CRM DTO" overloads the word DTO; use `tables/<entity>.table.ts` / `<Entity>TableRow`. ❌ The TypeORM example's domain id is `number | null` (database-generated). With Dataverse, ids are GUID strings (chapter 7).

---

## 7. Business rules: where they live

### Core concept

The notes give two homes for a rule like "under 18 cannot create an account": an `if` in the service, or the domain model's `User.create()`. Both are valid. The deciding question is:

> **Is the rule about the object itself, true no matter who calls?** Put it in the domain model.
> **Does it need other data (lookups, other aggregates, the current user)?** Put it in the service.

| Rule | Home | Why |
| --- | --- | --- |
| must be ≥ 18 at creation | `Customer.create()` | intrinsic; must hold for HTTP, queue, CLI and admin scripts |
| email normalised to lowercase | `Customer.create()` | intrinsic; also makes uniqueness behave the same in Dataverse and PostgreSQL (chapter 17) |
| can place order: active and adult | `Customer.canPlaceOrder()` | intrinsic query on loaded data |
| total > 0 | `Order.place()` | intrinsic invariant |
| email unique | `CreateCustomerService` | needs a lookup |
| customer must exist to order | `PlaceOrderService` | needs a lookup |

### The domain model

One type per file: `domain/enums/`, `domain/models/` (`.model.ts` + `.props.ts`), `domain/errors/`.

```ts
// domain/enums/customer-status.enum.ts
/** Customer status: the CRM `statecode` of `contacts` (values are the CRM values). */
export enum CustomerStatus {
  Active = 0,
  Inactive = 1,
}
```

```ts
// domain/models/customer.props.ts
import { CustomerStatus } from '../enums/customer-status.enum';

export interface CustomerProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date | null;
  /** `null` when the CRM holds a value the enum doesn't know. */
  status: CustomerStatus | null;
}

export interface NewCustomerProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date;
}
```

```ts
// domain/models/customer.model.ts
import { CustomerStatus } from '../enums/customer-status.enum';
import { CustomerMustBeAdultError } from '../errors/customer.errors';
import { CustomerProps, NewCustomerProps } from './customer.props';

export class Customer {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly birthDate: Date | null;
  readonly status: CustomerStatus | null;

  private constructor(props: CustomerProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.birthDate = props.birthDate;
    this.status = props.status;
  }

  /** A brand-new customer: creation rules are enforced here, for every entry point. */
  static create(props: NewCustomerProps, today: Date): Customer {
    const customer = new Customer({
      ...props,
      email: props.email.trim().toLowerCase(),
      status: CustomerStatus.Active,
    });

    if (!customer.isAdultOn(today)) {
      throw new CustomerMustBeAdultError();
    }

    return customer;
  }

  /** An existing customer loaded from storage: trusted data, creation rules are not re-run. */
  static restore(props: CustomerProps): Customer {
    return new Customer(props);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  isAdultOn(date: Date): boolean {
    if (!this.birthDate) {
      return false;
    }
    const eighteenthBirthday = new Date(this.birthDate);
    eighteenthBirthday.setUTCFullYear(eighteenthBirthday.getUTCFullYear() + 18);
    return eighteenthBirthday <= date;
  }

  canPlaceOrder(today: Date): boolean {
    return this.status === CustomerStatus.Active && this.isAdultOn(today);
  }
}
```

Design decisions, and how they correct the notes:

| Decision | Why |
| --- | --- |
| **`create()` vs `restore()`** | The notes say "put the rule in `User.create()` so an invalid user can never exist". With a CRM, **invalid data already exists**: CRM staff can save a contact without a birth date. If loading ran creation rules, reading such a contact would throw. `create()` enforces rules for *new* objects; `restore()` rebuilds *existing* ones from trusted storage. |
| **Props object, not positional args** | `new User('123', 'Mona', 'mona@x.com')` with several `string` parameters makes swapped arguments compile silently. |
| **`readonly` fields** | The notes' first `User` has mutable `public name`. State changes should go through methods that enforce rules. |
| **`id: string`, generated by the app** | Dataverse ids are GUIDs. Generating the id in the service (`randomUUID()`) instead of letting storage assign it means the domain doesn't depend on storage for identity, keeps the **same ids** if data later moves to PostgreSQL/SQL Server, and makes a retried create collide with a duplicate key instead of creating a second record. Dataverse accepts a client-supplied primary key on create. |
| **`birthDate`, not `age`** | The notes store `age`. Age changes every year, so store the birth date and compute age for a given date. |
| **`today` passed in** | Domain logic stays deterministic and testable; no hidden `new Date()`. |
| **No NestJS, Zod or Dataverse imports** | The domain is plain TypeScript. |
| **Option sets as enums with the CRM values** | Rules compare enum members (`CustomerStatus.Active`), never bare numbers; the table-mapper maps unknown values to `null` with `optionSetValue`. |
| **One type per file** | Enums, props, model, errors and pure rules (`domain/rules/`) each change for their own reason. |

### Domain errors

Error codes are enum members, never hand-typed strings.

```ts
// domain/enums/customer-error-code.enum.ts
/** Codes the customers feature returns in the error envelope. Part of the API contract: never rename a value. */
export enum CustomerErrorCode {
  NotFound = 'CUSTOMER_NOT_FOUND',
  EmailAlreadyInUse = 'EMAIL_ALREADY_IN_USE',
  MustBeAdult = 'CUSTOMER_MUST_BE_ADULT',
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

export class EmailAlreadyInUseError extends BusinessError {
  readonly kind = BusinessErrorKind.Conflict;

  constructor(email: string) {
    super(`Email ${email} is already in use`, CustomerErrorCode.EmailAlreadyInUse);
  }
}

export class CustomerMustBeAdultError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;

  constructor() {
    super('Customer must be at least 18 years old', CustomerErrorCode.MustBeAdult);
  }
}
```

`BusinessError` is a small, framework-free base class (chapter 12). Errors do **not** extend `HttpException`; HTTP status is decided at the edge.

> **Review of the original.** ✅ Business validation in the service, or in `User.create()` for rules that must hold for every entry point, is correct and important. 💡 Missing: the create-vs-restore distinction, which matters a lot with a CRM where other people write data. 🔧 Positional constructors, mutable fields, `age` instead of birth date, and `throw new Error('…')` (generic errors become 500s).

---

## 8. Services: one class per use case

### Core concept

The notes distinguish "domain-oriented services" (`UserService`, `OrderService`) from "application services / use cases" (`GetUserDashboardUseCase`). The distinction is useful, but the labels are slightly off:

| Term (corrected) | What it is | Depends on | In this project |
| --- | --- | --- | --- |
| **Use case** (application service) | one operation of the system: load, apply rules, save, return result | abstract repositories, domain | `services/<verb>-<entity>.service.ts` |
| **Domain service** | pure business logic involving several domain objects that belongs to none of them (for example, a pricing calculation across customer + order + promotion) | domain only, **no repositories** | a plain class or function in `domain/` (rare) |
| "`UserService`" in typical NestJS code | usually a *bag* of use cases for one entity, i.e. an application service with many methods | repositories, domain | not used |

A `UserService` that calls repositories is **not** a domain service in the DDD sense. The notes' label "domain-oriented service" for it is ⚠️ misleading.

### Recommendation for this project: one service class per operation

| Option | Pros | Cons |
| --- | --- | --- |
| `CustomersService` with many methods | fewer files; familiar to NestJS developers | grows into a god class; every method's dependencies are injected into all; cross-entity operations (dashboard) have no natural home |
| **One `<Verb><Entity>Service` class per operation** | small, focused, explicit dependencies, easy to test; cross-entity operations fit naturally | more files |

**Choose one service class per operation** (`CreateCustomerService`, `GetCustomerService`, `PlaceOrderService`, `GetCustomerOverviewService`), each in its own file under `services/` with a single `execute(input)` method. The rule is simple enough for an AI agent to follow consistently, and the notes' dashboard example already shows why a per-entity service breaks down. A service never calls another service; shared logic goes into `domain/` or a repository method. The one exception is an operation whose flow differs per type (register for six user types): the service picks a **strategy** per type through a factory, and the strategies share small helper classes, all inside `services/<operation>/` (see `docs/structure.md` § 4b and the `nestjs-feature-architecture` skill → `strategies.md`).

### The dashboard example, corrected

The notes' `GetUserDashboardUseCase` has three issues: sequential awaits for independent remote calls, no check that the user exists, and a hard-coded HTTP-ish shape in the earlier "don't do this" version. Corrected:

```ts
// orders/services/get-customer-overview.service.ts
import type { GetCustomerOverviewInput } from './get-customer-overview.input'; // { customerId: string }

@Injectable()
export class GetCustomerOverviewService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly orders: OrderRepository,
  ) {}

  async execute(input: GetCustomerOverviewInput): Promise<CustomerOverview> {
    // Independent remote calls: run them in parallel, latency is the dominant cost.
    const [customer, recentOrders] = await Promise.all([
      this.customers.findById(input.customerId),
      this.orders.findRecentByCustomer(input.customerId, 5),
    ]);

    if (!customer) {
      throw new CustomerNotFoundError(input.customerId);
    }

    return { customer, recentOrders };
  }
}
```

With Dataverse, two sequential calls at ~150 ms each cost ~300 ms; in parallel they cost ~150 ms.

**Where does a cross-feature service live?** In the module that already depends on the other. `orders` depends on `customers` (an order needs a customer), so `GetCustomerOverviewService` lives in `orders` and `CustomersModule` exports `CustomerRepository`. Never create circular module imports.

### `@Injectable()` in the application layer: a pragmatic exception

Strictly, the application layer should be framework-free. In practice, `@Injectable()` on a service is metadata only: it doesn't change behaviour and the class is still instantiable with `new` in tests. **Accept this coupling**; avoiding it requires factory providers for every service, which costs more than it saves. Keep the **domain** completely free of NestJS.

> **Review of the original.** ✅ "This operation is a use case, not a `UserService` method" and "a use case returns its own Result" are correct. ⚠️ "Domain-oriented service" is used for services that call repositories; in DDD terms those are application services. 🔧 Parallelise independent remote calls and check for missing aggregates.

---

# Part IV: The outbound edge

## 9. The abstract repository (the port)

### Core concept

A **port** is a contract, owned by the application, describing what the application needs from the outside world. In this project the port is the **abstract repository** in `repositories/<entity>.repository.ts`. It describes storage of one kind of domain object; implementations live next to it in `repositories/dataverse/` (later `repositories/postgres/`).

```ts
// customers/repositories/customer.repository.ts
import { Customer } from '../domain/models/customer.model';

/**
 * What the services need from customer storage (the port).
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class CustomerRepository {
  abstract findById(id: string): Promise<Customer | null>;
  abstract findByEmail(email: string): Promise<Customer | null>;
  abstract create(customer: Customer): Promise<void>;
}
```

### Abstract class, not interface + string token

The notes use `export interface UserRepository` with `@Inject('UserRepository')` and `provide: 'UserRepository'`. This works, but:

- TypeScript interfaces don't exist at runtime, which is why a separate string token is needed,
- string tokens are global, unchecked and typo-prone (`'UserRepositry'` fails only at startup),
- `@Inject('…')` must be repeated at every injection site.

An **abstract class** is both the type and the runtime token. This is **already the convention in this codebase** (`TokenProvider`, `DataverseClient`):

```ts
{ provide: CustomerRepository, useClass: DataverseCustomerRepository }

constructor(private readonly customers: CustomerRepository) {} // no @Inject needed
```

Implementations `extends CustomerRepository` and call `super()`.

### Where does the abstract repository live?

The notes put it in `domain/repositories/`; the plan's template puts it in `application/ports/`. Both are defensible.

**Choose `repositories/<entity>.repository.ts`, next to its implementations.** The contract often carries application concerns that aren't pure domain: pagination cursors, read-model projections, "find recent N". It exists because a service needs it. Keeping the abstract class and its `dataverse/` / `postgres/` implementations in one folder makes "how is this entity stored?" answerable at a glance, and it matches familiar NestJS naming.

### Designing the contract: from needs, not from the data source

The notes' rule is correct and essential:

```ts
// ❌ leaks the data source into the contract
interface UserRepository {
  getFromCrm(): …;
  getFromOData(): …;
  getFromPostgres(): …;
}
```

Rules for a good abstract repository:

| Rule | Example |
| --- | --- |
| Named after **service needs** | `findRecentByCustomer(customerId, limit)` |
| Speaks **domain types** in and out | `create(customer: Customer)`, not `create(input: CreateCustomerInput)` and not `create(row: CustomerTableRow)` |
| Returns `null` for "not found" on single lookups | let the service decide whether absence is an error |
| No technology types in signatures | no OData filter strings, `$expand` options, `SelectQueryBuilder` or `DataverseQuery` |
| Pagination is **cursor-based** | `{ items, nextCursor }`. Dataverse has no `$skip`; offsets can't be implemented faithfully (chapter 10). |
| One repository per **aggregate** | `CustomerRepository`, `OrderRepository`; not one per table, not one giant `CrmRepository` |

The notes' repository is inconsistent in this respect: one service calls `usersRepository.create(input)` (passing an application Input) and another calls `usersRepository.save(user)` (passing a domain object). **Repositories take domain objects.**

### Aggregates and "user + units"

The notes ask: should `UserRepository.findById` return the user with units, or should there be `findUnits(userId)`? Decide by **lifecycle**:

- If units only exist as part of a user and are always loaded and changed together, they are part of the aggregate: `findById` returns `Customer` with them, and the Dataverse repository uses `$expand` or a second call (chapter 10).
- If units have their own lifecycle (created, listed, updated independently), they get their own repository.

`Order` here has its own lifecycle, so it gets `OrderRepository`.

### What should and should NOT be abstracted

| Abstract (repositories) | Don't abstract |
| --- | --- |
| Storage of each aggregate (repositories) | the `DataverseClient` *inside* `repositories/dataverse/`. It already is abstract, and it is a connection detail that services never see. |
| Other external capabilities the app truly needs (email sending, file storage) when they exist | a generic `IRepository<T>` / `BaseRepository<T>` (forces lowest-common-denominator CRUD and hides real needs) |
| | query languages (OData/SQL) behind a "universal query builder" |
| | transactions behind a generic Unit of Work, until a real multi-aggregate atomic write exists (chapter 18) |

> **Review of the original.** ✅ "The contract expresses what the application needs, not where data comes from" and the `getFromCrm()` anti-pattern are correct. 🔧 Prefer abstract-class tokens over interface + string token; the codebase already does this. ❌ Repository methods receive both Inputs and domain objects; repositories should take domain objects only. 💡 Missing: cursor pagination, aggregate boundaries, and what not to abstract.

---

## 10. The Dataverse repository: repository + tables + queries + table-mapper

Everything Dataverse-specific for a feature lives in `repositories/dataverse/`:

```text
customers/repositories/
├── customer.repository.ts                   abstract (what services see)
└── dataverse/
    ├── dataverse-customer.repository.ts     extends CustomerRepository, uses DataverseClient
    ├── mappers/                             Table ↔ Domain
    │   └── customer.table-mapper.ts         CustomerTableMapper
    ├── tables/                              what Dataverse returns: one file per CRM table
    │   └── customer.table.ts                CUSTOMER_TABLE + CustomerTableRow
    └── queries/                             what we ask for
        └── customer.query.ts                CUSTOMER_COLUMNS ($select) + CUSTOMER_EXPAND ($expand)
```

A real feature in this shape, with a nested `$expand`, is `src/modules/invitations/`.

### What Dataverse actually returns

The notes' sample (`{ "userid": "123", "units": [ … ] }`) is a simplification. A real `GET /api/data/v9.2/contacts(<guid>)?$select=contactid,firstname,lastname,emailaddress1,birthdate,statecode` returns:

```json
{
  "@odata.context": "https://org.crm.dynamics.com/api/data/v9.2/$metadata#contacts(contactid,firstname,…)/$entity",
  "@odata.etag": "W/\"4421907\"",
  "contactid": "5a2c3f1e-7b4d-4e8a-9c1f-2d3e4f5a6b7c",
  "firstname": "Mona",
  "lastname": "Adel",
  "emailaddress1": "mona@example.com",
  "birthdate": "1990-05-14",
  "statecode": 0
}
```

A custom table with a lookup and a choice returns:

```json
{
  "new_orderid": "0b0e…",
  "new_status": 100000001,
  "new_total": 250.0,
  "_new_customerid_value": "5a2c3f1e-…"
}
```

### The table (persistence model)

```ts
// customers/repositories/dataverse/tables/customer.table.ts
/** Dataverse table (entity set) that stores customers. */
export const CUSTOMER_TABLE = 'contacts';

/** One row of the `contacts` table, exactly as the Dataverse Web API returns it. */
export interface CustomerTableRow {
  contactid: string;
  firstname: string | null;
  lastname: string | null;
  emailaddress1: string | null;
  birthdate: string | null; // Date-only column: "YYYY-MM-DD"
  statecode: number | null; // option set → CustomerStatus
}
```

```ts
// customers/repositories/dataverse/queries/customer.query.ts
import { CustomerTableRow } from '../tables/customer.table';

/** Customer columns to read ($select). */
export const CUSTOMER_COLUMNS: (keyof CustomerTableRow)[] = [
  'contactid',
  'firstname',
  'lastname',
  'emailaddress1',
  'birthdate',
  'statecode',
];
```

Always `$select` explicit columns. Without it Dataverse returns every column, which is slow and couples you to columns you never meant to read.

### The table-mapper: Table ↔ Domain

```ts
// customers/repositories/dataverse/mappers/customer.table-mapper.ts
import { DataverseException, optionSetValue } from '../../../../../core/dataverse';
import { CustomerStatus } from '../../../domain/enums/customer-status.enum';
import { Customer } from '../../../domain/models/customer.model';
import { CustomerTableRow } from '../tables/customer.table';

/** Translates between the Dataverse table row and the Customer domain model. */
export class CustomerTableMapper {
  static toDomain(row: CustomerTableRow): Customer {
    if (!row.emailaddress1) {
      // Our domain requires an email; CRM users can still save a contact without one.
      throw new DataverseException(`Contact ${row.contactid} has no email address`);
    }

    return Customer.restore({
      id: row.contactid,
      firstName: row.firstname ?? '',
      lastName: row.lastname ?? '',
      email: row.emailaddress1.toLowerCase(),
      birthDate: row.birthdate ? new Date(`${row.birthdate}T00:00:00Z`) : null,
      status: optionSetValue(CustomerStatus, row.statecode), // unknown or empty → null
    });
  }

  /** `fullname` is computed by Dataverse and read-only, so it is never written. */
  static toTableRow(customer: Customer): Partial<CustomerTableRow> {
    return {
      contactid: customer.id,
      firstname: customer.firstName,
      lastname: customer.lastName,
      emailaddress1: customer.email,
      birthdate: customer.birthDate?.toISOString().slice(0, 10) ?? null,
    };
  }
}
```

`CustomerTableMapper` (Table ↔ Domain, in `repositories/dataverse/`) and `CustomerResponseMapper` (Domain → Response DTO, in `mappers/`) are different jobs. The first changes when Dataverse renames a column; the second changes when the frontend wants a new JSON shape.

**Decide `null` handling per field, deliberately.** CRM columns are nullable unless marked *Business Required*, and even then CRM users can bypass it through some paths. For each field, choose one of:

- **nullable in the domain** (`birthDate: Date | null`) when the business can live without it,
- **a documented default** (`firstName ?? ''`) when absence is harmless,
- **fail loudly** (email above) when the record is unusable without it. The trade-off: one bad CRM record makes that endpoint fail for that record. If that is unacceptable, make the field nullable in the domain instead.

Never silently invent business data.

#### Choices (option sets) and lookups

Option sets are enums in `domain/enums/` whose values **are the CRM values**; the table-mapper turns the row's number into a member with `optionSetValue` (unknown or empty → `null`), and writing back needs no translation.

```ts
// orders/domain/enums/order-status.enum.ts
/** Order status: the CRM `new_status` choice (values are the CRM values). */
export enum OrderStatus {
  Draft = 100000000,
  Placed = 100000001,
  Cancelled = 100000002,
}
```

```ts
// orders/repositories/dataverse/tables/order.table.ts
/**
 * Dataverse table (entity set) that stores orders.
 * `new_` is a placeholder publisher prefix: use your solution's real schema names.
 */
export const ORDER_TABLE = 'new_orders';

/** One row of the `new_orders` table, as the Web API returns it (read shape). */
export interface OrderTableRow {
  new_orderid: string;
  new_status: number | null; // Choice column (option set) → OrderStatus
  new_total: number | null; // Currency column
  _new_customerid_value: string; // Lookup to contact, read form
}

/** Write shape: lookups are set by binding to the related record's URL. */
export interface OrderTableWriteRow {
  new_orderid: string;
  new_status: OrderStatus;
  new_total: number;
  'new_CustomerId@odata.bind': string; // Navigation property name, case-sensitive
}
```

```ts
// orders/repositories/dataverse/queries/order.query.ts
export const ORDER_COLUMNS: (keyof OrderTableRow)[] = [
  'new_orderid',
  'new_status',
  'new_total',
  '_new_customerid_value',
];
```

```ts
// orders/repositories/dataverse/mappers/order.table-mapper.ts
import { optionSetValue } from '../../../../../core/dataverse';
import { CUSTOMER_TABLE } from '../../../../customers/repositories/dataverse/tables/customer.table';
import { OrderStatus } from '../../../domain/enums/order-status.enum';
import { Order } from '../../../domain/models/order.model';
import { OrderTableRow, OrderTableWriteRow } from '../tables/order.table';

/** Translates between the Dataverse table row and the Order domain model. */
export class OrderTableMapper {
  static toDomain(row: OrderTableRow): Order {
    return Order.restore({
      id: row.new_orderid,
      customerId: row._new_customerid_value,
      status: optionSetValue(OrderStatus, row.new_status), // unknown → null; the domain decides
      total: row.new_total ?? 0,
    });
  }

  static toTableRow(order: Order): OrderTableWriteRow {
    return {
      new_orderid: order.id,
      new_status: order.status, // the member already is the CRM value
      new_total: order.total,
      'new_CustomerId@odata.bind': `/${CUSTOMER_TABLE}(${order.customerId})`,
    };
  }
}
```

- Option-set numbers (`100000001`) are never written as bare numbers: the domain compares `OrderStatus.Placed`.
- Lookups are **read** as `_<logicalname>_value` and **written** with `<NavigationPropertyName>@odata.bind: "/<entityset>(<guid>)"`. The navigation property name is case-sensitive and often differs from the column's logical name, so check the solution metadata.
- Computed or read-only columns (`fullname`, `createdon`) are never written.

### The repository

```ts
// customers/repositories/dataverse/dataverse-customer.repository.ts
import { Injectable } from '@nestjs/common';
import {
  DataverseClient,
  DataverseException,
  odataString,
} from '../../../../core/dataverse';
import { Customer } from '../../domain/models/customer.model';
import { CustomerRepository } from '../customer.repository';
import { CustomerTableMapper } from './mappers/customer.table-mapper';
import { CUSTOMER_COLUMNS } from './queries/customer.query';
import { CUSTOMER_TABLE, CustomerTableRow } from './tables/customer.table';

@Injectable()
export class DataverseCustomerRepository extends CustomerRepository {
  constructor(private readonly dataverse: DataverseClient) {
    super();
  }

  async findById(id: string): Promise<Customer | null> {
    try {
      const row = await this.dataverse.retrieve<CustomerTableRow>(
        CUSTOMER_TABLE,
        id,
        CUSTOMER_COLUMNS,
      );
      return CustomerTableMapper.toDomain(row);
    } catch (error) {
      if (error instanceof DataverseException && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const [row] = await this.dataverse.retrieveMultiple<CustomerTableRow>(
      CUSTOMER_TABLE,
      {
        select: CUSTOMER_COLUMNS,
        filter: `emailaddress1 eq ${odataString(email)}`,
        top: 1,
      },
    );
    return row ? CustomerTableMapper.toDomain(row) : null;
  }

  async create(customer: Customer): Promise<void> {
    await this.dataverse.create(
      CUSTOMER_TABLE,
      CustomerTableMapper.toTableRow(customer),
    );
  }
}
```

Notes on this code:

- **The repository uses the shared `DataverseClient` from `core/dataverse`.** The notes put a `CrmClient` and a `CrmAuthService` inside every feature's `infrastructure/crm/`. That duplicates connection logic per feature. Connection concerns (auth, retry, base URL) live once in `core/dataverse`; features contain only the repository, `tables/`, `queries/` and the table-mapper.
- **404 becomes `null`.** Not-found is an expected outcome, not an infrastructure failure.

#### OData filter injection

`DataverseQuery.filter` is a raw OData string. Interpolating user input into it is the OData equivalent of SQL injection:

```ts
filter: `emailaddress1 eq '${email}'` // ❌ email = "x' or statecode eq 0 or emailaddress1 eq 'y"
```

Escape string literals (single quotes are doubled in OData) with `odataString`, exported from `core/dataverse` (`data-access/odata.ts`):

```ts
/** Quotes a value as an OData string literal, escaping embedded single quotes. */
export const odataString = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;
```

GUIDs are unquoted in OData filters (`_new_customerid_value eq 5a2c…`), so **validate** them before interpolating:

```ts
// orders/repositories/dataverse/dataverse-order.repository.ts (excerpt)
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async findRecentByCustomer(customerId: string, limit: number): Promise<Order[]> {
  if (!GUID.test(customerId)) {
    return []; // Never interpolate an unchecked value into an OData filter.
  }

  const rows = await this.dataverse.retrieveMultiple<OrderTableRow>(ORDER_TABLE, {
    select: ORDER_COLUMNS,
    filter: `_new_customerid_value eq ${customerId}`,
    orderBy: ['createdon desc'],
    top: limit,
  });
  return rows.map((row) => OrderTableMapper.toDomain(row));
}
```

### Related data: `$expand` or two calls (the notes' section 7)

The notes are right that this is an infrastructure decision invisible to the service. In Dataverse terms:

| Option | When |
| --- | --- |
| `$expand` a single-valued lookup (`?$expand=parentcustomerid_account($select=name)`) | cheap, always fine |
| `$expand` a collection-valued navigation property (`?$expand=contact_new_orders($select=new_total;$top=5)`) | small child sets on a single-record retrieve |
| a second query with `$filter` on the lookup | large child sets, or when you need paging or ordering of children |

`retrieveMultiple` takes `expand` through `DataverseQuery` (nested `DataverseExpand` objects, kept in `queries/<entity>.query.ts`); single `retrieve` has none yet: add it when first needed. **The port does not change.** With a nested expand on a one-to-many relationship, Dataverse accepts only `$select`, `$filter` and `$orderby` at the top level: adding `top` fails (`0x80060888`).

### Pagination

- Dataverse returns at most 5,000 rows per page (fewer with `Prefer: odata.maxpagesize`) plus an `@odata.nextLink` when more exist.
- There is **no `$skip`**, so page 7 cannot be requested directly. Paging is cursor-only.
- The current `DynamicsWebApiClient.retrieveMultiple` returns `response.value` and **drops `oDataNextLink`**. Today, every list silently returns at most the first page. When the first paged list is built, extend `DataverseClient` to return `{ items, nextLink }`, and expose it through the abstract repository as an opaque cursor:

```ts
export interface Page<T> {
  items: T[];
  nextCursor: string | null; // opaque: a Dataverse nextLink today, a keyset token in PostgreSQL later
}
```

### Other Dataverse details the Dataverse repository owns

| Concern | Handling |
| --- | --- |
| Optimistic concurrency | read `@odata.etag`, send `If-Match` on update (`ifmatch` in `dynamics-web-api`). Expose to the domain only as an opaque `version` if you need it. |
| Formatted values (choice labels, currency strings) | request the `OData.Community.Display.V1.FormattedValue` annotation only for display needs; never base logic on labels. |
| Date-only vs date-time columns | date-only columns come as `"YYYY-MM-DD"`; date-time columns as UTC ISO strings (depending on the column's behaviour). Parse explicitly in the table-mapper. |
| Atomic multi-record writes | `$batch` with a changeset (`startBatch` / `executeBatch`). Expose as **one** repository method (for example `createWithLines(order)`), not as a generic transaction API. |
| Plugin errors | synchronous plugins can reject an operation with a business message. Decide per case whether to translate into a `BusinessError` (if the plugin enforces a known rule) or let it surface as a 502. |

> **Review of the original.** ✅ "CRM DTO → CRM mapper → domain" and "CRM complexity stays in infrastructure" (sections 4–7) are correct. ❌ A `CrmClient` + `CrmAuthService` per feature duplicates connection logic; it lives once in `core/dataverse`. ⚠️ The sample JSON and `GET /users/123?$expand=units` are not real Dataverse shapes. 💡 Missing: `$select`, null handling, choices, lookups and `@odata.bind`, read-only columns, OData injection, pagination via `nextLink`, ETags, batches.

---

## 11. Authentication and the Dataverse client

### Where MSAL belongs

The notes are correct: **MSAL, tokens and secrets live only in infrastructure**, below the repository. The domain, services and abstract repositories never see them.

The project already implements this well in `core/dataverse`:

```text
DataverseClient (abstract)  ◄── what repositories inject
      ▲
DynamicsWebApiClient        ── wraps every call: retry policy + error normalisation
      │ uses
DynamicsWebApi (library)    ── onTokenRefresh → TokenProvider.getToken()
DataverseRetryPolicy (abstract) ◄── TokenRefreshRetryPolicy (on 401: TokenProvider.getToken(forceRefresh) and retry once)
TokenProvider (abstract)    ◄── MsalTokenProvider (client credentials, ConfidentialClientApplication)
DataverseConfig             ── { url, tenantId, clientId, clientSecret } from DV_URL, DV_TENANT_ID, DV_CLIENT_ID, DV_CLIENT_SECRET (getOrThrow)
```

### Review of the notes' `CrmClient` example

```ts
// From the notes
async getUser(id: string) {
  const token = await this.authClient.getAccessToken();
  return this.http.get(`/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
}
```

| Issue | Correction (already done in `core/dataverse`) |
| --- | --- |
| Returns an Axios response, not data | `DataverseClient` returns typed data |
| Entity-specific method (`getUser`) on the shared client | client is generic (`retrieve(table, id, select)`); entity knowledge lives in repositories |
| No error handling | `DynamicsWebApiClient` normalises every failure to `DataverseException` with `status` and `cause` |
| No token refresh on 401 | `TokenRefreshRetryPolicy` (the `DataverseRetryPolicy` implementation) retries once with a force-refreshed token |
| Hand-built URLs | `dynamics-web-api` builds OData URLs and encodes parameters |

### Gaps in the current client (proposed follow-ups, not yet implemented)

1. **Throttling (429).** Dataverse returns `429 Too Many Requests` with a `Retry-After` header when service-protection limits are hit. `dynamics-web-api` does not retry these, and `TokenRefreshRetryPolicy` only handles 401. Add a bounded retry honouring `Retry-After` for idempotent reads at minimum, as a new `DataverseRetryPolicy` implementation (or a decorator wrapping the current one) and one `useClass` change in `DataverseModule`; `DynamicsWebApiClient` does not change.
2. **Pagination.** `retrieveMultiple` drops `oDataNextLink` (chapter 10).
3. **Error detail.** `DataverseException` keeps the HTTP status but not the Dataverse error `code` (for example the duplicate-key code). Repositories need the code to translate specific failures reliably.
4. ✅ **`$expand` support** on `retrieveMultiple` (done: `DataverseQuery.expand`); `retrieve` still has none.
5. ✅ **`odataString` helper** for safe filters (done: `core/dataverse/data-access/odata.ts`), plus `optionSetValue` for option sets.

### Authorisation: the application user

All requests run as one Dataverse **application user**. Dataverse security roles therefore restrict *the app*, not the person calling your API. "Can this caller see this customer?" must be enforced in services. The alternative, impersonating a Dataverse user (`MSCRMCallerID` / `CallerObjectId` headers), only works if your end users are Dataverse users, and it adds complexity. Choose it deliberately, never by accident.

> **Review of the original.** ✅ "MSAL stays in infrastructure; the application doesn't know it exists" is correct. 🔧 The example client is simplistic; the repository already has a better one. 💡 Missing: 429 throttling, pagination, error codes, and the application-user authorisation model.

---

## 12. Error handling across boundaries

### Core concept

Errors are translated at each boundary, like data is:

```text
Dataverse Web API  (HTTP 404 / 412 / 429 / 5xx, plugin error)
   ↓
DynamicsWebApiClient → DataverseException { status, cause }         core/dataverse
   ↓
Repository: expected errors → null or BusinessError               feature infrastructure
            unexpected errors → rethrow DataverseException
   ↓
Service: business outcomes → BusinessError                         services/ + domain/
   ↓
Global exception filters                                              core/http/filters
   BusinessError      → 404 / 409 / 422 / 403 / 429, code = error.code (429: + retryAfterSeconds)
   DataverseException → 502 / 503, code = UPSTREAM_UNAVAILABLE, details logged, not exposed
   HttpException      → its own status; validation pipes: 400 / 422, code = VALIDATION_FAILED + errors
   anything else      → 500, code = INTERNAL_ERROR, details logged, not exposed
```

### One envelope for every response

Every response, success or error, has the same shape, so clients parse one structure and switch on `code`:

```jsonc
// success (ResponseInterceptor wraps the controller's response DTO)
{ "success": true,  "statusCode": 200, "message": "OK", "data": { /* response DTO */ } }
// error (exception filters)
{ "success": false, "statusCode": 404, "code": "CUSTOMER_NOT_FOUND", "message": "Customer 42 was not found", "data": null }
// validation error
{ "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [{ "field": "email", "message": "Invalid email address" }] }
```

| Field | Meaning |
| --- | --- |
| `success` | `true` for 2xx, `false` otherwise |
| `statusCode` | same as the HTTP status (convenience for clients) |
| `code` | errors only: stable, machine-readable (`CUSTOMER_NOT_FOUND`, `VALIDATION_FAILED`, `NOT_FOUND`, `UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`) |
| `message` | human-readable; may change or be translated, so clients must not branch on it |
| `data` | the success payload; always `null` on errors |
| `errors` | optional field-level problems (`{ field?, message }[]`) |

The shape lives in one place, `ApiResponseBuilder` (`src/core/http/api-response.ts`). Adding a field later is safe for clients; removing or renaming one is a breaking change that needs a deprecation period or a new API version.

The codes the system itself returns are one enum, so none of them is hand-typed in a filter:

```ts
// core/errors/error-code.ts
/**
 * Codes the system itself returns in the error envelope.
 * Business errors bring their own codes (e.g. `CUSTOMER_NOT_FOUND`).
 * Part of the API contract: never rename or remove a value.
 */
export enum ErrorCode {
  ValidationFailed = 'VALIDATION_FAILED',
  UpstreamUnavailable = 'UPSTREAM_UNAVAILABLE',
  InternalError = 'INTERNAL_ERROR',
  HttpError = 'HTTP_ERROR', // an HttpException whose status has no name
}
```

Other `HttpException`s use the status name (`NOT_FOUND`, `BAD_REQUEST`, …). Every 500, whatever raised it, is `INTERNAL_ERROR`.

### Business errors

`src/core/errors/` is framework-free (no NestJS, no HTTP), so `domain/` and `services/` can import it.

```ts
// core/errors/business-error.ts
/** What went wrong, from the business point of view. Each caller (HTTP, CLI, queue) maps it its own way. */
export enum BusinessErrorKind {
  NotFound = 'not_found',
  Conflict = 'conflict',
  RuleViolation = 'rule_violation',
  Forbidden = 'forbidden',
  TooManyRequests = 'too_many_requests',
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

/** Allowed again after a wait: the caller learns how long (HTTP: 429 + `retryAfterSeconds` in the body). */
export abstract class RetryLaterError extends BusinessError {
  readonly kind = BusinessErrorKind.TooManyRequests;

  constructor(
    message: string,
    code: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message, code);
  }
}
```

### Filters

The filters live in `src/core/http/filters/`, not in `core/errors/`, so that the framework-free error classes never pull NestJS into the domain.

**A base class logs and writes the response; each filter only translates** (Template Method). Any response ≥ 500 is logged here, once, whichever filter produced it, so no filter can forget. Writing goes through `HttpAdapterHost`, so the filters don't depend on Express:

```ts
// core/http/filters/api-exception.filter.ts
@Injectable()
export abstract class ApiExceptionFilter<E> implements ExceptionFilter<E> {
  private readonly logger = new Logger(this.constructor.name); // the subclass name

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: E, host: ArgumentsHost): void {
    const body = this.toResponse(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(this.describe(exception), this.stackOf(exception));
    }

    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();

    // A stream that fails mid-way has already sent its headers: just close it.
    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }
    httpAdapter.reply(response, body, body.statusCode);
  }

  /** Pure translation, so it can be unit-tested without a request. */
  protected abstract toResponse(exception: E): ApiErrorResponse;

  /** What the log says about a server-side failure. Override to add details (e.g. an upstream status). */
  protected describe(exception: E): string {
    return exception instanceof Error ? exception.message : String(exception);
  }

  private stackOf(exception: E): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
  }
}
```

`toResponse()` decides what the **client** sees; `describe()` decides what the **log** says.

```ts
// core/http/filters/business-error.filter.ts
const STATUS_BY_KIND: Record<BusinessErrorKind, HttpStatus> = {
  [BusinessErrorKind.NotFound]: HttpStatus.NOT_FOUND,
  [BusinessErrorKind.Conflict]: HttpStatus.CONFLICT,
  [BusinessErrorKind.RuleViolation]: HttpStatus.UNPROCESSABLE_ENTITY,
  [BusinessErrorKind.Forbidden]: HttpStatus.FORBIDDEN,
};

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

```ts
// core/http/filters/dataverse-exception.filter.ts
/** Last-resort translation of Dataverse failures that no repository handled. */
@Catch(DataverseException)
export class DataverseExceptionFilter extends ApiExceptionFilter<DataverseException> {
  protected toResponse(error: DataverseException): ApiErrorResponse {
    const status =
      error.status === 429 || error.status === 503
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_GATEWAY;

    return ApiResponseBuilder.error(
      status,
      ErrorCode.UpstreamUnavailable,
      'The data service is unavailable. Please try again later.',
    );
  }

  // The default log line lacks the Dataverse status (429 vs 400 vs 503).
  protected describe(error: DataverseException): string {
    return `Dataverse call failed (status ${error.status ?? 'n/a'}): ${error.message}`;
  }
}
```

The other two filters follow the same pattern:

| Filter | Catches | Result |
| --- | --- | --- |
| `HttpExceptionFilter` | `HttpException` (validation pipes, `NotFoundException`, unknown routes, …) | its own status; `code` from the body (`VALIDATION_FAILED`) or the status name (`NOT_FOUND`); validation `errors` carried through; a `message` array becomes one `errors` entry per message; a 500 is answered with `INTERNAL_ERROR` and a generic message, because its text may hold internal details |
| `UnhandledExceptionFilter` | everything else (`@Catch()`) | 500 `INTERNAL_ERROR` with a generic message |

Successes are wrapped by `ResponseInterceptor` (`core/http/response.interceptor.ts`); it skips `StreamableFile`, 204 responses and non-HTTP contexts.

`HttpModule` (`core/http/http.module.ts`) registers the four filters as `APP_FILTER` and the interceptor as `APP_INTERCEPTOR`; `AppModule` imports it once (chapter 13). **Order matters:** Nest tries global filters in reverse registration order and uses the first whose `@Catch` matches, so the catch-all must be registered **first**, otherwise it would turn every error into a 500. A new error source (e.g. a PostgreSQL error filter after a migration) is one new `ApiExceptionFilter` subclass and one `APP_FILTER` line after the catch-all.

### Same error, different callers

The domain and services throw an error with a `kind` and a `code` only; they never know the HTTP status. **Each caller maps the error its own way.** The HTTP filter above is one caller; a CLI command or a queue consumer calling the same service is another:

| `kind` | HTTP (`BusinessErrorFilter`) | CLI (example) |
| --- | --- | --- |
| `RuleViolation` | 422 | print message, exit 1 |
| `Conflict` | 409 | print message, exit 1 |
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

### Rules

| Rule | Why |
| --- | --- |
| Never `throw new Error('User not found')` (as in the notes' `OrderService`) | it becomes a 500 and the client can't distinguish it |
| Never throw `HttpException` (`NotFoundException`) from services or domain | ties business code to HTTP; a queue consumer would receive an HTTP exception |
| No HTTP status codes in `domain/` or `services/`, not even in comments | write `// kind: Conflict`, not `// → 409`; only `core/http/` and controllers know HTTP |
| Never `catch (DataverseException)` in a service | the service would know about the CRM. Repositories translate. |
| Translate only **expected** infrastructure errors in the repository | 404 → `null`, duplicate key → `EmailAlreadyInUseError`; everything else propagates |
| Never expose Dataverse messages or unexpected error text to API clients | they can contain schema names, credentials and internal details; log them instead |
| Never build the envelope in a controller | return the response DTO; `ResponseInterceptor` and the filters own the shape |
| Keep `cause` when wrapping | `DataverseException` already does (`{ cause: error }`) |

Without the `DataverseExceptionFilter`, Nest turns a `DataverseException` into a generic 500. That is safe but wrong: the failure is upstream (502/503), and a 503 tells clients that retrying later may help.

> **Review of the original.** 💡 The notes barely discuss error flow beyond `throw new UserNotFoundError()`. ❌ `throw new Error('User not found')` produces 500s. ✅ Custom error classes like `EmailAlreadyExistsError` are the right direction; they need a base class and a filter to become correct HTTP responses.

---

## 13. Module wiring and dependency injection

```ts
// customers/customers.module.ts
@Module({
  imports: [DataverseModule],
  controllers: [CustomersController],
  providers: [
    CreateCustomerService,
    GetCustomerService,
    { provide: CustomerRepository, useClass: DataverseCustomerRepository },
  ],
  exports: [CustomerRepository],
})
export class CustomersModule {}
```

```ts
// orders/orders.module.ts
@Module({
  imports: [DataverseModule, CustomersModule],
  controllers: [CustomerOverviewController],
  providers: [
    PlaceOrderService,
    GetCustomerOverviewService,
    { provide: OrderRepository, useClass: DataverseOrderRepository },
  ],
})
export class OrdersModule {}
```

```ts
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule, // global exception filters + ResponseInterceptor (chapter 12)
    CustomersModule,
    OrdersModule,
  ],
})
export class AppModule {}
```

`HttpModule` (`src/core/http`) registers the global filters and the response interceptor itself, so `AppModule` has no `APP_FILTER` providers and feature modules never register filters.

Corrections to the notes' module:

| Notes | Correction |
| --- | --- |
| `provide: 'UserRepository'` (string) | `provide: CustomerRepository` (abstract-class token) |
| `CrmClient`, `CrmAuthService` registered in the feature module | import `DataverseModule`; it provides and exports `DataverseClient` |
| no `exports` | export the **abstract repository** (`CustomerRepository`) if another module's service needs it, never the Dataverse implementation class |

`DataverseModule` is a plain (non-global) module imported by each feature that needs it. Nest instantiates it once, so the MSAL client and token cache are shared.

### Choosing an implementation by configuration (notes' "support both")

The notes' factory does `new CrmUserRepository(...)`, constructing dependencies by hand outside DI. If the choice is needed at all (see chapter 18 for *when*), make it when the module is defined, so that only the selected technology's module is imported:

```ts
@Module({})
export class CustomersModule {
  static register(source: 'dataverse' | 'postgres'): DynamicModule {
    const postgres = source === 'postgres';
    return {
      module: CustomersModule,
      imports: [postgres ? PostgresModule : DataverseModule],
      controllers: [CustomersController],
      providers: [
        CreateCustomerService,
        GetCustomerService,
        {
          provide: CustomerRepository,
          useClass: postgres
            ? PostgresCustomerRepository
            : DataverseCustomerRepository,
        },
      ],
      exports: [CustomerRepository],
    };
  }
}
```

> **Review of the original.** ✅ "The module binds the contract to the CRM implementation" is the right idea. 🔧 String token; per-feature CRM client/auth. ❌ The factory constructs repositories with `new`, bypassing DI and instantiating dependencies for both data sources.

---

# Part V: Putting it together

## 14. Folder structure

The notes contain two structures. The first (`users/` with root-level `mappers/` and `user.orm-entity.ts`) is ORM-shaped and mixes mapper responsibilities. The second (CRM version) is closer, but it duplicates `crm.client.ts` / `crm-auth.service.ts` per feature and puts the abstract repository under `domain/`.

### Recommended structure

```text
src/
├── main.ts
├── app.module.ts                         # ConfigModule, HttpModule, feature modules
├── core/                                 # cross-cutting technical building blocks
│   ├── dataverse/                        # (exists) connection: auth, client, retry, errors
│   │   ├── config/  crm-token/  data-access/  errors/  policies/
│   │   └── index.ts                      # public API: DataverseModule, DataverseClient, DataverseException
│   ├── validation/                       # (exists) zodBody / zodQuery / zodParam pipes
│   ├── errors/                           # (exists) BusinessError + BusinessErrorKind + ErrorCode, framework-free
│   └── http/                             # (exists) response envelope, global filters, ResponseInterceptor, HttpModule
└── modules/
    ├── customers/
    │   ├── customers.module.ts
    │   ├── controllers/
    │   │   └── customers.controller.ts           # one endpoint → one service
    │   ├── dto/
    │   │   ├── create-customer.dto.ts            # Zod schema + CreateCustomerDto
    │   │   ├── customer-id.dto.ts                # Zod schema for :id
    │   │   └── customer-response.dto.ts          # CustomerResponseDto (JSON shape)
    │   ├── mappers/
    │   │   └── customer-response.mapper.ts       # Domain → CustomerResponseDto
    │   ├── services/
    │   │   ├── create-customer.service.ts        # CreateCustomerService.execute(input)
    │   │   ├── create-customer.input.ts          # CreateCustomerInput (type only)
    │   │   └── get-customer.service.ts           # execute(id): no input file
    │   ├── domain/                               # one type per file
    │   │   ├── enums/                            # customer-status.enum.ts, customer-error-code.enum.ts
    │   │   ├── models/                           # customer.model.ts (model + rules), customer.props.ts
    │   │   ├── errors/                           # customer.errors.ts
    │   │   └── rules/                            # optional: pure logic across several models
    │   └── repositories/
    │       ├── customer.repository.ts            # abstract class (port + DI token)
    │       └── dataverse/
    │           ├── dataverse-customer.repository.ts
    │           ├── mappers/customer.table-mapper.ts  # Table ↔ Domain
    │           ├── tables/customer.table.ts      # CUSTOMER_TABLE + CustomerTableRow
    │           └── queries/customer.query.ts     # CUSTOMER_COLUMNS (+ CUSTOMER_EXPAND)
    └── orders/
        └── … same shape; depends on customers via its exported CustomerRepository
```

More cases (a feature with many services, a service that uses several repositories, a feature without rules, adding PostgreSQL, tests) are in [`structure.md`](structure.md).

### Why this shape

| Choice | Reason |
| --- | --- |
| `modules/<feature>/<folder>/` (feature first) | a change to "customers" stays inside one folder; familiar NestJS folder names keep responsibilities visible |
| `core/` instead of `shared/` | matches the existing code; holds *technical* infrastructure only. Business concepts shared by features belong to a feature module that exports them. |
| two kinds of mapper, in two places | `CustomerTableMapper` (Table ↔ Domain) in `repositories/dataverse/`; `CustomerResponseMapper` (Domain → Response DTO) in `mappers/`. The notes' root-level `mappers/user.mapper.ts` mixed HTTP→Input and Domain→Response in one class. |
| `dto/` holds request schemas **and** response DTO types | both are HTTP shapes; the word "schema" is reserved for Zod |
| `tables/<entity>.table.ts` + `queries/<entity>.query.ts`, never "schema" | "schema" already means Zod in `dto/`; `tables/` says what Dataverse returns, `queries/` what we ask for |
| `domain/enums/`, `models/`, `errors/`, `rules/`, one type per file | each file changes for one reason; option sets and error codes are always enum members |
| `<verb>-<entity>.input.ts` next to its service, no top-level `inputs/` folder | the Input belongs to one service; keeping it beside the service keeps the operation in one place |
| `repositories/dataverse/` (not `crm/`) | names the actual technology; a future `repositories/postgres/` sits next to it with the same file names |
| one file per service | see chapter 8 |

Small features may collapse: a read-only lookup feature can have `controllers/` + `dto/` + `mappers/` + `services/` + `repositories/` and no `domain/`.

---

## 15. End-to-end flows

### `POST /customers`

```text
POST /customers  { firstName, lastName, email, birthDate }
  1 zodBody(createCustomerSchema)          shape check → 422 with field errors if invalid
  2 CustomersController.create             builds CreateCustomerInput (string date → Date)
  3 CreateCustomerService.execute
      3a Customer.create(…, today)         lowercases email; adult rule → CustomerMustBeAdultError (422)
      3b customers.findByEmail(email)      abstract repository
           DataverseCustomerRepository     GET contacts?$select=…&$filter=emailaddress1 eq '…'&$top=1
           DataverseClient                 token (MSAL), retry on 401, normalise errors
           CustomerTableMapper.toDomain          if found → EmailAlreadyInUseError (409)
      3c customers.create(customer)        POST contacts { contactid: <our GUID>, firstname, … }
  4 CustomerResponseMapper.toResponse      { id, fullName, email, status }
  5 201 Created
```

Failure paths:

| Where | What | HTTP |
| --- | --- | --- |
| 1 | malformed body | 422 (validation pipe) |
| 3a | under 18 | 422 `CUSTOMER_MUST_BE_ADULT` |
| 3b | email exists | 409 `EMAIL_ALREADY_IN_USE` |
| 3c | concurrent duplicate caught by the alternate key | 409, once the repository translates the duplicate-key error (needs the Dataverse error code; chapter 11 gap #3). Until then, 502. |
| 3b/3c | Dataverse throttled | 503 |
| 3b/3c | Dataverse down / misconfigured | 502 |

### `GET /customers/:customerId/overview`

```text
  zodParam(z.guid())                       400 if not a GUID
  CustomerOverviewController.get
  GetCustomerOverviewService.execute
      Promise.all:
        customers.findById      → GET contacts(<id>)?$select=…            (404 → null)
        orders.findRecentByCustomer → GET new_orders?$filter=_new_customerid_value eq <id>&$orderby=createdon desc&$top=5
      customer null → CustomerNotFoundError (404)
  CustomerOverviewResponseMapper.toResponse → { profile: { id, displayName }, recentOrders: [...] }
```

---

## 16. Testing strategy

| What | How | Survives a migration to PostgreSQL? |
| --- | --- | --- |
| Domain (`Customer`, `Order`) | plain unit tests, no Nest | yes, unchanged |
| Services | unit tests with **in-memory fakes** of the abstract repositories | yes, unchanged |
| Response mappers / controllers | unit tests or e2e with fake repositories | yes |
| Table-mappers (`mappers/customer.table-mapper.ts`) | pure unit tests: table row JSON in, domain out (nulls, unknown choices) | removed with `repositories/dataverse/` |
| Dataverse repositories | unit tests with a mocked `DataverseClient`: check filters, `$select`, 404 → null | removed with `repositories/dataverse/` |
| **Repository contract tests** | one shared test suite run against every implementation of an abstract repository | **yes, and this is what proves the new repository behaves like the old one** |

An in-memory fake is just another implementation:

```ts
class InMemoryCustomerRepository extends CustomerRepository {
  readonly items = new Map<string, Customer>();

  async findById(id: string) {
    return this.items.get(id) ?? null;
  }

  async findByEmail(email: string) {
    return [...this.items.values()].find((c) => c.email === email) ?? null;
  }

  async create(customer: Customer) {
    this.items.set(customer.id, customer);
  }
}

it('rejects a duplicate email', async () => {
  const repo = new InMemoryCustomerRepository();
  const service = new CreateCustomerService(repo);
  await service.execute(input);

  await expect(service.execute(input)).rejects.toBeInstanceOf(
    EmailAlreadyInUseError,
  );
});
```

> ⚠️ **Tooling note for this repository.** NestJS 12 packages are ESM-only (`"type": "module"`). With the current `jest.config.ts` (ts-jest, CommonJS), any test that imports `@nestjs/common`, including a service decorated with `@Injectable()`, fails with "Must use import to load ES Module". Domain tests are unaffected. Fix the Jest setup (ESM mode or a transform for `@nestjs/*`) before writing the first service test.

---

# Part VI: The future

## 17. Adding PostgreSQL / SQL Server repositories

A relational repository is **another implementation of the same abstract repository**, in its own folder with **the same file names**: its own `tables/`, `queries/` and table-mapper.

```text
customers/repositories/
├── dataverse/   dataverse-customer.repository.ts   tables/customer.table.ts   queries/customer.query.ts   mappers/customer.table-mapper.ts
└── postgres/    postgres-customer.repository.ts    tables/customer.table.ts   queries/customer.query.ts   mappers/customer.table-mapper.ts
```

### Schema (PostgreSQL)

```sql
CREATE TABLE customers (
  id          uuid PRIMARY KEY,              -- same GUIDs as Dataverse contactid
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  email       text NOT NULL CONSTRAINT customers_email_key UNIQUE,
  birth_date  date,
  status      smallint NOT NULL CHECK (status IN (0, 1))  -- CustomerStatus (= the CRM statecode values)
);
```

Option-set enums keep the CRM values, so the relational column stores the same numbers and no translation table is needed.

### PostgreSQL repository (with `pg`)

```ts
import { Injectable } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';

interface CustomerTableRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string | null; // selected as text: "YYYY-MM-DD"
  status: number; // → CustomerStatus via optionSetValue in the table-mapper
}

const COLUMNS =
  'id, first_name, last_name, email, birth_date::text AS birth_date, status';

@Injectable()
export class PostgresCustomerRepository extends CustomerRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async findById(id: string): Promise<Customer | null> {
    const { rows } = await this.pool.query<CustomerTableRow>(
      `SELECT ${COLUMNS} FROM customers WHERE id = $1`,
      [id],
    );
    return rows[0] ? CustomerTableMapper.toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const { rows } = await this.pool.query<CustomerTableRow>(
      `SELECT ${COLUMNS} FROM customers WHERE email = $1`,
      [email],
    );
    return rows[0] ? CustomerTableMapper.toDomain(rows[0]) : null;
  }

  async create(customer: Customer): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO customers (id, first_name, last_name, email, birth_date, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          customer.id,
          customer.firstName,
          customer.lastName,
          customer.email,
          customer.birthDate?.toISOString().slice(0, 10) ?? null,
          customer.status,
        ],
      );
    } catch (error) {
      if (
        error instanceof DatabaseError &&
        error.code === '23505' &&
        error.constraint === 'customers_email_key'
      ) {
        throw new EmailAlreadyInUseError(customer.email);
      }
      throw error;
    }
  }
}
```

Corrections to the notes' PostgreSQL / Oracle snippets:

- `pool.query()` returns a `QueryResult`, not a row. The notes' `if (!row)` is never true, so "not found" would never return `null`. Use `rows[0]`. The same applies to Oracle (`result.rows`).
- `pg` parses `date` columns into JS `Date` at **local** midnight, which shifts dates across time zones. Select `birth_date::text` and parse it the same way as Dataverse's date-only strings.
- Translate the unique-violation (`23505`) into the same `EmailAlreadyInUseError` the Dataverse repository produces. This is what keeps behaviour identical behind the abstract repository.

### SQL Server repository (with `mssql`), differences only

```ts
const result = await this.pool
  .request()
  .input('id', sql.UniqueIdentifier, id)
  .query<CustomerTableRow>(
    `SELECT id, first_name, last_name, email,
            CONVERT(char(10), birth_date, 23) AS birth_date, status
     FROM customers WHERE id = @id`,
  );
const row = result.recordset[0];
```

- Unique violations are error numbers **2627** (constraint) / **2601** (unique index) on `sql.RequestError`.
- SQL Server returns `uniqueidentifier` values in **upper case**; Dataverse and PostgreSQL use lower case. Normalise ids (`id.toLowerCase()`) in `mappers/customer.table-mapper.ts`, or id comparisons across sources will fail.
- String comparison is case-insensitive under the default collation (like Dataverse), but case-sensitive in PostgreSQL. Lowercasing emails in the domain (`Customer.create`) makes all three behave the same.

### ORM or no ORM later?

Not decided now, and not needed now. The port allows any of `pg`/`mssql` directly, a query builder (Kysely supports both PostgreSQL and SQL Server dialects), or an ORM. If an ORM is chosen, its entity classes are **persistence models in `repositories/postgres/`**. They never replace the domain model (chapter 6).

---

## 18. Migration scenario: Dataverse → PostgreSQL

**Scenario.** The business decides customers and orders should live in PostgreSQL. CRM staff stop using Dataverse for orders, but still use it for customers for six months.

### Step by step

| # | Question | Answer |
| --- | --- | --- |
| 1 | Which interfaces remain unchanged? | `CustomerRepository`, `OrderRepository` (abstract repositories), all `Input`/`Result` types. |
| 2 | Which implementation is replaced? | `DataverseOrderRepository` → `PostgresOrderRepository` first; later `DataverseCustomerRepository` → `PostgresCustomerRepository`. |
| 3 | Which mapper changes? | none is *changed*: `repositories/dataverse/mappers/order.table-mapper.ts` is deleted and `repositories/postgres/mappers/order.table-mapper.ts` is added. Response mappers are untouched. |
| 4 | Which modules remain unchanged? | `domain/`, `services/`, `controllers/`, `dto/`, `mappers/`, `core/validation`, `BusinessErrorFilter`. Feature modules change **one provider line** (and their technology import). |
| 5 | Which tests remain useful? | all domain and service tests; e2e tests with fakes; **repository contract tests**, which now run against `PostgresOrderRepository` too. |
| 6 | Which CRM-specific code can be removed? | `repositories/dataverse/` of migrated features; eventually `core/dataverse`, `DataverseExceptionFilter`, MSAL config and `DV_*` env vars. |
| 7 | Which new database code is needed? | connection module (pool, config, health check), schema migrations, row types, row mappers, repositories, a DB-error filter for unexpected failures, transaction support where needed. |
| 8 | Is data migration or synchronisation needed? | **Yes.** A one-off export/import of existing records. While Dataverse remains the system of record for customers, either orders reference customers across systems (no foreign key), or customers are **synchronised** into PostgreSQL (for example via Dataverse change tracking or Azure Synapse Link). Choose deliberately; dual writes from the app are fragile. |
| 9 | What happens to CRM ids and relationships? | Because ids are GUIDs generated or accepted as-is, **keep them as `uuid` primary keys**. No remapping table is needed, and URLs/clients holding ids keep working. Lookups become foreign keys (`_new_customerid_value` → `orders.customer_id`). Choice integers become text/enum values. |
| 10 | Which decisions today make this easier or harder? | see below |

**Decisions that make migration easier (all recommended above):** GUID string ids generated by the app; domain models free of CRM names and integers; repositories taking and returning domain objects; cursor-based pagination in abstract repositories; email normalisation in the domain; errors translated to `BusinessError` in repositories; repository contract tests.

**Decisions that make it harder:** services calling `DataverseClient` directly; OData strings or `$expand` options in abstract repository signatures; `CustomerTableRow` used outside `repositories/dataverse/`; offset pagination promised to the frontend; relying on CRM plugins/flows for business rules without documenting them.

### Hidden costs no abstraction removes

> **An abstraction can reduce application-level coupling, but it cannot make two fundamentally different data platforms behave identically without trade-offs.**

- **Logic living in Dataverse** (plugins, business rules, real-time and background workflows, Power Automate flows, calculated/rollup columns, auditing, duplicate detection) is invisible to the application but part of the system. It must be inventoried and re-implemented, or consciously dropped.
- **Other consumers** of the CRM (sales staff, reports, other integrations) do not use your ports. Moving data away from them is a business project, not a refactor.
- **Security model:** Dataverse security roles, teams and record ownership become application-level authorisation.
- **Semantics:** transactions become available (and will be used, which changes abstract repositories, for example multi-aggregate writes); paging changes from `nextLink` to keyset; case-sensitivity and date handling differ.
- **Performance profile flips:** chatty-call optimisations (`$expand`, `Promise.all`) become less important; N+1 queries and indexes become the concern.

### Running both: when is it justified?

The notes suggest `USER_DATA_SOURCE=crm|postgres`. Supporting both for the **same** aggregate in production is rarely worth it. It means two sets of data that can diverge. Justified uses:

- **per-aggregate migration** (orders on PostgreSQL, customers still on Dataverse): different abstract repositories, different implementations. This needs no runtime switch, only different `useClass` lines.
- **a short cut-over window** with a feature flag and a rollback plan (`CustomersModule.register(...)`, chapter 13).
- **tests/local development** with in-memory repositories.

---

## 19. What changes where (corrected change-impact table)

| Change | Where you edit | Untouched |
| --- | --- | --- |
| Dataverse renames/replaces a column (`emailaddress1` → custom column) | `CustomerTableRow`, `CUSTOMER_COLUMNS`, `CustomerTableMapper` | everything else |
| A choice value is added in Dataverse | `OrderTableMapper` (+ domain `OrderStatus` if the business uses it) | controllers, abstract repositories |
| Dataverse URL / API version / credentials | env vars, `core/dataverse/dataverse.providers.ts` | all features |
| Auth method changes (secret → certificate / managed identity) | `core/dataverse` (`TokenProvider` implementation) | all features |
| New throttling / retry policy | `core/dataverse/policies` | all features |
| API response shape changes for the frontend | `mappers/` + `dto/` response DTO | domain, services, repositories |
| HTTP request shape changes | `dto/` Zod schema + controller's input building | services, domain, repositories |
| Business rule changes | `domain/` or `services/` | repositories, controllers (unless it exposes new data) |
| Business concept changes (`name` → `firstName` + `lastName`) | domain, table-mapper and response mapper, possibly DTOs | repository method names usually stay |
| Customer storage moves to PostgreSQL | new `repositories/postgres/`, one provider line, data migration | domain, services, controllers |
| A second CRM replaces Dataverse | new `repositories/<crm>/`, new `core/<crm>/` | domain, services, controllers |

The point is not that nothing changes. **Each kind of change has one obvious place to go.** The notes say exactly this, and it is correct.

---

## 20. Final mental model

```text
NestJS is the application framework.          It hosts controllers, DI, pipes, filters.

Domain models hold business rules.            Customer.create(), canPlaceOrder(). Plain TypeScript.

Services run one operation each.             Load via abstract repositories, apply rules, save, return a Result.

Repositories (abstract) state the needs.      repositories/<entity>.repository.ts, in domain terms.

repositories/dataverse/ talks to Dataverse.   DataverseCustomerRepository + CustomerTableRow + CustomerTableMapper.

Dataverse is an external platform.            Remote, authenticated, throttled, shared with other writers,
                                              with its own rules. Not "a database".

Dataverse connection concerns live once.      core/dataverse: MSAL, DataverseClient, retry, DataverseException.

Mapping happens at both edges.                Table ↔ domain (CustomerTableMapper, repositories/dataverse/);
                                              domain → response DTO (CustomerResponseMapper, mappers/).

Errors are translated at each boundary.       DataverseException → null / BusinessError → HTTP status.

PostgreSQL / SQL Server can be added later.   repositories/postgres/ behind the same abstract class. The data, the platform logic
                                              and the semantics still need a real migration plan.

Business logic never imports Dataverse, MSAL, OData, SQL, or an ORM.
```

Short version of the notes' closing rule, kept because it is right:

> **Domain knows the business. Services know the operations. Abstract repositories know the contract. `repositories/dataverse/` knows Dataverse. Table-mappers and response mappers know translation. MSAL knows authentication. Controllers know HTTP.**
>
> **Change the data source behind the repository, not inside the business logic.**
