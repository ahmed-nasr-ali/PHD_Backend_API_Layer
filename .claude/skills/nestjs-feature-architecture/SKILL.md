---
name: nestjs-feature-architecture
description: Folder structure and layer rules for NestJS feature modules in this Dataverse-backed project. Covers controllers/ dto/ services/ domain/ repositories/ mappers/ folders, the dependency rules, naming, one service class per operation, domain models with create/restore, BusinessError-based error flow, and module/DI wiring with abstract-class repository tokens. Use when creating a new feature module, adding a service, controller or domain model, wiring providers, deciding where a piece of code belongs, or reviewing a change for layer violations.
---

# NestJS Feature Architecture

## Purpose

Keep business logic independent of HTTP and of the data platform (Microsoft Dataverse today, possibly PostgreSQL or SQL Server later), so that each kind of change has exactly one place to go.

## When to use

- Creating a new feature under `src/modules/<feature>/`
- Adding a service, domain model, controller or provider
- Deciding which folder some code belongs in
- Reviewing code for layer violations

Related skills: `request-validation-and-dtos` (dto/, controllers/, mappers/), `dataverse-data-access` (repositories/dataverse/), `repository-design` (abstract repositories, tests, PostgreSQL/SQL Server repositories), `crm-to-relational-migration`.

## Prerequisites

- Existing building blocks:
  - `src/core/dataverse` (exports `DataverseModule`, `DataverseClient`, `DataverseException`)
  - `src/core/validation` (exports `zodBody`, `zodQuery`, `zodParam`)
  - `src/core/errors` (exports `BusinessError`, `BusinessErrorKind`, `ErrorCode`; framework-free)
  - `src/core/http` (exports `HttpModule`, the response envelope; global exception filters + `ResponseInterceptor`, already registered in `AppModule`). See [error-handling.md](error-handling.md).

## Core concept

```text
customers/
├── customers.module.ts
├── controllers/          HTTP endpoints
├── dto/                  Zod request schemas + response DTO types
├── mappers/              Domain → Response DTO
├── services/             one class per operation (use case)
├── domain/               enums/ · models/ · errors/ · rules/ (one type per file)
└── repositories/
    ├── customer.repository.ts      abstract class (the port)
    └── dataverse/                  repository + tables/ (row shapes) + queries/ ($select, $expand) + mappers/ (table-mappers)
```

Full tree and naming: [folder-structure.md](folder-structure.md).

| Folder | Layer | Must never import |
| --- | --- | --- |
| `domain/` | domain | `@nestjs/*`, `zod`, `core/dataverse`, `repositories/`, `services/` |
| `services/` | application | `controllers/`, `dto/`, `mappers/`, `repositories/dataverse/`, `core/dataverse` |
| `repositories/<entity>.repository.ts` | port | anything except `domain/` |
| `repositories/dataverse/` | infrastructure | `controllers/`, `dto/`, `mappers/`, `services/` |
| `controllers/`, `dto/`, `mappers/` | presentation | `repositories/`, `core/dataverse` |

Dependency direction: `controllers → services → domain`, and `services → repositories/<entity>.repository.ts ← repositories/dataverse/`.

## Mental model

Domain = business rules · Service = script for one operation · Repository (abstract) = job description ("I need someone who can find customers") · `repositories/dataverse/` = translator for Dataverse · Controller = receptionist who speaks HTTP.

## Recommended approach

1. **One service class per operation:** `<Verb><Entity>Service` in `services/<verb>-<entity>.service.ts`, with a single `execute(input)`. The Input type lives next to it in `services/<verb>-<entity>.input.ts`; a Result type (only when the service doesn't return a domain object) stays in the service file. No `CustomersService` with many methods.
2. **Domain models:** `domain/models/<entity>.model.ts` with its props in `<entity>.props.ts`; private constructor taking the props object, `static create()` (new objects, enforces rules), `static restore()` (from storage, trusted), `readonly` fields, `id: string` generated with `randomUUID()` in the service. Fixed value sets (CRM option sets, error codes) are enums in `domain/enums/`, one per file; option-set enums keep the CRM values. See [domain-models.md](domain-models.md).
3. **Repositories are abstract classes** in `repositories/<entity>.repository.ts`, used directly as DI tokens. Implementations live in `repositories/<tech>/`.
4. **Errors:** domain and services throw `BusinessError` subclasses from `domain/errors/<module>.errors.ts`, with codes from `domain/enums/<module>-error-code.enum.ts` (one of each per module, not per entity); never `Error`, never `HttpException`, never a hand-typed code string. See [error-handling.md](error-handling.md).
5. **Wiring:** [module-wiring.md](module-wiring.md).

## Example: a service

```ts
// modules/customers/services/create-customer.input.ts
export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date;
}
```

```ts
// modules/customers/services/create-customer.service.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EmailAlreadyInUseError } from '../domain/errors/customer.errors';
import { Customer } from '../domain/models/customer.model';
import { CustomerRepository } from '../repositories/customer.repository';
import type { CreateCustomerInput } from './create-customer.input';

@Injectable()
export class CreateCustomerService {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    const customer = Customer.create({ id: randomUUID(), ...input }, new Date());

    const existing = await this.customers.findByEmail(customer.email);
    if (existing) {
      throw new EmailAlreadyInUseError(customer.email);
    }

    await this.customers.create(customer);
    return customer;
  }
}
```

A service that needs several independent reads runs them in parallel, because Dataverse calls are remote round trips:

```ts
const [customer, recentOrders] = await Promise.all([
  this.customers.findById(input.customerId),
  this.orders.findRecentByCustomer(input.customerId, 5),
]);
if (!customer) {
  throw new CustomerNotFoundError(input.customerId);
}
return { customer, recentOrders };
```

## NestJS implementation notes

- `@Injectable()` on services is an accepted pragmatic coupling. The domain stays NestJS-free.
- Cross-feature use: the depending module imports the other module, which **exports its abstract repository** (`exports: [CustomerRepository]`). Put a cross-feature service in the module that already depends on the other. Never create circular imports.
- A service never calls another service. Shared logic goes into the domain model or a repository method.
- **Exception: one operation with a different flow per type** (e.g. register for six user types). The service hands the work to one **strategy** per type, picked by a factory; the strategies share small **helper** classes (a verifier, a registrar). They all live in `services/<operation>/` and are one use case, not services calling services. See [strategies.md](strategies.md).
- Global filters and the response interceptor are registered once in `src/core/http/http.module.ts` (imported by `AppModule`). Features never register filters and never build the response envelope; controllers return response DTOs.

## CRM considerations

- Services never touch `DataverseClient`, OData or Dataverse column names. Only `repositories/dataverse/` does (see `dataverse-data-access`).
- End-user authorisation ("may this caller see this customer?") belongs in services. Dataverse only sees the single application user.
- Data in Dataverse may violate your rules (CRM staff edit it), which is why `restore()` must not run creation rules.

## PostgreSQL / SQL Server considerations

Nothing in `domain/`, `services/`, `controllers/`, `dto/` or `mappers/` changes when storage changes. A new `repositories/postgres/` folder plus one `useClass` line is the change. See `crm-to-relational-migration`.

## Common mistakes

See [common-mistakes.md](common-mistakes.md). The top five:

1. Controller or service injecting `DataverseClient`.
2. `throw new Error('not found')`, or throwing `NotFoundException` from a service.
3. Returning a domain object directly from a controller.
4. String DI tokens (`'CustomerRepository'`) with `@Inject`.
5. A repository method accepting a service Input instead of a domain object.

## Decision rules

| Question | Answer |
| --- | --- |
| Rule about the object itself, true for every caller? | domain model method or `create()` |
| Rule needs stored data or the current user? | service |
| Pure logic across several domain objects, no I/O? | a plain function or class in `domain/` (rare) |
| Feature has no business rules (lookup lists)? | skip `domain/`; service + repository |
| Need a second implementation or a test fake? | that's a repository, so make it an abstract class |
| Anything else "for future flexibility"? | don't abstract it |

## Practical checklist

- [ ] Files are in the folders from [folder-structure.md](folder-structure.md)
- [ ] `domain/` imports nothing from NestJS, Zod or `core/dataverse`
- [ ] `domain/` split into `enums/`, `models/`, `errors/` (+ `rules/` when needed), one type per file (exception: an entity's `<Entity>Status` + `<Entity>State` share `<entity>-status.enum.ts`)
- [ ] Error codes and option-set values used through enum members, never bare strings/numbers
- [ ] One service per operation, `execute(input)`; Input type in `<verb>-<entity>.input.ts` next to it
- [ ] Nothing in `services/` imports `dto/` (strategies included)
- [ ] Per-type flows: strategies in `services/<operation>/strategies/<type>/`, factory keyed by `Record<Input['type'], Strategy>` (no `find` + `throw new Error`), see [strategies.md](strategies.md)
- [ ] Service depends only on abstract repositories and `domain/`
- [ ] A `statuscode` is written together with its `statecode`, and records in an inactive state are never silently reused
- [ ] Independent remote reads use `Promise.all`
- [ ] Errors extend `BusinessError` with a `kind` and `code`
- [ ] Repository bound with `{ provide: CustomerRepository, useClass: DataverseCustomerRepository }`; module exports the abstract class, not the implementation
- [ ] Controller returns a response DTO via a mapper
