# Folder & File Structure

The same structure for every case. Diagrams: [flow.md](flow.md).

---

## 0. Request steps through the folders (`POST /customers`)

Numbers show the order a request passes through each file.

```text
src/
├── main.ts
├── app.module.ts                                  registers the global filters
├── core/
│   ├── validation/
│   │   └── presets.ts                             ② zodBody runs the schema
│   ├── dataverse/
│   │   ├── crm-token/                             ⑧ ⑫ MSAL token
│   │   ├── policies/                              ⑧ ⑫ retry
│   │   └── data-access/dataverse.client.ts        ⑧ ⑫ HTTP call to the Dataverse Web API
│   └── errors/                                    ✖ (proposed) ApplicationError + filters
└── modules/customers/
    ├── customers.module.ts                        wiring: CustomerRepository → DataverseCustomerRepository
    ├── controllers/
    │   └── customers.controller.ts                ① receives the request
    │                                              ③ DTO → Input
    │                                              ⑮ returns 201
    ├── dto/
    │   ├── create-customer.dto.ts                 ② createCustomerSchema + CreateCustomerDto
    │   └── customer-response.dto.ts               ⑭ CustomerResponseDto
    ├── services/
    │   ├── create-customer.input.ts               ③ CreateCustomerInput
    │   └── create-customer.service.ts             ④ execute()
    │                                              ⑬ returns Customer
    ├── domain/
    │   ├── customer.ts                            ⑤ Customer.create(): rules + new id
    │   └── customer.errors.ts                     ⑤ ⑨ domain errors
    ├── repositories/
    │   ├── customer.repository.ts                 ⑥ findByEmail()  ⑩ create()  (abstract)
    │   └── dataverse/
    │       ├── dataverse-customer.repository.ts   ⑦ ⑪ implementation
    │       ├── customer.table.ts                  ⑦ ⑪ 'contacts' + columns + row type
    │       └── customer.table-mapper.ts           ⑨ toDomain   ⑪ toTableRow
    └── mappers/
        └── customer-response.mapper.ts            ⑭ Customer → CustomerResponseDto
```

| # | File | What happens | On failure |
| --- | --- | --- | --- |
| ① | `customers.controller.ts` | The request arrives at `create()` | |
| ② | `create-customer.dto.ts` + `zodBody` | The body is checked, producing `CreateCustomerDto` | 422 |
| ③ | controller → `create-customer.input.ts` | The controller builds `CreateCustomerInput` (string date → `Date`) | |
| ④ | `create-customer.service.ts` | `execute(input)` starts | |
| ⑤ | `domain/customer.ts` | `Customer.create()` applies the rules and generates the id | 422 `CustomerMustBeAdultError` |
| ⑥ | `customer.repository.ts` | The service calls `findByEmail(email)` | |
| ⑦ | `dataverse-customer.repository.ts` + `customer.table.ts` | The repository builds the query (table + `$select` + `$filter`) | |
| ⑧ | `core/dataverse` | `DataverseClient` gets the token and sends the GET to `contacts` | 502 / 503 |
| ⑨ | `customer.table-mapper.ts` | If a row came back, `toDomain` turns it into a `Customer`, and the service throws | 409 `EmailAlreadyInUseError` |
| ⑩ | `customer.repository.ts` | The service calls `create(customer)` | |
| ⑪ | `customer.table-mapper.ts` | `toTableRow(customer)` produces a `CustomerTableRow` | |
| ⑫ | `core/dataverse` | `DataverseClient` sends the POST to `contacts`, and the repository returns `void` | 502 / 503 |
| ⑬ | `create-customer.service.ts` | The service returns the `Customer` it built in ⑤ | |
| ⑭ | `customer-response.mapper.ts` | `toResponse()` produces `CustomerResponseDto` | |
| ⑮ | `customers.controller.ts` | The controller returns 201 with the JSON | |
| ✖ | `core/errors` | Any error that's thrown is turned into the HTTP status shown above | |

### The same flow as code

Numbers match the steps above. Only the lines that matter are shown.

```ts
// ── controllers/customers.controller.ts ─────────────────────────── ① ③ ⑭ ⑮
@Post()
async create(
  @Body(zodBody(createCustomerSchema)) dto: CreateCustomerDto, // ② validated body
): Promise<CustomerResponseDto> {
  const input: CreateCustomerInput = {                          // ③ DTO → Input
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    birthDate: new Date(`${dto.birthDate}T00:00:00Z`),
  };
  const customer = await this.createCustomer.execute(input);    // ④ … ⑬
  return CustomerResponseMapper.toResponse(customer);           // ⑭ → ⑮ 201
}

// ── dto/create-customer.dto.ts ──────────────────────────────────── ②
export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.email().max(100),
  birthDate: z.iso.date(),
});
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

// ── services/create-customer.input.ts ───────────────────────────── ③
export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: Date;
}

// ── services/create-customer.service.ts ─────────────────────────── ④ … ⑬
async execute(input: CreateCustomerInput): Promise<Customer> {
  const customer = Customer.create({ id: randomUUID(), ...input }, new Date()); // ⑤

  const existing = await this.customers.findByEmail(customer.email);           // ⑥ ⑦ ⑧ ⑨
  if (existing) {
    throw new EmailAlreadyInUseError(customer.email);                          // ⑨ kind: conflict
  }

  await this.customers.create(customer);                                       // ⑩ ⑪ ⑫
  return customer;                                                             // ⑬
}

// ── domain/customer.ts (inside class Customer) ──────────────────── ⑤
static create(props: NewCustomerProps, today: Date): Customer {
  const customer = new Customer({ ...props, email: props.email.trim().toLowerCase(), status: 'active' });
  if (!customer.isAdultOn(today)) {
    throw new CustomerMustBeAdultError();                                      // kind: rule_violation
  }
  return customer;
}

/** `today` is passed in (no hidden new Date()), so tests can use any date. */
isAdultOn(date: Date): boolean {
  if (!this.birthDate) {
    return false;
  }
  const eighteenthBirthday = new Date(this.birthDate);
  eighteenthBirthday.setUTCFullYear(eighteenthBirthday.getUTCFullYear() + 18);
  return eighteenthBirthday <= date;
}

// ── domain/customer.errors.ts ───────────────────────────────────── ⑤ ⑨
// No HTTP here: only a kind + code. Each caller decides what to do with it.
export class CustomerMustBeAdultError extends ApplicationError {
  readonly kind = 'rule_violation';
  constructor() {
    super('Customer must be at least 18 years old', 'CUSTOMER_MUST_BE_ADULT');
  }
}

export class EmailAlreadyInUseError extends ApplicationError {
  readonly kind = 'conflict';
  constructor(email: string) {
    super(`Email ${email} is already in use`, 'EMAIL_ALREADY_IN_USE');
  }
}

// ── repositories/customer.repository.ts (abstract) ──────────────── ⑥ ⑩
export abstract class CustomerRepository {
  abstract findByEmail(email: string): Promise<Customer | null>;
  abstract create(customer: Customer): Promise<void>;
}

// ── repositories/dataverse/dataverse-customer.repository.ts ─────── ⑦ ⑧ ⑨ ⑪ ⑫
async findByEmail(email: string): Promise<Customer | null> {
  const [row] = await this.dataverse.retrieveMultiple<CustomerTableRow>( // ⑧ GET contacts
    CUSTOMER_TABLE,                                                      // ⑦ from customer.table.ts
    { select: CUSTOMER_TABLE_COLUMNS, filter: `emailaddress1 eq ${odataString(email)}`, top: 1 },
  );
  return row ? CustomerTableMapper.toDomain(row) : null;                 // ⑨
}

async create(customer: Customer): Promise<void> {
  const row = CustomerTableMapper.toTableRow(customer);                  // ⑪
  await this.dataverse.create(CUSTOMER_TABLE, row);                      // ⑫ POST contacts
}

// ── mappers/customer-response.mapper.ts ─────────────────────────── ⑭
static toResponse(customer: Customer): CustomerResponseDto {
  return {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    status: customer.status,
  };
}
```

**Who decides the HTTP status?** Not the domain or the service. They throw errors that carry only a `kind` and a `code`. The HTTP edge (`ApplicationErrorFilter` in `core/errors/`) maps the `kind` to a status. Another caller, like a CLI, catches the same error and handles it its own way:

| `kind` | HTTP (`ApplicationErrorFilter`) | CLI (example) |
| --- | --- | --- |
| `rule_violation` | 422 | print message, exit 1 |
| `conflict` | 409 | print message, exit 1 |
| `not_found` | 404 | print message, exit 1 |
| `forbidden` | 403 | print message, exit 1 |

`201` in the controller is fine: the controller *is* the HTTP layer.

---

## 1. Full project

```text
src/
├── main.ts
├── app.module.ts                         # ConfigModule + feature modules + APP_FILTER
│
├── core/                                 # technical only, no business
│   ├── dataverse/                        # (exists) connection to Dataverse
│   │   ├── config/dataverse.config.ts
│   │   ├── crm-token/                    # MSAL token
│   │   ├── data-access/                  # DataverseClient + DynamicsWebApiClient + odata.ts
│   │   ├── errors/dataverse.exception.ts
│   │   ├── policies/dataverse-retry-policy.ts
│   │   ├── dataverse.module.ts
│   │   └── index.ts
│   ├── validation/                       # (exists) zodBody / zodQuery
│   └── errors/                           # (to add)
│       ├── application-error.ts
│       ├── application-error.filter.ts
│       └── dataverse-exception.filter.ts
│
└── modules/
    ├── customers/                        # case 2
    └── orders/                           # case 3
```

---

## 2. Feature with many services (`customers`)

```text
modules/customers/
├── customers.module.ts                   # providers + { provide: CustomerRepository, useClass: DataverseCustomerRepository }
│
├── controllers/
│   └── customers.controller.ts           # one endpoint → one service
│
├── dto/
│   ├── create-customer.dto.ts            # Zod schema + CreateCustomerDto type
│   ├── update-customer.dto.ts
│   ├── customer-id.dto.ts                # Zod schema for the :id param
│   └── customer-response.dto.ts          # CustomerResponseDto (the JSON shape)
│
├── mappers/
│   └── customer-response.mapper.ts       # Domain → CustomerResponseDto
│
├── services/                             # one service per operation + its input file
│   ├── create-customer.service.ts        # CreateCustomerService.execute(input)
│   ├── create-customer.input.ts          # CreateCustomerInput (type only)
│   ├── get-customer.service.ts           # execute(id): no input file needed
│   ├── update-customer.service.ts
│   ├── update-customer.input.ts
│   ├── list-customers.service.ts
│   └── list-customers.input.ts           # filters + cursor
│
├── domain/
│   ├── customer.ts                       # model: create / restore / rules
│   └── customer.errors.ts                # CustomerNotFoundError, EmailAlreadyInUseError, ...
│
└── repositories/
    ├── customer.repository.ts            # abstract class (what services use)
    └── dataverse/
        ├── dataverse-customer.repository.ts
        ├── customer.table.ts             # Dataverse table: CUSTOMER_TABLE + CustomerTableRow + columns
        └── customer.table-mapper.ts      # Table ↔ Domain
```

---

## 3. One service using many repositories (`orders`)

`orders` depends on `customers`, so the cross-feature service lives here.

```text
modules/orders/
├── orders.module.ts                      # imports: [DataverseModule, CustomersModule]
│
├── controllers/
│   ├── orders.controller.ts
│   └── customer-overview.controller.ts   # GET /customers/:id/overview
│
├── dto/
│   ├── place-order.dto.ts
│   ├── order-response.dto.ts
│   └── customer-overview-response.dto.ts
│
├── mappers/
│   ├── order-response.mapper.ts
│   └── customer-overview-response.mapper.ts
│
├── services/
│   ├── place-order.service.ts              # uses CustomerRepository + OrderRepository
│   ├── place-order.input.ts
│   ├── get-customer-overview.service.ts    # Promise.all over both repositories (+ CustomerOverview result type)
│   └── get-customer-overview.input.ts
│
├── domain/
│   ├── order.ts
│   └── order.errors.ts
│
└── repositories/
    ├── order.repository.ts
    └── dataverse/
        ├── dataverse-order.repository.ts
        ├── order.table.ts                # OrderTableRow (read) + OrderTableWriteRow (@odata.bind)
        └── order.table-mapper.ts         # choices ↔ status, lookup ↔ customerId
```

Rules:
- `customers.module.ts` → `exports: [CustomerRepository]` (the abstract class, not the Dataverse implementation).
- `orders` imports `customers`; `customers` never imports `orders`.
- A service never calls another service.

---

## 4. Simple feature without business rules (`countries`, a read-only lookup)

There are no rules, so there is no `domain/` folder.

```text
modules/countries/
├── countries.module.ts
├── controllers/countries.controller.ts
├── dto/country-response.dto.ts
├── mappers/country-response.mapper.ts
├── services/list-countries.service.ts
└── repositories/
    ├── country.repository.ts
    └── dataverse/
        ├── dataverse-country.repository.ts
        ├── country.table.ts
        └── country.table-mapper.ts
```

---

## 5. Future: adding PostgreSQL / SQL Server

Only `repositories/` and `core/` get new folders, with the **same file names**. Everything else stays the same.

```text
src/core/
├── dataverse/                            # removed after the full migration
└── postgres/                             # new: pool, config, health check
    ├── postgres.module.ts
    └── postgres-exception.filter.ts

modules/customers/repositories/
├── customer.repository.ts                # unchanged
├── dataverse/                            # old (removed after the cut-over)
│   ├── dataverse-customer.repository.ts
│   ├── customer.table.ts                 # CUSTOMER_TABLE = 'contacts'
│   └── customer.table-mapper.ts
└── postgres/                             # new
    ├── postgres-customer.repository.ts
    ├── customer.table.ts                 # CUSTOMER_TABLE = 'customers'
    └── customer.table-mapper.ts
```

The change in `customers.module.ts` is one line:

```ts
{ provide: CustomerRepository, useClass: PostgresCustomerRepository }
```

---

## 6. Tests

```text
modules/customers/
├── domain/customer.spec.ts                                  # rules
├── services/create-customer.service.spec.ts                 # with an in-memory fake repository
├── repositories/customer.repository.contract.ts             # shared tests for every implementation
└── repositories/dataverse/customer.table-mapper.spec.ts     # JSON → Domain

test/
└── customers.e2e-spec.ts                                    # HTTP end-to-end with fake repositories
```

---

## Words and what they mean

| Word | Means | Example |
| --- | --- | --- |
| `schema` | Zod validation only (in `dto/`) | `createCustomerSchema` |
| `Dto` | HTTP shapes only | `CreateCustomerDto`, `CustomerResponseDto` |
| `table` | the storage table | `customer.table.ts`, `CustomerTableRow` |
| `TableMapper` | Table ↔ Domain | `CustomerTableMapper` |
| `ResponseMapper` | Domain → Response DTO | `CustomerResponseMapper` |
| `Service` | one operation | `CreateCustomerService` |
| `Input` | what one service needs (type only, in `<verb>-<entity>.input.ts` next to it) | `CreateCustomerInput` |
| `Repository` | abstract = what services use; `Dataverse…` / `Postgres…` = implementation | `CustomerRepository` |

## Quick rules

| Folder | Contains | Never contains |
| --- | --- | --- |
| `domain/` | business rules | NestJS, Zod, Dataverse |
| `services/` | `*.service.ts` (one operation) + `*.input.ts` (its Input type) | HTTP, DTOs, Dataverse column names |
| `repositories/<entity>.repository.ts` | abstract class with domain types | OData, SQL |
| `repositories/dataverse/` | Dataverse names, OData, table mapping | HTTP |
| `controllers/`, `dto/`, `mappers/` | HTTP, Zod, response mapping | repositories, Dataverse |
| `core/` | technical infrastructure | business concepts |
