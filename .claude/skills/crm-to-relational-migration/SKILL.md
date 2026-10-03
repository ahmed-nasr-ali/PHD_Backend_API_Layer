---
name: crm-to-relational-migration
description: Playbook for moving data storage in this NestJS project from Microsoft Dataverse (CRM) to PostgreSQL or SQL Server, or for running both during a transition. Covers what stays unchanged, what is replaced, data migration and synchronisation, keeping GUID ids, choices and lookups to relational columns, logic living inside Dataverse, and per-aggregate cut-over. Use when planning or executing a storage migration, evaluating a "support both data sources" request, or checking whether today's design keeps a migration cheap.
---

# CRM → Relational Database Migration

## Purpose

Make a Dataverse → PostgreSQL/SQL Server move a contained infrastructure project, and be honest about what the abstraction does **not** solve.

> An abstraction can reduce application-level coupling, but it cannot make two fundamentally different data platforms behave identically without trade-offs.

## When to use

- Planning or executing a migration of one or more aggregates
- Someone asks for `DATA_SOURCE=crm|postgres`
- Reviewing whether current code keeps a migration cheap

Related: `repository-design` (abstract repositories, PostgreSQL/SQL Server repositories, contract tests), `dataverse-data-access`.

## Prerequisites

Abstract repositories exist for the aggregates being moved, services depend only on them, and contract tests exist or will be written first.

## Core concept

```text
Today:   Service  → CustomerRepository → DataverseCustomerRepository → Dataverse
Later:   Service  → CustomerRepository → PostgresCustomerRepository  → PostgreSQL
                    (unchanged)          (new folder, one useClass line)
```

## Mental model

Swapping the translator is cheap. Moving the library (the data), retraining the librarians (logic living in the CRM) and telling the other readers (CRM users and integrations) is the real project.

## Recommended approach: per aggregate, step by step

| # | Step | Detail |
| --- | --- | --- |
| 1 | Inventory | Dataverse tables/columns used; **logic inside Dataverse** (plugins, business rules, real-time/background workflows, Power Automate flows, calculated/rollup columns, duplicate detection, auditing); other consumers (staff, reports, integrations); security roles/teams/ownership. |
| 2 | Contract tests | Run the repository contract suite against the Dataverse repository (test environment) to capture current behaviour. |
| 3 | Schema | Relational tables: `uuid` / `uniqueidentifier` PKs **keeping Dataverse GUIDs**; lookups → foreign keys; choices → text/enum with check constraints; alternate keys → `UNIQUE`; nullable where Dataverse data really is null. |
| 4 | Repository | `repositories/postgres/` with `customer.table.ts`, `customer.table-mapper.ts`, `postgres-customer.repository.ts` (same file names as `dataverse/`); `core/postgres` connection module; DB-error filter. The same contract tests must pass. |
| 5 | Re-implement platform logic | Everything from step 1 that must survive moves into `domain/` or `services/` (or DB constraints). |
| 6 | Data migration | One-off export/import (respect paging and throttling when reading Dataverse); verify counts and checksums. |
| 7 | Synchronisation (if Dataverse stays in use) | Decide the system of record per aggregate. If CRM staff keep editing, sync one way (Dataverse change tracking, Azure Synapse Link, or similar). Avoid app-level dual writes. |
| 8 | Cut-over | Switch the `useClass` line (or `Module.register(source)` behind a flag for a short window with a rollback plan). |
| 9 | Clean-up | Remove `repositories/dataverse/` for the aggregate; once nothing uses Dataverse, remove `core/dataverse`, `DataverseExceptionFilter`, `DV_*` config. |

## What stays, what changes

| Unchanged | Replaced / added | Removed (eventually) |
| --- | --- | --- |
| `domain/`, `services/` (+ `*.input.ts`), `controllers/`, `dto/`, `mappers/`, abstract repositories, `ApplicationErrorFilter`, domain/service/e2e tests, contract tests | `repositories/postgres/` (repository + table + table-mapper), connection module, migrations, DB error filter, one `useClass` line | `repositories/dataverse/` (repository + table + table-mapper), `core/dataverse`, MSAL config |

## Example: ids and relationships

| Dataverse | Relational |
| --- | --- |
| `contactid` (GUID) | `customers.id uuid` (same value; no remapping table) |
| `_new_customerid_value` | `orders.customer_id uuid REFERENCES customers(id)` |
| `new_status = 100000001` | `orders.status = 'placed'` (the domain value, not the integer) |
| `statecode 0/1` | `status 'active'/'inactive'` |
| `createdon` (platform-owned) | `created_at timestamptz DEFAULT now()` |

During a partial migration (orders in PostgreSQL, customers still in Dataverse), `orders.customer_id` cannot be a foreign key. Keep it a plain `uuid` and validate existence in the service via `CustomerRepository`.

## NestJS implementation

```ts
// Permanent per-aggregate split: no runtime switch needed
{ provide: OrderRepository, useClass: PostgresOrderRepository },       // orders module
{ provide: CustomerRepository, useClass: DataverseCustomerRepository }, // customers module
```

A runtime switch for the **same** aggregate is only for a short cut-over window. Use `CustomersModule.register(source)` (see `nestjs-feature-architecture` → `module-wiring.md`), never `useFactory` with `new`.

## CRM considerations

- Reading everything out of Dataverse hits paging (5,000 rows/page, `nextLink`) and throttling (429). Plan the export.
- CRM staff may keep using model-driven apps. Moving their data is a business decision, not a refactor.
- Dataverse security (roles, ownership, teams) becomes application authorisation logic.

## PostgreSQL / SQL Server considerations

- Transactions become available. Expose them through repository methods, not transaction objects.
- Paging moves from `nextLink` to keyset; keep the cursor contract.
- Case-sensitivity (PostgreSQL), upper-case GUIDs (SQL Server) and date parsing (`pg`) differ. See `repository-design` → `relational-repositories.md`.
- The performance profile flips: fewer worries about round trips, more about indexes and N+1 queries.

## Today's decisions that make this cheap (keep them)

GUID string ids generated by the app · domain free of CRM names and integers · repositories take/return domain objects · cursor pagination in abstract repositories · normalisation (lower-case email) in the domain · errors translated to `ApplicationError` in repositories · contract tests · Dataverse connection isolated in `core/dataverse`.

## Common mistakes

| Mistake | Consequence |
| --- | --- |
| Services calling `DataverseClient` | the migration rewrites business logic |
| OData strings / `DataverseQuery` in abstract repository signatures | abstract repositories must change |
| Offset paging promised to the frontend | can't be implemented on Dataverse today; locks the API |
| New integer ids in the relational DB | remapping tables; broken links held by clients |
| Forgetting plugins/flows/rollups | silent loss of behaviour |
| App-level dual writes to both stores | divergence on partial failures |
| Treating the migration as "change one line" | data, sync, security and logic are left unplanned |

## Decision rules

- Move **one aggregate at a time**.
- A runtime switch for the same aggregate is only for a short cut-over with rollback.
- If Dataverse remains in use by staff, decide the system of record and sync **one way**.
- No migration step goes ahead without contract tests passing on the new repository.

## Practical checklist

- [ ] Inventory of Dataverse-side logic and consumers done
- [ ] Contract tests green on Dataverse (test env) and on the new repository
- [ ] Schema keeps GUIDs; choices mapped to domain values; constraints for real invariants
- [ ] Data migrated and verified; sync in place if needed
- [ ] Platform logic re-implemented or explicitly dropped
- [ ] Provider switched; rollback plan exists
- [ ] Dataverse code for the aggregate removed after stabilisation
