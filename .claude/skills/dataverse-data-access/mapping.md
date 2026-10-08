# Table Mapping: Dataverse Rows ↔ Domain Models

## Where mapping happens

```text
Dataverse JSON ─► <Entity>TableRow ─► <Entity>TableMapper.toDomain ─► Entity.restore(...)   (read)
Entity ─► <Entity>TableMapper.toTableRow ─► Dataverse JSON                                (write)
```

The table-mapper lives in `modules/<feature>/repositories/dataverse/<entity>.table-mapper.ts` and is used only by the Dataverse repository. Row types live in `repositories/dataverse/tables/`. Response mapping (domain → HTTP) is a different mapper, in `mappers/<entity>-response.mapper.ts`.

| | `CustomerTableMapper` | `CustomerResponseMapper` |
| --- | --- | --- |
| Converts | Table ↔ Domain | Domain → Response DTO |
| Folder | `repositories/dataverse/` | `mappers/` |
| Changes when | Dataverse renames a column | the frontend wants a new JSON shape |
| Direction | both (read and write) | one way (response only) |

## Option sets

Option sets (choices, `statecode`, `statuscode`) are enums in `domain/enums/`, one per file, whose **values are the CRM values**. The table-mapper turns the row's number into an enum member with `optionSetValue` (from `core/dataverse`): an empty value or one the enum doesn't know becomes `null`, so a value added in the CRM later fails safely in the domain instead of passing as a wrong member. Writing back needs no translation: the member already is the CRM value.

## Customer example (standard `contacts` table)

```ts
// domain/enums/customer-status.enum.ts
/** Customer status: the CRM `statecode` of `contacts` (values are the CRM values). */
export enum CustomerStatus {
  Active = 0,
  Inactive = 1,
}
```

```ts
// repositories/dataverse/customer.table-mapper.ts
import { DataverseException, optionSetValue } from '../../../../core/dataverse';
import { CustomerStatus } from '../../domain/enums/customer-status.enum';
import { Customer } from '../../domain/models/customer.model';
import { CustomerTableRow } from './tables/customer.table';

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
      status: optionSetValue(CustomerStatus, row.statecode),
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

## Order example (custom table with a choice and a lookup)

```ts
// domain/enums/order-status.enum.ts
/** Order status: the CRM `new_status` choice (values are the CRM values). */
export enum OrderStatus {
  Draft = 100000000,
  Placed = 100000001,
  Cancelled = 100000002,
}
```

```ts
// repositories/dataverse/tables/order.table.ts
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
// repositories/dataverse/queries/order.query.ts
import { OrderTableRow } from '../tables/order.table';

/** Order columns to read ($select). */
export const ORDER_COLUMNS: (keyof OrderTableRow)[] = [
  'new_orderid',
  'new_status',
  'new_total',
  '_new_customerid_value',
];
```

```ts
// repositories/dataverse/order.table-mapper.ts
import { optionSetValue } from '../../../../core/dataverse';
import { CUSTOMER_TABLE } from '../../../customers/repositories/dataverse/tables/customer.table';
import { OrderStatus } from '../../domain/enums/order-status.enum';
import { Order } from '../../domain/models/order.model';
import { OrderTableRow, OrderTableWriteRow } from './tables/order.table';

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
      new_status: order.status,
      new_total: order.total,
      'new_CustomerId@odata.bind': `/${CUSTOMER_TABLE}(${order.customerId})`,
    };
  }
}
```

(Here `Order.status` is `OrderStatus` for a new order; the read side holds `OrderStatus | null` until the domain checks it.)

## Related tables read through an `$expand`

Each related table gets its own row type in `tables/`, prefixed with the entity whose query returns it, with only the columns that query selects, and `| null` where the lookup can be empty:

```text
tables/invitation.table.ts             com_invitationrequests  → InvitationTableRow
tables/invitation-unit-link.table.ts   com_invitationunits     → InvitationUnitLinkTableRow
tables/invitation-unit.table.ts        com_units               → InvitationUnitTableRow
tables/invitation-compound.table.ts    com_compounds           → InvitationCompoundTableRow
```

The table-mapper walks the nested rows and skips empty lookups (`flatMap` returning `[]`); business rules on the result (de-duplication, who sees what) stay in the domain.

## Rules

| Topic | Rule |
| --- | --- |
| Restoring | always `Entity.restore(...)`, never `Entity.create(...)` |
| Nulls | decide per field: nullable in domain · documented default · fail loudly (throw `DataverseException` → 502). Never invent business data silently. |
| Option sets / `statecode` / `statuscode` | domain enums with the CRM values, mapped with `optionSetValue`; unknown or empty → `null`, and the domain decides what that means. Never a bare number in code. |
| Lookups (read) | `_<lookup logical name>_value` → `xxxId: string` |
| Lookups (write) | `'<NavigationProperty>@odata.bind': '/<entityset>(<guid>)'`; the navigation property name is case-sensitive and may differ from the column name. Reuse the other feature's `<ENTITY>_TABLE` constant for the entity set. |
| Read-only / computed | never write `fullname`, `createdon`, `modifiedon`, rollups |
| Dates | date-only → `"YYYY-MM-DD"`, parse as UTC midnight; date-time → ISO UTC string (`createdon`) |
| Ids | lower-case GUID strings; send the domain id as the primary key on create |
| Formatted values | request `OData.Community.Display.V1.FormattedValue` only for display; never base logic on labels |
| ETag | if optimistic concurrency is needed, carry `@odata.etag` as an opaque `version` and send it as `If-Match` on update |
