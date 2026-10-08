# Folder Structure and Naming

## Tree

```text
src/
├── app.module.ts                         ConfigModule, HttpModule, feature modules
├── core/                                 technical building blocks only (no business concepts)
│   ├── dataverse/                        connection: MSAL, DataverseClient, retry, DataverseException
│   ├── validation/                       zodBody (422) / zodQuery / zodParam (400)
│   ├── errors/                           BusinessError + BusinessErrorKind + ErrorCode (framework-free)
│   └── http/                             response envelope, global exception filters, ResponseInterceptor
└── modules/
    └── customers/
        ├── customers.module.ts
        ├── controllers/
        │   └── customers.controller.ts           one endpoint → one service
        ├── dto/
        │   ├── create-customer.dto.ts            Zod schema + CreateCustomerDto type
        │   ├── customer-id.dto.ts                Zod schema for the :id param
        │   └── customer-response.dto.ts          CustomerResponseDto (JSON shape)
        ├── mappers/
        │   └── customer-response.mapper.ts       Domain → CustomerResponseDto
        ├── services/                             one class per operation
        │   ├── create-customer.service.ts        CreateCustomerService.execute()
        │   ├── create-customer.input.ts          CreateCustomerInput (type only)
        │   ├── get-customer.service.ts           execute(id: string): no input file needed
        │   ├── update-customer.service.ts
        │   └── update-customer.input.ts
        ├── domain/
        │   ├── enums/                            one enum per file
        │   │   ├── customer-status.enum.ts       CRM option set: values are the CRM values
        │   │   └── customer-error-code.enum.ts   the feature's error codes
        │   ├── models/                           one type per file
        │   │   ├── customer.model.ts             class: private constructor, create / restore, rules
        │   │   └── customer.props.ts             what the class is built from
        │   ├── errors/
        │   │   └── customer.errors.ts            BusinessError subclasses (codes from the enum)
        │   └── rules/                            optional: pure logic across several models
        │       └── pick-customer-for-x.ts
        └── repositories/
            ├── customer.repository.ts            abstract class (port + DI token)
            └── dataverse/
                ├── dataverse-customer.repository.ts
                ├── customer.table-mapper.ts      Table ↔ Domain
                ├── tables/                       what Dataverse returns: one file per CRM table
                │   └── customer.table.ts         CUSTOMER_TABLE + CustomerTableRow
                └── queries/                      what we ask for
                    └── customer.query.ts         CUSTOMER_COLUMNS ($select) + CUSTOMER_EXPAND ($expand)
```

## What each word means

| Word | Means | Example |
| --- | --- | --- |
| `schema` | Zod validation **only** (inside `dto/`) | `createCustomerSchema` |
| `Dto` | HTTP shapes **only** (request or response) | `CreateCustomerDto`, `CustomerResponseDto` |
| `table` | the storage table (Dataverse today, SQL later) | `CUSTOMER_TABLE`, `CustomerTableRow` |
| `query` | what we ask Dataverse for (`$select`, `$expand`) | `CUSTOMER_COLUMNS`, `CUSTOMER_EXPAND` |
| `TableMapper` | Table ↔ Domain | `CustomerTableMapper` |
| `ResponseMapper` | Domain → Response DTO | `CustomerResponseMapper` |
| `Service` | one operation (use case) | `CreateCustomerService` |
| `Repository` | abstract = port; `Dataverse…` / `Postgres…` = implementation | `CustomerRepository` |

## Naming

| Thing | File | Exported names |
| --- | --- | --- |
| Enum (option set / error codes) | `domain/enums/<name>.enum.ts` | `CustomerStatus`, `CustomerErrorCode` |
| Domain model | `domain/models/<entity>.model.ts` | `Customer` |
| Model props | `domain/models/<entity>.props.ts` | `CustomerProps` |
| Domain errors | `domain/errors/<entity>.errors.ts` | `CustomerNotFoundError` |
| Domain rule | `domain/rules/<rule>.ts` | `pickInvitationForCode` |
| Service | `services/<verb>-<entity>.service.ts` | `CreateCustomerService` (+ its Result type, if it isn't a domain object) |
| Service input | `services/<verb>-<entity>.input.ts` | `CreateCustomerInput` |
| Request DTO | `dto/<verb>-<entity>.dto.ts` | `createCustomerSchema`, `CreateCustomerDto` |
| Param DTO | `dto/<entity>-id.dto.ts` | `customerIdSchema` |
| Response DTO | `dto/<entity>-response.dto.ts` | `CustomerResponseDto` |
| Response mapper | `mappers/<entity>-response.mapper.ts` | `CustomerResponseMapper` |
| Repository (port) | `repositories/<entity>.repository.ts` | `CustomerRepository` |
| Repository (impl) | `repositories/dataverse/dataverse-<entity>.repository.ts` | `DataverseCustomerRepository` |
| Table (row shape) | `repositories/dataverse/tables/<entity>[-<table>].table.ts` | `CUSTOMER_TABLE`, `CustomerTableRow`; a related table read through an expand gets the entity prefix: `InvitationCompoundTableRow` |
| Table write shape (if different) | same file | `OrderTableWriteRow` |
| Query | `repositories/dataverse/queries/<entity>.query.ts` | `CUSTOMER_COLUMNS`, `CUSTOMER_EXPAND` |
| Table mapper | `repositories/dataverse/<entity>.table-mapper.ts` | `CustomerTableMapper` (`toDomain`, `toTableRow`) |
| SQL later | `repositories/postgres/…` | same names: `<entity>.table.ts`, `<entity>.table-mapper.ts`, `Postgres<Entity>Repository` |

## Rules

- Files are named after the **business entity** (`customer.table.ts`); the real Dataverse table name (`'contacts'`) appears once, inside it.
- Each Input type has its own file **next to its service**: `services/create-customer.input.ts`. There is no top-level `inputs/` folder. The Input belongs to one service, so it stays beside it.
- The `.input.ts` file holds a plain `type`/`interface`: no Zod, no NestJS, no imports from `dto/`.
- A service whose only argument is an id takes `execute(id: string)` and needs no `.input.ts` file.
- The technology folder under `repositories/` is named after the technology (`dataverse/`, later `postgres/`), never "crm".
- Never put a Dataverse client or auth service inside a feature; `core/dataverse` owns them.
- A feature without business rules may omit `domain/`.
- One type per file inside `domain/`: each enum, model and props type has its own file.
- Error codes and CRM option-set values are always enum members (`InvitedAs.Helpers`), never bare strings or numbers.
- `tables/` describes what Dataverse returns; `queries/` describes what we ask for. "schema" is never used for them: it stays reserved for Zod in `dto/`.
