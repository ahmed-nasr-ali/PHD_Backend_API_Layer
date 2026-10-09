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
        │   ├── enums/                            one enum per file (except state + status, below)
        │   │   ├── customer-status.enum.ts       CRM statuscode + its statecode (CustomerStatus + CustomerState): one file
        │   │   └── customer-error-code.enum.ts   the module's error codes: one enum per module
        │   ├── models/                           one type per file
        │   │   ├── customer.model.ts             class: private constructor, create / restore, rules
        │   │   └── customer.props.ts             what the class is built from
        │   ├── errors/
        │   │   └── customer.errors.ts            all the module's BusinessError subclasses (codes from the enum)
        │   └── rules/                            optional: pure logic across several models
        │       └── pick-customer-for-x.ts
        └── repositories/
            ├── customer.repository.ts            abstract class (port + DI token)
            └── dataverse/
                ├── dataverse-customer.repository.ts
                ├── mappers/                      Table ↔ Domain
                │   └── customer.table-mapper.ts  CustomerTableMapper
                ├── tables/                       what Dataverse returns: one file per CRM table
                │   └── customer.table.ts         CUSTOMER_TABLE + CustomerTableRow
                └── queries/                      what we ask for
                    └── customer.query.ts         CUSTOMER_COLUMNS ($select) + CUSTOMER_EXPAND ($expand)
```

### An operation with a flow per type

When one endpoint has a different flow for each kind of caller, the service delegates to strategies (see [strategies.md](strategies.md)):

```text
services/
├── register.service.ts                   picks the strategy, runs it
├── register.input.ts                     RegisterInput = union of the per-type inputs
└── register/
    ├── user-registrar.ts                 helpers shared by the strategies
    ├── registration-invitation.verifier.ts
    └── strategies/
        ├── registration.strategy.ts      contract (type + execute)
        ├── registration-strategy.factory.ts   Record<RegisterInput['type'], RegistrationStrategy>
        └── owner/                        one folder per type
            ├── owner-registration.strategy.ts
            └── owner-register.input.ts
```

### A module with several features (feature folders)

When one module serves several features with their own endpoints (e.g. `authentication`: register, otp, login, upload-files), each feature is a folder **and** a Nest sub-module with all its layers. The parent module only imports them:

```text
modules/authentication/
├── authentication.module.ts              @Module({ imports: [RegisterModule, OtpModule] })
├── shared/domain/                        CRM facts every feature must agree on
│   ├── enums/                            option-set enums + the module's error-code enum
│   └── errors/authentication.errors.ts   only errors thrown by more than one feature
├── register/
│   ├── register.module.ts                its own providers (repositories included)
│   ├── controllers/register.controller.ts    @Controller('auth') → POST /auth/register
│   ├── dto/  services/  mappers/  domain/  repositories/
└── otp/
    ├── otp.module.ts
    └── controllers/  dto/  services/  domain/  repositories/
```

- A feature folder never imports from another feature folder. Something two features truly share moves to `shared/`.
- `shared/` holds CRM facts only: option-set enums, the module's error-code enum (one per module, still), an error several features throw. Models, repositories and DTOs stay per feature.
- Each feature reads the same CRM table through its own `tables/` row, model and repository, with only the columns it needs. The duplication is deliberate: data one feature needs (e.g. the OTP) never leaks into another feature's model.
- Routes stay the same: every feature controller uses the parent prefix (`@Controller('auth')`).
- Use this only once a module has several features. A module with one feature keeps the flat layout above.

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
| Enum (option set) | `domain/enums/<name>.enum.ts` | `CustomerStatus` |
| Status + state (one file) | `domain/enums/<entity>-status.enum.ts` | `InvitationStatus` + `InvitationState`: Dataverse accepts a `statuscode` only with its own `statecode`, so the pair lives together |
| Error codes (one per module) | `domain/enums/<module>-error-code.enum.ts` | `CustomerErrorCode`, `AuthenticationErrorCode` |
| Domain model | `domain/models/<entity>.model.ts` | `Customer` |
| Model props | `domain/models/<entity>.props.ts` | `CustomerProps` |
| Domain errors (one file per module) | `domain/errors/<module>.errors.ts` | `CustomerNotFoundError`; `authentication.errors.ts` → `UserExistsError`, `NotPhdCustomerError` |
| Domain rule | `domain/rules/<rule>.ts` | `pickInvitationForCode` |
| Service | `services/<verb>-<entity>.service.ts` | `CreateCustomerService` (+ its Result type, if it isn't a domain object) |
| Service input | `services/<verb>-<entity>.input.ts` | `CreateCustomerInput` |
| Strategy (one per type) | `services/<operation>/strategies/<type>/<type>-<operation>.strategy.ts` | `OwnerRegistrationStrategy` |
| Strategy input | `services/<operation>/strategies/<type>/<type>-<verb>.input.ts` | `OwnerRegisterInput` |
| Strategy contract + factory | `services/<operation>/strategies/<operation>.strategy.ts`, `<operation>-strategy.factory.ts` | `RegistrationStrategy`, `RegistrationStrategyFactory` |
| Helper shared by strategies | `services/<operation>/<role>.ts` | `UserRegistrar`, `RegistrationInvitationVerifier` |
| Request DTO | `dto/<verb>-<entity>.dto.ts` | `createCustomerSchema`, `CreateCustomerDto` |
| Param DTO | `dto/<entity>-id.dto.ts` | `customerIdSchema` |
| Response DTO | `dto/<entity>-response.dto.ts` | `CustomerResponseDto` |
| Response mapper | `mappers/<entity>-response.mapper.ts` | `CustomerResponseMapper` |
| Repository (port) | `repositories/<entity>.repository.ts` | `CustomerRepository` |
| Repository (impl) | `repositories/dataverse/dataverse-<entity>.repository.ts` | `DataverseCustomerRepository` |
| Table (row shape) | `repositories/dataverse/tables/<entity>[-<table>].table.ts` | `CUSTOMER_TABLE`, `CustomerTableRow`; a related table read through an expand gets the entity prefix: `InvitationCompoundTableRow` |
| Table write shape (if different) | same file | `OrderTableWriteRow` |
| Query | `repositories/dataverse/queries/<entity>.query.ts` | `CUSTOMER_COLUMNS`, `CUSTOMER_EXPAND` |
| Table mapper | `repositories/dataverse/mappers/<entity>.table-mapper.ts` | `CustomerTableMapper` (`toDomain`, `toTableRow`) |
| SQL later | `repositories/postgres/…` | same names and folders: `tables/<entity>.table.ts`, `mappers/<entity>.table-mapper.ts`, `Postgres<Entity>Repository` |

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
- `tables/` describes what Dataverse returns; `queries/` describes what we ask for; `mappers/` translates rows to the domain and back. "schema" is never used for them: it stays reserved for Zod in `dto/`.
- `repositories/dataverse/mappers/` (table-mappers) and the module's top-level `mappers/` (response mappers) are different layers; the file suffix tells them apart (`.table-mapper.ts` vs `-response.mapper.ts`).
