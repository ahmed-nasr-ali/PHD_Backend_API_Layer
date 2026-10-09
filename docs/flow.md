# Request Flow

Color = folder: 🟦 controllers / dto / mappers · 🟩 services / abstract repository · 🟨 domain · 🟥 repositories/dataverse · ⬜ Dataverse

## 1. Main flow: `POST /customers`

```mermaid
flowchart TB
    A(["Client<br/>POST /customers"]) --> S1["① CustomersController.create"]
    S1 --> S2["② zodBody(createCustomerSchema)<br/>→ CreateCustomerDto"]
    S2 --> S3["③ controller builds<br/>CreateCustomerInput"]
    S3 --> S4["④ CreateCustomerService.execute"]
    S4 --> S5["⑤ Customer.create<br/>rules + new id"]
    S5 --> S6["⑥ CustomerRepository.findByEmail<br/>abstract"]
    S6 --> S7["⑦ DataverseCustomerRepository<br/>tables/: contacts · queries/: columns"]
    S7 --> S8["⑧ DataverseClient<br/>GET contacts"]
    S8 --> DV1[("Dataverse")]
    DV1 --> S9{"⑨ CustomerTableMapper.toDomain<br/>row found?"}
    S9 -->|no| S10["⑩ CustomerRepository.create<br/>abstract"]
    S10 --> S11["⑪ CustomerTableMapper.toTableRow<br/>Domain → Table"]
    S11 --> S12["⑫ DataverseClient<br/>POST contacts"]
    S12 --> DV2[("Dataverse")]
    DV2 --> S13["⑬ Service returns Customer"]
    S13 --> S14["⑭ CustomerResponseMapper<br/>→ CustomerResponseDto"]
    S14 --> S15(["⑮ 201 Created<br/>ResponseInterceptor wraps the DTO"])

    S2 -.->|invalid| X2(["422"])
    S5 -.->|under 18| X5(["422"])
    S9 -.->|yes| X9(["409"])

    classDef pres fill:#dbeafe,stroke:#2563eb,color:#000
    classDef app fill:#dcfce7,stroke:#16a34a,color:#000
    classDef dom fill:#fef9c3,stroke:#ca8a04,color:#000
    classDef infra fill:#fee2e2,stroke:#dc2626,color:#000
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#000
    class A,S1,S2,S14,S15,X2,X5,X9 pres
    class S3,S4,S6,S10,S13 app
    class S5 dom
    class S7,S8,S9,S11,S12 infra
    class DV1,DV2 ext
```

Folder for each step: [structure.md → section 0](structure.md#0-request-steps-through-the-folders-post-customers). Code: [section 5](#5-the-same-flow-as-code).

## 2. One feature, many services

Each endpoint calls one service. All of them share the same abstract repository.

```mermaid
flowchart TB
    C["CustomersController"]
    C --> E1["POST /customers"]
    C --> E2["GET /customers/:id"]
    C --> E3["PATCH /customers/:id"]
    E1 --> U1["CreateCustomerService"]
    E2 --> U2["GetCustomerService"]
    E3 --> U3["UpdateCustomerService"]
    U1 --> D["Customer<br/>domain rules"]
    U3 --> D
    U1 --> P["CustomerRepository<br/>abstract"]
    U2 --> P
    U3 --> P
    P -.->|useClass| R["DataverseCustomerRepository"]
    R --> DV[("Dataverse")]

    classDef pres fill:#dbeafe,stroke:#2563eb,color:#000
    classDef app fill:#dcfce7,stroke:#16a34a,color:#000
    classDef dom fill:#fef9c3,stroke:#ca8a04,color:#000
    classDef infra fill:#fee2e2,stroke:#dc2626,color:#000
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#000
    class C,E1,E2,E3 pres
    class U1,U2,U3,P app
    class D dom
    class R infra
    class DV ext
```

## 3. One service, many repositories: `GET /customers/:id/overview`

```mermaid
flowchart TB
    A(["Client<br/>GET /customers/:id/overview"]) --> B["CustomerOverviewController"]
    B --> U["GetCustomerOverviewService<br/>Promise.all"]
    U --> P1["CustomerRepository<br/>findById"]
    U --> P2["OrderRepository<br/>findRecentByCustomer"]
    P1 --> R1["DataverseCustomerRepository"]
    P2 --> R2["DataverseOrderRepository"]
    R1 --> DV[("Dataverse")]
    R2 --> DV
    DV --> RES["Result<br/>customer + recentOrders"]
    RES --> CHK{"customer found?"}
    CHK -->|no| E404(["404 CustomerNotFoundError"])
    CHK -->|yes| M["CustomerOverviewResponseMapper"]
    M --> OK(["200 JSON<br/>profile + recentOrders"])

    classDef pres fill:#dbeafe,stroke:#2563eb,color:#000
    classDef app fill:#dcfce7,stroke:#16a34a,color:#000
    classDef infra fill:#fee2e2,stroke:#dc2626,color:#000
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#000
    class A,B,M,OK,E404 pres
    class U,P1,P2,RES,CHK app
    class R1,R2 infra
    class DV ext
```

## 4. Error flow

```mermaid
flowchart TB
    S1["Dataverse error"] --> S2["DataverseException<br/>status + cause"]
    S2 --> S3{"Repository"}
    S3 -->|404| N["return null"]
    S3 -->|duplicate key| AE["BusinessError"]
    S3 -->|anything else| F2["DataverseExceptionFilter"]
    U["Service / Domain<br/>rule broken, not found"] --> AE
    AE --> F1["BusinessErrorFilter"]
    F1 --> H1(["404 / 409 / 422 / 403 / 429<br/>code = error.code"])
    F2 --> H2(["502 / 503<br/>UPSTREAM_UNAVAILABLE"])
    V["zodBody / zodQuery / zodParam<br/>invalid request"] --> F3["HttpExceptionFilter"]
    F3 --> H3(["422 / 400<br/>VALIDATION_FAILED + errors"])
    B["Unexpected error (bug)"] --> F4["UnhandledExceptionFilter"]
    F4 --> H4(["500<br/>INTERNAL_ERROR"])

    classDef pres fill:#dbeafe,stroke:#2563eb,color:#000
    classDef app fill:#dcfce7,stroke:#16a34a,color:#000
    classDef infra fill:#fee2e2,stroke:#dc2626,color:#000
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#000
    class F1,F2,F3,F4,H1,H2,H3,H4,V pres
    class U,AE,N,B app
    class S2,S3 infra
    class S1 ext
```

Every red/blue end box above is the same error envelope (`src/core/http/`):

```json
{ "success": false, "statusCode": 404, "code": "CUSTOMER_NOT_FOUND", "message": "…", "data": null }
```

A successful request is wrapped by `ResponseInterceptor` as `{ "success": true, "statusCode": 201, "message": "OK", "data": <response DTO> }`.

## 5. The same flow as code

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
    throw new EmailAlreadyInUseError(customer.email);                          // ⑨ kind: Conflict
  }

  await this.customers.create(customer);                                       // ⑩ ⑪ ⑫
  return customer;                                                             // ⑬
}

// ── domain/models/customer.model.ts (inside class Customer) ─────── ⑤
static create(props: NewCustomerProps, today: Date): Customer {
  const customer = new Customer({ ...props, email: props.email.trim().toLowerCase(), status: CustomerStatus.Active });
  if (!customer.isAdultOn(today)) {
    throw new CustomerMustBeAdultError();                                      // kind: RuleViolation
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

// ── domain/enums/customer-error-code.enum.ts ────────────────────── ⑤ ⑨
export enum CustomerErrorCode {
  MustBeAdult = 'CUSTOMER_MUST_BE_ADULT',
  EmailAlreadyInUse = 'EMAIL_ALREADY_IN_USE',
}

// ── domain/errors/customer.errors.ts ────────────────────────────── ⑤ ⑨
// No HTTP here: only a kind + code. Each caller decides what to do with it.
export class CustomerMustBeAdultError extends BusinessError {
  readonly kind = BusinessErrorKind.RuleViolation;
  constructor() {
    super('Customer must be at least 18 years old', CustomerErrorCode.MustBeAdult);
  }
}

export class EmailAlreadyInUseError extends BusinessError {
  readonly kind = BusinessErrorKind.Conflict;
  constructor(email: string) {
    super(`Email ${email} is already in use`, CustomerErrorCode.EmailAlreadyInUse);
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
    CUSTOMER_TABLE,                                                      // ⑦ from tables/customer.table.ts
    { select: CUSTOMER_COLUMNS, filter: `emailaddress1 eq ${odataString(email)}`, top: 1 }, // ⑦ queries/customer.query.ts
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

**Who decides the HTTP status?** Not the domain or the service. They throw errors that carry only a `kind` and a `code`. The HTTP edge (`BusinessErrorFilter` in `core/http/filters/`) maps the `kind` to a status. Another caller, like a CLI, catches the same error and handles it its own way:

| `kind` | HTTP (`BusinessErrorFilter`) | CLI (example) |
| --- | --- | --- |
| `RuleViolation` | 422 | print message, exit 1 |
| `Conflict` | 409 | print message, exit 1 |
| `NotFound` | 404 | print message, exit 1 |
| `Forbidden` | 403 | print message, exit 1 |

`201` in the controller is fine: the controller *is* the HTTP layer.
