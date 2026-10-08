# PostgreSQL / SQL Server Repositories

`pg` and `mssql` are not installed yet. These snippets show the target shape when a relational implementation is added.

## Layout: same file names as Dataverse, different folder

```text
modules/customers/repositories/
├── customer.repository.ts                    abstract (unchanged)
├── dataverse/
│   ├── dataverse-customer.repository.ts
│   ├── customer.table-mapper.ts
│   ├── tables/customer.table.ts              CUSTOMER_TABLE = 'contacts'
│   └── queries/customer.query.ts             CUSTOMER_COLUMNS ($select)
└── postgres/
    ├── postgres-customer.repository.ts
    ├── customer.table-mapper.ts
    ├── tables/customer.table.ts              CUSTOMER_TABLE = 'customers'
    └── queries/customer.query.ts             CUSTOMER_COLUMNS (SQL select list)
```

A `core/postgres` module (pool, config, health check) plays the role `core/dataverse` plays today.

## Schema (PostgreSQL)

```sql
CREATE TABLE customers (
  id          uuid PRIMARY KEY,              -- keep the Dataverse GUIDs
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  email       text NOT NULL CONSTRAINT customers_email_key UNIQUE,
  birth_date  date,
  status      smallint NOT NULL CHECK (status IN (0, 1))  -- CustomerStatus values (= the CRM statecode)
);
```

Option-set enums keep the CRM values, so the relational column stores the same numbers and the table-mapper still uses `optionSetValue`; no translation table is needed.

## `repositories/postgres/tables/customer.table.ts`

```ts
export const CUSTOMER_TABLE = 'customers';

export interface CustomerTableRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string | null; // selected as text: "YYYY-MM-DD"
  status: number;
}
```

## `repositories/postgres/queries/customer.query.ts`

```ts
export const CUSTOMER_COLUMNS =
  'id, first_name, last_name, email, birth_date::text AS birth_date, status';
```

## `repositories/postgres/postgres-customer.repository.ts` (`pg`)

```ts
import { Injectable } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { EmailAlreadyInUseError } from '../../domain/errors/customer.errors';
import { Customer } from '../../domain/models/customer.model';
import { CustomerRepository } from '../customer.repository';
import { CustomerTableMapper } from './customer.table-mapper';
import { CUSTOMER_COLUMNS } from './queries/customer.query';
import { CUSTOMER_TABLE, CustomerTableRow } from './tables/customer.table';

@Injectable()
export class PostgresCustomerRepository extends CustomerRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async findById(id: string): Promise<Customer | null> {
    const { rows } = await this.pool.query<CustomerTableRow>(
      `SELECT ${CUSTOMER_COLUMNS} FROM ${CUSTOMER_TABLE} WHERE id = $1`,
      [id],
    );
    return rows[0] ? CustomerTableMapper.toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const { rows } = await this.pool.query<CustomerTableRow>(
      `SELECT ${CUSTOMER_COLUMNS} FROM ${CUSTOMER_TABLE} WHERE email = $1`,
      [email],
    );
    return rows[0] ? CustomerTableMapper.toDomain(rows[0]) : null;
  }

  async create(customer: Customer): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO ${CUSTOMER_TABLE} (id, first_name, last_name, email, birth_date, status)
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

## SQL Server (`mssql`), differences

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

## Gotchas that break "same behaviour behind the abstract repository"

| Gotcha | Fix |
| --- | --- |
| `pool.query()` returns a result object, not a row (`if (!row)` is never true) | `rows[0]` (pg) / `recordset[0]` (mssql) |
| `pg` parses `date` to a JS `Date` at **local** midnight | select `::text` (pg) / `CONVERT(char(10), …, 23)` (mssql) and parse as UTC |
| SQL Server returns `uniqueidentifier` in **upper case** | lower-case ids in `customer.table-mapper.ts` |
| PostgreSQL `=` is case-sensitive; Dataverse/SQL Server default collation is not | the domain lower-cases emails on `create()` |
| Unique violation codes differ | pg `23505` (+ `constraint` name); mssql `RequestError.number` 2627 / 2601 → same `BusinessError` |
| Offset paging is tempting in SQL | keep the cursor contract (keyset pagination) |
| Transactions now exist | still expose atomicity via repository methods, not leaked transaction objects |

## ORM?

Undecided and not needed now. Plain drivers, a query builder (Kysely supports both PostgreSQL and SQL Server) or an ORM all fit behind the abstract repository. ORM entity classes would replace `tables/customer.table.ts` inside `repositories/postgres/`; they never replace domain models.
