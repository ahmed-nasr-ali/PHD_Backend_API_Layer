# Common Mistakes (and the fix)

| # | Mistake | Why it hurts | Fix |
| --- | --- | --- | --- |
| 1 | Service or controller injects `DataverseClient` | business logic is coupled to the CRM; migrating means rewriting services | inject the abstract repository; only `repositories/dataverse/` uses `DataverseClient` |
| 2 | `throw new Error('Customer not found')` | becomes a 500 | `throw new CustomerNotFoundError(id)` (an `ApplicationError`) |
| 3 | `throw new NotFoundException()` in a service | ties business code to HTTP | `ApplicationError`; the filter maps it to 404 |
| 4 | `return customer` (domain object) from a controller | leaks internals; getters aren't serialised; the API changes silently | `return CustomerResponseMapper.toResponse(customer)` |
| 5 | `@Inject('CustomerRepository')` string tokens | typo-prone, unchecked | abstract class token |
| 6 | `repository.create(input)` with a service Input | the repository depends on the service's input shape | `repository.create(customer)` with a domain object |
| 7 | `CustomerTableRow` / `statecode` / `100000001` outside `repositories/dataverse/` | CRM details leak; migration touches everything | map to domain values in `CustomerTableMapper` |
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
| 18 | The word "schema" used for the Dataverse table | clashes with Zod schemas in `dto/` | `<entity>.table.ts` / `CustomerTableRow` |
