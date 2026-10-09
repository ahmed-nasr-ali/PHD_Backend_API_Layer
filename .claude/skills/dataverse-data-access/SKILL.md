---
name: dataverse-data-access
description: How to read and write Microsoft Dataverse (Dynamics 365 CRM) data in this NestJS project through repositories/dataverse/. Covers tables/ (one row shape per CRM table), queries/ ($select columns + $expand), mappers/ (<entity>.table-mapper.ts: Table ↔ Domain), Dataverse repositories, $select/$filter/$expand, safe OData filters with odataString, option sets mapped to domain enums with optionSetValue, lookups and @odata.bind, null handling, pagination via nextLink, translating DataverseException, and the shared core/dataverse client with MSAL auth. Use when implementing or changing a Dataverse repository, table, query or table-mapper, querying a Dataverse table, handling Dataverse errors, or touching src/core/dataverse.
---

# Dataverse Data Access

## Purpose

Keep everything Dataverse-specific (table names, column names, OData, lookups, auth, errors) inside `repositories/dataverse/` and `core/dataverse`, and hand services clean domain objects. Option-set values reach the domain only as members of domain enums.

## When to use

- Implementing a `Dataverse<Entity>Repository`, a file in `tables/`, `queries/` or `mappers/` (`<entity>.table-mapper.ts`)
- Querying, paging or expanding Dataverse data
- Handling Dataverse failures
- Changing `src/core/dataverse`

Related: `repository-design` (designing the abstract repository this implements), `nestjs-feature-architecture` (folders, errors).

## Prerequisites

`src/core/dataverse` (exists) exports, via `index.ts`:

```ts
abstract class DataverseClient {
  retrieve<T>(table: string, id: string, select?: string[]): Promise<T>;            // 404 → throws DataverseException
  retrieveMultiple<T>(table: string, query?: DataverseQuery): Promise<T[]>;        // first page only (see querying.md)
  create(table: string, data: object): Promise<string>;                               // returns the new id
  createAndRetrieve<T>(table: string, data: object, select: string[]): Promise<T>;  // returns the saved row, same request
  update(table: string, id: string, data: object): Promise<void>;
  updateAndRetrieve<T>(table: string, id: string, data: object, select: string[]): Promise<T>; // same
  delete(table: string, id: string): Promise<void>;
}
interface DataverseQuery { select?: string[]; filter?: string; orderBy?: string[]; top?: number; expand?: DataverseExpand[] }
interface DataverseExpand { property: string; select?: string[]; expand?: DataverseExpand[] }  // nested $expand
class DataverseException extends Error { status?: number }                         // cause preserved
const odataString: (value: string) => string;                                       // 'O''Brien': escaped OData literal
const optionSetValue: <E>(optionSet: E, value: number | null) => E[keyof E] | null; // enum member or null
```

When the service needs the record after a write (e.g. to return it), use `createAndRetrieve` / `updateAndRetrieve` with the query's `<ENTITY>_COLUMNS`: Dataverse sends the saved row back in the same request (`Prefer: return=representation`), so values set by CRM plugins are included and no second `retrieve` is needed. Map the row with `toDomain`, like a read.

The client handles MSAL client-credentials tokens, refreshes and retries once on 401, and normalises all failures to `DataverseException`. `table` is the **entity set name** (`contacts`, `com_invitationrequests`).

## Core concept

Dataverse is **an external platform, not a database**: remote HTTPS calls, OAuth, throttling, server-driven paging, its own business logic, and other people writing the same data. See [crm-vs-database.md](crm-vs-database.md).

```text
modules/customers/repositories/
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

```text
Service → CustomerRepository (abstract)
             └─ DataverseCustomerRepository ── CustomerTableMapper ── CustomerTableRow
                   └─ DataverseClient (core) → Dataverse Web API
```

## Mental model

`repositories/dataverse/` is a translator. It speaks OData and Dataverse naming on one side and the domain language on the other. Nothing Dataverse-shaped reaches `services/`.

## Recommended approach

Per feature, under `modules/<feature>/repositories/dataverse/`:

1. `tables/<entity>.table.ts`: the table name constant (`CUSTOMER_TABLE = 'contacts'`) and the row type as the Web API returns it (`CustomerTableRow`). Each related table read through an `$expand` gets its own file, prefixed with the entity whose query returns it (`tables/invitation-compound.table.ts` → `InvitationCompoundTableRow`): it holds only the columns that query selects. If writes need a different shape (lookups), add `<Entity>TableWriteRow` in the same file.
2. `queries/<entity>.query.ts`: `<ENTITY>_COLUMNS` (`$select`) and, when related data is needed, `<ENTITY>_EXPAND` (`$expand`).
3. `mappers/<entity>.table-mapper.ts`: `toDomain(row)` (via `Entity.restore`, option sets through `optionSetValue`) and `toTableRow(entity)` when the feature writes. See [mapping.md](mapping.md).
4. `dataverse-<entity>.repository.ts`: `extends` the abstract repository, injects `DataverseClient`, translates expected errors. See [error-handling.md](error-handling.md).
5. Queries: explicit `$select`, filters escaped with `odataString`, cursor paging. See [querying.md](querying.md).

Files are named after the **business entity** (`customer.table.ts`); the real Dataverse table name appears once, as the constant inside it. The word "schema" is never used here: it is reserved for Zod in `dto/`.

## Example

```ts
// repositories/dataverse/tables/customer.table.ts
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
// repositories/dataverse/queries/customer.query.ts
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

```ts
// repositories/dataverse/dataverse-customer.repository.ts
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

A real example with a nested `$expand` (invitation → units → unit → compound) is `src/modules/invitations/repositories/dataverse/`.

## NestJS implementation notes

- The feature module imports `DataverseModule` and binds `{ provide: CustomerRepository, useClass: DataverseCustomerRepository }`.
- Never inject `DynamicsWebApi`, `ConfidentialClientApplication`, `TokenProvider` or `axios` in a feature. Only `DataverseClient`.
- If the client lacks something (paging, ETag), extend `DataverseClient` + `DynamicsWebApiClient` in `core/dataverse`. Don't bypass it.

## CRM considerations (summary)

- Use the real schema names from the Dataverse solution; verify a new query in the browser against the test environment (`…/api/data/v9.1/<entityset>?$select=…&$expand=…`) before coding it.
- All traffic runs as **one application user**: Dataverse security roles restrict the app, not the end user, so check end-user access in services. Throttling budgets are also shared.
- Data may break your rules: map with `restore()` and handle `null`s deliberately.
- Logic may run inside Dataverse (plugins, flows, business rules). Know what fires on your writes.

## PostgreSQL / SQL Server considerations

A migration adds `repositories/postgres/` with the **same file names** (`postgres-customer.repository.ts`, `tables/customer.table.ts`, `mappers/customer.table-mapper.ts`); the abstract repository and everything above it stays. Make the Dataverse repository's observable behaviour (null for not found, lower-cased emails, the same domain errors) easy to reproduce. See `repository-design` → contract tests.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `filter: \`emailaddress1 eq '${email}'\`` | `odataString(email)`; validate GUIDs before interpolating |
| No `$select` | always pass `<ENTITY>_COLUMNS` from `queries/` |
| `top` together with a nested one-to-many `$expand` | Dataverse rejects it (0x80060888); filter instead and drop `top` |
| Hard-coding `'contacts'` in several places | one `CUSTOMER_TABLE` constant in `tables/customer.table.ts` |
| Calling the table file a "schema" | `schema` means Zod in `dto/`; use `tables/<entity>.table.ts` |
| Columns, expand and row shapes in one file | row shapes in `tables/`, `$select`/`$expand` in `queries/` |
| A generic `CompoundTableRow` for a table read through an expand | prefix it with the querying entity (`InvitationCompoundTableRow`): it holds only that query's columns |
| Writing `fullname` / `createdon` | they are computed or read-only; write `firstname` / `lastname` |
| Setting a lookup as `new_customerid: id` | `'new_CustomerId@odata.bind': '/contacts(<guid>)'` |
| `row.com_to as InvitedAs` or a bare `=== 3` | `optionSetValue(InvitedAs, row.com_to)`; compare enum members |
| Writing `statuscode` without its `statecode` (or onto a record whose state doesn't allow it) | write the pair (`<Entity>State` + `<Entity>Status`); read `statecode` when a flow updates existing records |
| Filtering on a column the row type doesn't list, as a bare string | type it: `keyof <Entity>TableRow`, or a `<Entity>SearchColumns` interface in the table file for filter-only columns |
| Table-mapper next to the repository | `mappers/<entity>.table-mapper.ts` |
| `retrieve` 404 propagated as an error | `null` in the repository |
| `firstName ?? ''` everywhere without thinking | decide per field: nullable / documented default / fail loudly |
| Assuming `retrieveMultiple` returns all rows | it returns the first page only (see [querying.md](querying.md)) |
| Feature-level `CrmClient` / auth service | use `core/dataverse` |

## Decision rules

- Single-valued lookup data needed → `$expand` it or map just the id.
- Small child collection that is part of the aggregate → collection `$expand`; large or paged children → separate query.
- Multiple records must change atomically → one repository method implemented with a `$batch` changeset.
- An expected Dataverse failure with business meaning → translate it to a `BusinessError` in the repository; everything else → rethrow.

## Practical checklist

- [ ] `tables/` has one file per CRM table read, with the table constant and row types mirroring the Web API JSON (nullable where Dataverse allows; lookups that can be empty as `| null`)
- [ ] `queries/<entity>.query.ts` holds the `$select` columns (+ `$expand`), used for every read
- [ ] Table-mapper: `toDomain` uses `Entity.restore`; option sets via `optionSetValue` (unknown → `null`); lookups mapped; read-only columns never written
- [ ] Client-generated GUID sent as the primary key on create
- [ ] Filters escaped with `odataString`; GUIDs validated
- [ ] No `top` with a nested one-to-many `$expand`
- [ ] 404 → `null`; known conflicts → `BusinessError`; others rethrown
- [ ] Lists honour paging (cursor), not offsets
- [ ] Table-mapper unit-tested with real-looking JSON, including nulls and unknown option-set values
