# Table Mapping: Dataverse Rows ↔ Domain Models

## Where mapping happens

```text
Dataverse JSON ─► <Entity>TableRow ─► <Entity>TableMapper.toDomain ─► Entity.restore(...)   (read)
Entity ─► <Entity>TableMapper.toTableRow ─► Dataverse JSON                                (write)
```

The table-mapper lives in `modules/<feature>/repositories/dataverse/<entity>.table-mapper.ts` and is used only by the Dataverse repository. Response mapping (domain → HTTP) is a different mapper, in `mappers/<entity>-response.mapper.ts`.

| | `CustomerTableMapper` | `CustomerResponseMapper` |
| --- | --- | --- |
| Converts | Table ↔ Domain | Domain → Response DTO |
| Folder | `repositories/dataverse/` | `mappers/` |
| Changes when | Dataverse renames a column | the frontend wants a new JSON shape |
| Direction | both (read and write) | one way (response only) |

## Customer example (standard `contacts` table)

```ts
// repositories/dataverse/customer.table-mapper.ts
import { DataverseException } from '../../../../core/dataverse';
import { Customer } from '../../domain/customer';
import { CustomerTableRow } from './customer.table';

const ACTIVE = 0;

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
      status: row.statecode === ACTIVE ? 'active' : 'inactive',
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
// repositories/dataverse/order.table.ts
/**
 * Dataverse table (entity set) that stores orders.
 * `new_` is a placeholder publisher prefix: use your solution's real schema names.
 */
export const ORDER_TABLE = 'new_orders';

/** One row of the `new_orders` table, as the Web API returns it (read shape). */
export interface OrderTableRow {
  new_orderid: string;
  new_status: number | null; // Choice column (option set)
  new_total: number | null; // Currency column
  _new_customerid_value: string; // Lookup to contact, read form
}

/** Write shape: lookups are set by binding to the related record's URL. */
export interface OrderTableWriteRow {
  new_orderid: string;
  new_status: number;
  new_total: number;
  'new_CustomerId@odata.bind': string; // Navigation property name, case-sensitive
}

export const ORDER_TABLE_COLUMNS: (keyof OrderTableRow)[] = [
  'new_orderid',
  'new_status',
  'new_total',
  '_new_customerid_value',
];
```

```ts
// repositories/dataverse/order.table-mapper.ts
import { DataverseException } from '../../../../core/dataverse';
import { CUSTOMER_TABLE } from '../../../customers/repositories/dataverse/customer.table';
import { Order, OrderStatus } from '../../domain/order';
import { OrderTableRow, OrderTableWriteRow } from './order.table';

/** Choice values as defined in the Dataverse solution. */
const STATUS_TO_CHOICE: Record<OrderStatus, number> = {
  draft: 100000000,
  placed: 100000001,
  cancelled: 100000002,
};

const CHOICE_TO_STATUS = new Map<number, OrderStatus>(
  Object.entries(STATUS_TO_CHOICE).map(([status, choice]) => [
    choice,
    status as OrderStatus,
  ]),
);

/** Translates between the Dataverse table row and the Order domain model. */
export class OrderTableMapper {
  static toDomain(row: OrderTableRow): Order {
    const status = CHOICE_TO_STATUS.get(row.new_status ?? -1);
    if (!status) {
      throw new DataverseException(
        `Order ${row.new_orderid} has unknown status ${row.new_status}`,
      );
    }

    return Order.restore({
      id: row.new_orderid,
      customerId: row._new_customerid_value,
      status,
      total: row.new_total ?? 0,
    });
  }

  static toTableRow(order: Order): OrderTableWriteRow {
    return {
      new_orderid: order.id,
      new_status: STATUS_TO_CHOICE[order.status],
      new_total: order.total,
      'new_CustomerId@odata.bind': `/${CUSTOMER_TABLE}(${order.customerId})`,
    };
  }
}
```

## Rules

| Topic | Rule |
| --- | --- |
| Restoring | always `Entity.restore(...)`, never `Entity.create(...)` |
| Nulls | decide per field: nullable in domain · documented default · fail loudly (throw `DataverseException` → 502). Never invent business data silently. |
| Choices / `statecode` | map to domain string unions; unknown values fail loudly |
| Lookups (read) | `_<lookup logical name>_value` → `xxxId: string` |
| Lookups (write) | `'<NavigationProperty>@odata.bind': '/<entityset>(<guid>)'`; the navigation property name is case-sensitive and may differ from the column name. Reuse the other feature's `<ENTITY>_TABLE` constant for the entity set. |
| Read-only / computed | never write `fullname`, `createdon`, `modifiedon`, rollups |
| Dates | date-only → `"YYYY-MM-DD"`, parse as UTC midnight; date-time → ISO UTC string |
| Ids | lower-case GUID strings; send the domain id as the primary key on create |
| Formatted values | request `OData.Community.Display.V1.FormattedValue` only for display; never base logic on labels |
| ETag | if optimistic concurrency is needed, carry `@odata.etag` as an opaque `version` and send it as `If-Match` on update |
