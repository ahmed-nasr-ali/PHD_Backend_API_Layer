# Folder Structure and Naming

## Tree

```text
src/
├── app.module.ts                         ConfigModule, feature modules, APP_FILTER providers
├── core/                                 technical building blocks only (no business concepts)
│   ├── dataverse/                        connection: MSAL, DataverseClient, retry, DataverseException
│   ├── validation/                       zodBody (422) / zodQuery (400)
│   └── errors/                           ApplicationError + global exception filters
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
        │   ├── customer.ts                       model + rules
        │   └── customer.errors.ts                ApplicationError subclasses
        └── repositories/
            ├── customer.repository.ts            abstract class (port + DI token)
            └── dataverse/
                ├── dataverse-customer.repository.ts
                ├── customer.table.ts             Dataverse table: name + columns + row shape
                └── customer.table-mapper.ts      Table ↔ Domain
```

## What each word means

| Word | Means | Example |
| --- | --- | --- |
| `schema` | Zod validation **only** (inside `dto/`) | `createCustomerSchema` |
| `Dto` | HTTP shapes **only** (request or response) | `CreateCustomerDto`, `CustomerResponseDto` |
| `table` | the storage table (Dataverse today, SQL later) | `CUSTOMER_TABLE`, `CustomerTableRow` |
| `TableMapper` | Table ↔ Domain | `CustomerTableMapper` |
| `ResponseMapper` | Domain → Response DTO | `CustomerResponseMapper` |
| `Service` | one operation (use case) | `CreateCustomerService` |
| `Repository` | abstract = port; `Dataverse…` / `Postgres…` = implementation | `CustomerRepository` |

## Naming

| Thing | File | Exported names |
| --- | --- | --- |
| Domain model | `domain/<entity>.ts` | `Customer` |
| Domain errors | `domain/<entity>.errors.ts` | `CustomerNotFoundError` |
| Service | `services/<verb>-<entity>.service.ts` | `CreateCustomerService` (+ its Result type, if it isn't a domain object) |
| Service input | `services/<verb>-<entity>.input.ts` | `CreateCustomerInput` |
| Request DTO | `dto/<verb>-<entity>.dto.ts` | `createCustomerSchema`, `CreateCustomerDto` |
| Param DTO | `dto/<entity>-id.dto.ts` | `customerIdSchema` |
| Response DTO | `dto/<entity>-response.dto.ts` | `CustomerResponseDto` |
| Response mapper | `mappers/<entity>-response.mapper.ts` | `CustomerResponseMapper` |
| Repository (port) | `repositories/<entity>.repository.ts` | `CustomerRepository` |
| Repository (impl) | `repositories/dataverse/dataverse-<entity>.repository.ts` | `DataverseCustomerRepository` |
| Table | `repositories/dataverse/<entity>.table.ts` | `CUSTOMER_TABLE`, `CustomerTableRow`, `CUSTOMER_TABLE_COLUMNS` |
| Table write shape (if different) | same file | `OrderTableWriteRow` |
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
