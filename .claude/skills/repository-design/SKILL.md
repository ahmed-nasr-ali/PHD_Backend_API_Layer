---
name: repository-design
description: Designing repositories in this NestJS project so that services and domain logic are independent of Dataverse today and PostgreSQL or SQL Server later. Covers the abstract repository in repositories/<entity>.repository.ts (the port), implementations in repositories/<tech>/, what to abstract and what not to, method design from service needs, aggregates, cursor pagination, in-memory fakes, repository contract tests, and PostgreSQL/SQL Server implementations (pg / mssql). Use when adding or changing a repository or one of its methods, writing service tests, or adding a PostgreSQL/SQL Server implementation of an existing repository.
---

# Repository Design

## Purpose

Draw one practical boundary around data access, the abstract repository, so that services and domain logic don't depend on Dataverse, OData, SQL or an ORM. Avoid any abstraction beyond that.

## When to use

- Adding a repository or a method on one
- Writing tests for services
- Implementing a second repository (in-memory, PostgreSQL, SQL Server)

Related: `dataverse-data-access` (the current implementation), `crm-to-relational-migration` (the bigger move), `nestjs-feature-architecture`.

## Prerequisites

- Domain models with `create()` / `restore()` (see `nestjs-feature-architecture` → `domain-models.md`).
- Folder layout:

```text
modules/customers/repositories/
├── customer.repository.ts              abstract class (the port, DI token)
├── dataverse/                          implementation for Dataverse (today)
│   ├── dataverse-customer.repository.ts
│   ├── mappers/customer.table-mapper.ts
│   ├── tables/customer.table.ts
│   └── queries/customer.query.ts
└── postgres/                           implementation for PostgreSQL (later, same file names and folders)
```

## Core concept

The **abstract repository** is a contract owned by the services: "what I need", in domain terms. Each **implementation** fulfils it for one technology.

```text
                 CustomerRepository (abstract class)
             ┌──────────────┼───────────────────┐
DataverseCustomerRepository   PostgresCustomerRepository   InMemoryCustomerRepository
        (today)                    (maybe later)                (tests)
```

## Mental model

The abstract repository is a job description; implementations are candidates who can each do the job in their own language. The service only reads the job description.

## Recommended approach

```ts
// repositories/customer.repository.ts
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

### Design rules

| Rule | Example |
| --- | --- |
| Name methods after service needs | `findRecentByCustomer(customerId, limit)` |
| Domain types in and out | `create(customer: Customer)`, never a service Input or a `CustomerTableRow` |
| `null` for "not found" on single lookups | the service decides whether absence is an error |
| No technology in signatures | no OData strings, `$expand` options, `DataverseQuery`, SQL fragments, ORM types |
| Cursor pagination | `Promise<Page<T>>` with `{ items, nextCursor }`; Dataverse can't do offsets |
| One repository per aggregate | `CustomerRepository`, `OrderRepository`; not per table, not one `CrmRepository` |
| Atomic multi-object writes as one method | `createWithLines(order)`; no generic transaction API |
| Abstract class, `extends` in implementations | doubles as the DI token |

### What to abstract and what not to

| Abstract | Don't abstract |
| --- | --- |
| storage of each aggregate (abstract repositories) | `DataverseClient` usage inside `repositories/dataverse/` |
| other external capabilities the app truly needs (when they exist) | generic `BaseRepository<T>` / `IRepository<T>` |
| | query languages ("universal query builder") |
| | Unit of Work / transactions, until a real multi-aggregate atomic write exists |
| | anything "just in case" |

## Example: aggregate boundaries

- `Order` has its own lifecycle, so it gets `OrderRepository`, and `PlaceOrderService` uses both repositories.
- Lines that only exist inside an order and always change with it are part of the `Order` aggregate: `OrderRepository.findById` returns them, and the implementation uses `$expand` or a second query internally.

## NestJS implementation

`{ provide: CustomerRepository, useClass: DataverseCustomerRepository }` in the feature module; `exports: [CustomerRepository]` if other features need it. Consumers inject the abstract class without `@Inject`.

## CRM considerations

The abstract repository is the reason Dataverse quirks (OData, choices, nextLink, 404 handling) don't spread. If a Dataverse limitation tempts you to change the abstract repository (offset paging, filter strings), keep it in domain terms and solve the problem in `repositories/dataverse/` or `core/dataverse`.

## PostgreSQL / SQL Server considerations

See [relational-repositories.md](relational-repositories.md). New implementations must reproduce the **observable behaviour** of the existing one: `null` for not found, the same `BusinessError`s for conflicts, the same normalisation. Contract tests enforce this ([testing.md](testing.md)).

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `getFromCrm()`, `getFromPostgres()` on the abstract repository | methods describe needs, not sources |
| `findAll(filter: string)` taking OData/SQL | typed parameters: `findByStatus(status, cursor)` |
| `repository.create(input)` / `save(input)` | pass the domain object |
| `findPage(page, pageSize)` | `findPage(cursor, limit)` returning `Page<T>` |
| Abstract repository in `domain/` in one feature and `repositories/` in another | always `repositories/<entity>.repository.ts` |
| Mocking `DataverseClient` to test a service | fake the abstract repository instead |

## Decision rules

- New query need → add a named method to the abstract repository (not a generic query method).
- A method only one implementation can do efficiently → rethink it in business terms first; if it is genuinely needed, implement it everywhere, possibly less efficiently.
- Need atomicity across aggregates → first question the boundary; then a dedicated repository method; a Unit of Work only when several services need it.

## Practical checklist

- [ ] Abstract class in `repositories/<entity>.repository.ts`
- [ ] Every method uses domain types and has a needs-based name
- [ ] No technology types or strings in signatures
- [ ] Lists are cursor-paged
- [ ] An in-memory fake exists for service tests
- [ ] Contract tests cover every implementation
