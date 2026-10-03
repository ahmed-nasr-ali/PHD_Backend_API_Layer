---
name: dataverse-data-access
description: How to read and write Microsoft Dataverse (Dynamics 365 CRM) data in this NestJS project through repositories/dataverse/. Covers the <entity>.table.ts file (table name, columns, row shape), the <entity>.table-mapper.ts (Table ↔ Domain), Dataverse repositories, $select/$filter/$expand, safe OData filters, choices, lookups and @odata.bind, null handling, pagination via nextLink, translating DataverseException, and the shared core/dataverse client with MSAL auth. Use when implementing or changing a Dataverse repository, table or table-mapper, querying a Dataverse table, handling Dataverse errors, or touching src/core/dataverse.
---

# Dataverse Data Access

## Purpose

Keep everything Dataverse-specific (table names, column names, OData, choice integers, lookups, auth, errors) inside `repositories/dataverse/` and `core/dataverse`, and hand services clean domain objects.

## When to use

- Implementing a `Dataverse<Entity>Repository`, an `<entity>.table.ts` or an `<entity>.table-mapper.ts`
- Querying, paging or expanding Dataverse data
- Handling Dataverse failures
- Changing `src/core/dataverse`

Related: `repository-design` (designing the abstract repository this implements), `nestjs-feature-architecture` (folders, errors).

## Prerequisites

`src/core/dataverse` (exists) provides, via `DataverseModule`:

```ts
abstract class DataverseClient {
  retrieve<T>(table: string, id: string, select?: string[]): Promise<T>;            // 404 → throws DataverseException
  retrieveMultiple<T>(table: string, query?: DataverseQuery): Promise<T[]>;        // first page only (see querying.md)
  create(table: string, data: object): Promise<string>;
  update(table: string, id: string, data: object): Promise<void>;
  delete(table: string, id: string): Promise<void>;
}
interface DataverseQuery { select?: string[]; filter?: string; orderBy?: string[]; top?: number }
class DataverseException extends Error { status?: number }                         // cause preserved
```

The client handles MSAL client-credentials tokens, refreshes and retries once on 401, and normalises all failures to `DataverseException`. `table` is the **entity set name** (`contacts`, `new_orders`).

## Core concept

Dataverse is **an external platform, not a database**: remote HTTPS calls, OAuth, throttling, server-driven paging, its own business logic, and other people writing the same data. See [crm-vs-database.md](crm-vs-database.md).

```text
modules/customers/repositories/
├── customer.repository.ts                   abstract (what services see)
└── dataverse/
    ├── dataverse-customer.repository.ts     extends CustomerRepository, uses DataverseClient
    ├── customer.table.ts                    CUSTOMER_TABLE + CustomerTableRow + CUSTOMER_TABLE_COLUMNS
    └── customer.table-mapper.ts             CustomerTableMapper: Table ↔ Domain
```

```text
Service → CustomerRepository (abstract)
             └─ DataverseCustomerRepository ── CustomerTableMapper ── CustomerTableRow
                   └─ DataverseClient (core) → Dataverse Web API
```

## Mental model

`repositories/dataverse/` is a translator. It speaks OData and Dataverse naming on one side and the domain language on the other. Nothing Dataverse-shaped reaches `services/`.

## Recommended approach

Per feature, under `modules/<feature>/repositories/dataverse/`:

1. `<entity>.table.ts`: the table name constant (`CUSTOMER_TABLE = 'contacts'`), the row type as the Web API returns it (`CustomerTableRow`), and the `$select` column list (`CUSTOMER_TABLE_COLUMNS`). If writes need a different shape (lookups), add `<Entity>TableWriteRow`.
2. `<entity>.table-mapper.ts`: `toDomain(row)` (via `Entity.restore`) and `toTableRow(entity)`. See [mapping.md](mapping.md).
3. `dataverse-<entity>.repository.ts`: `extends` the abstract repository, injects `DataverseClient`, translates expected errors. See [error-handling.md](error-handling.md).
4. Queries: explicit `$select`, escaped filters, cursor paging. See [querying.md](querying.md).

The file is named after the **business entity** (`customer.table.ts`); the real Dataverse table name appears once, as the constant inside it.

## Example

```ts
// repositories/dataverse/customer.table.ts
/** Dataverse table (entity set) that stores customers. */
export const CUSTOMER_TABLE = 'contacts';

/** One row of the `contacts` table, exactly as the Dataverse Web API returns it. */
export interface CustomerTableRow {
  contactid: string;
  firstname: string | null;
  lastname: string | null;
  emailaddress1: string | null;
  birthdate: string | null; // Date-only column: "YYYY-MM-DD"
  statecode: number; // 0 = Active, 1 = Inactive
}

export const CUSTOMER_TABLE_COLUMNS: (keyof CustomerTableRow)[] = [
  'contactid',
  'firstname',
  'lastname',
  'emailaddress1',
  'birthdate',
  'statecode',
];
```

```ts
// repositories/dataverse/dataverse-customer.repository.ts
import { Injectable } from '@nestjs/common';
import { DataverseClient, DataverseException } from '../../../../core/dataverse';
import { odataString } from '../../../../core/dataverse/data-access/odata';
import { Customer } from '../../domain/customer';
import { CustomerRepository } from '../customer.repository';
import {
  CUSTOMER_TABLE,
  CUSTOMER_TABLE_COLUMNS,
  CustomerTableRow,
} from './customer.table';
import { CustomerTableMapper } from './customer.table-mapper';

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
        CUSTOMER_TABLE_COLUMNS,
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
        select: CUSTOMER_TABLE_COLUMNS,
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

`odataString` is a **proposed** helper. If `src/core/dataverse/data-access/odata.ts` doesn't exist yet, add it:

```ts
/** Quotes a value as an OData string literal, escaping embedded single quotes. */
export const odataString = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;
```

## NestJS implementation notes

- The feature module imports `DataverseModule` and binds `{ provide: CustomerRepository, useClass: DataverseCustomerRepository }`.
- Never inject `DynamicsWebApi`, `ConfidentialClientApplication`, `TokenProvider` or `axios` in a feature. Only `DataverseClient`.
- If the client lacks something (expand, paging, ETag), extend `DataverseClient` + `DynamicsWebApiClient` in `core/dataverse`. Don't bypass it.

## CRM considerations (summary)

- Use the real schema names from the Dataverse solution; `new_` in examples is a placeholder prefix.
- All traffic runs as **one application user**: Dataverse security roles restrict the app, not the end user, so check end-user access in services. Throttling budgets are also shared.
- Data may break your rules: map with `restore()` and handle `null`s deliberately.
- Logic may run inside Dataverse (plugins, flows, business rules). Know what fires on your writes.

## PostgreSQL / SQL Server considerations

A migration adds `repositories/postgres/` with the **same file names** (`postgres-customer.repository.ts`, `customer.table.ts`, `customer.table-mapper.ts`); the abstract repository and everything above it stays. Make the Dataverse repository's observable behaviour (null for not found, lower-cased emails, the same domain errors) easy to reproduce. See `repository-design` → contract tests.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `filter: \`emailaddress1 eq '${email}'\`` | `odataString(email)`; validate GUIDs before interpolating |
| No `$select` | always pass `<ENTITY>_TABLE_COLUMNS` |
| Hard-coding `'contacts'` in several places | one `CUSTOMER_TABLE` constant in `customer.table.ts` |
| Calling the table file a "schema" | `schema` means Zod in `dto/`; use `<entity>.table.ts` |
| Writing `fullname` / `createdon` | they are computed or read-only; write `firstname` / `lastname` |
| Setting a lookup as `new_customerid: id` | `'new_CustomerId@odata.bind': '/contacts(<guid>)'` |
| Choice integers or `statecode` in domain code | map to domain enums in the table-mapper |
| `retrieve` 404 propagated as an error | `null` in the repository |
| `firstName ?? ''` everywhere without thinking | decide per field: nullable / documented default / fail loudly |
| Assuming `retrieveMultiple` returns all rows | it returns the first page only (see [querying.md](querying.md)) |
| Feature-level `CrmClient` / auth service | use `core/dataverse` |

## Decision rules

- Single-valued lookup data needed → `$expand` it (once the client supports `expand`) or map just the id.
- Small child collection that is part of the aggregate → collection `$expand`; large or paged children → separate query.
- Multiple records must change atomically → one repository method implemented with a `$batch` changeset.
- An expected Dataverse failure with business meaning → translate it to an `ApplicationError` in the repository; everything else → rethrow.

## Practical checklist

- [ ] `<entity>.table.ts` has the table constant, a row type mirroring the Web API JSON (nullable where Dataverse allows), and the column list
- [ ] Column list used for every read
- [ ] Table-mapper: `toDomain` uses `Entity.restore`; choices/statecode/lookups mapped; read-only columns never written
- [ ] Client-generated GUID sent as the primary key on create
- [ ] Filters escaped/validated
- [ ] 404 → `null`; known conflicts → `ApplicationError`; others rethrown
- [ ] Lists honour paging (cursor), not offsets
- [ ] Table-mapper unit-tested with real-looking JSON, including nulls and unknown choice values
