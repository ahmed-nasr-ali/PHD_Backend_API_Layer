# Common Mistakes (and the fix)

| # | Mistake | Why it hurts | Fix |
| --- | --- | --- | --- |
| 1 | Service or controller injects `DataverseClient` | business logic is coupled to the CRM; migrating means rewriting services | inject the abstract repository; only `repositories/dataverse/` uses `DataverseClient` |
| 2 | `throw new Error('Customer not found')` | becomes a 500 | `throw new CustomerNotFoundError(id)` (a `BusinessError`) |
| 3 | `throw new NotFoundException()` in a service | ties business code to HTTP | `BusinessError`; the filter maps it to 404 |
| 4 | `return customer` (domain object) from a controller | leaks internals; getters aren't serialised; the API changes silently | `return CustomerResponseMapper.toResponse(customer)` |
| 5 | `@Inject('CustomerRepository')` string tokens | typo-prone, unchecked | abstract class token |
| 6 | `repository.create(input)` with a service Input | the repository depends on the service's input shape | `repository.create(customer)` with a domain object |
| 7 | `CustomerTableRow` outside `repositories/dataverse/`, or a bare option-set number (`=== 3`, `100000001`) anywhere | CRM details leak; unreadable rules | row types stay in `repositories/dataverse/tables/`; option sets are enums in `domain/enums/` (CRM values) compared by member, mapped with `optionSetValue` in the table-mapper |
| 8 | A `CustomersService` with 15 methods | god class; unclear dependencies | one `<Verb><Entity>Service` per operation |
| 9 | Sequential `await` for independent remote reads | latencies add up (each Dataverse call is an HTTPS round trip) | `Promise.all` |
| 10 | `Customer.create()` used when loading from storage | existing CRM data that breaks a rule makes reads throw | `Customer.restore()` |
| 11 | Business rule only in a Zod schema | rule bypassed by non-HTTP callers | Zod checks shape; domain/service checks business rules |
| 12 | Uniqueness only via check-then-insert | race condition | also a Dataverse alternate key / SQL `UNIQUE`, translated by the repository |
| 13 | Circular module imports (customers ↔ orders) | brittle wiring, `forwardRef` hacks | put the cross-feature service in the module that already depends on the other |
| 14 | Generic `BaseRepository<T>` / `IRepository<T>` | lowest-common-denominator CRUD; hides real needs | one repository per aggregate, methods named after service needs |
| 15 | Interfaces for every class "for testability" | noise | abstract only repositories; test services with in-memory repository fakes |
| 16 | `@Req() req` + `req.user.id` in controllers | untyped; couples to Express | typed `@CurrentUser()` param decorator |
| 17 | A service calling another service | hidden coupling, unclear transactions | share logic via `domain/` or a repository method |
| 18 | The word "schema" used for the Dataverse table | clashes with Zod schemas in `dto/` | `tables/<entity>.table.ts` / `CustomerTableRow` |
| 19 | `super('…', 'CUSTOMER_NOT_FOUND')` with a hand-typed code | typos change the API contract silently | code from the feature enum: `CustomerErrorCode.NotFound` |
| 20 | One `domain/customer.ts` holding enums, props and the class | grows into a god file; unclear imports | `domain/enums/`, `domain/models/` (`.model.ts` + `.props.ts`), `domain/errors/`, `domain/rules/`, one type per file |
| 21 | One error-code enum / errors file per entity (`UserErrorCode` + `AccountErrorCode` in the same module) | the module's codes are scattered; two files for one or two codes each | one per module: `AuthenticationErrorCode` + `authentication.errors.ts` |
| 22 | A service or strategy typed with the request DTO (`execute(body: RegisterDto)`) | the API shape leaks into business code; string dates reach the service | an Input next to the service/strategy; the controller passes the validated body as the Input (see `request-validation-and-dtos`) |
| 23 | `throw new Error('No strategy for type …')` (or any `throw new Error`) for a case that "can't happen" | it can, after the next change, and then it's a 500 for a real user | make it impossible at compile time: `Record<Input['type'], Strategy>` (see [strategies.md](strategies.md)) |
| 24 | Writing `statuscode` alone, or reusing a found record without looking at `statecode` | Dataverse rejects a status that doesn't belong to the record's state (e.g. Under Review on a deactivated record) → 502 | read `statecode` with `statuscode` (`<Entity>State` in the status enum file); decide what an inactive record means before reusing it (register: 403 `USER_DEACTIVATED`) |
| 25 | Table-mappers loose in `repositories/dataverse/` | the folder mixes repositories, mappers and folders | `repositories/dataverse/mappers/<entity>.table-mapper.ts`, next to `tables/` and `queries/` |
