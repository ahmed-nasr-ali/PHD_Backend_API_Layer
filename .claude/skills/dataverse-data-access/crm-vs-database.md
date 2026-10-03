# Dataverse Is Not a Database

## The pieces

| Term | In this project |
| --- | --- |
| Database | Azure SQL behind Dataverse. **Not accessible.** A read-only TDS endpoint exists for reporting; it is not an application data-access path. |
| CRM platform | Dynamics 365 / Dataverse: tables, relationships, security roles, business rules, plugins, flows, auditing, duplicate detection, model-driven apps used by staff |
| CRM API | Dataverse Web API, OData v4: `https://<org>.crm.dynamics.com/api/data/v9.2/` |
| Client library | `dynamics-web-api` (community library), wrapped by `DynamicsWebApiClient` |
| Authentication | Microsoft Entra ID OAuth 2.0 client credentials via `@azure/msal-node`; the app runs as a Dataverse **application user** with a security role |
| Data model | tables (logical name `contact`, entity set `contacts`), columns (`emailaddress1`), choices (integers), lookups (`_x_value`), navigation properties, `statecode`/`statuscode` |
| Our data-access layer | `core/dataverse` (connection) + feature `repositories/dataverse/` (translation) |

## What differs from PostgreSQL / SQL Server

| Concern | Relational DB | Dataverse | Design consequence |
| --- | --- | --- | --- |
| Latency | ~1 ms | an HTTPS round trip per call | `Promise.all`; fetch what a screen needs in one call (`$expand`) |
| Auth | per connection | OAuth bearer token per request | handled in `core/dataverse` |
| Authorisation | yours | security roles apply to the **application user** | end-user checks in services |
| Throttling | none | service-protection limits (requests, execution time, concurrency per user over a sliding window) → 429 + `Retry-After` | bounded retries; all traffic shares one user's budget |
| Transactions | multi-statement | one per request; atomic multi-op only via `$batch` changeset | design repositories so that atomic writes are one method |
| Query | SQL | `$select`, `$filter`, `$orderby`, `$top`, `$expand`, FetchXML; **no `$skip`** | cursor paging |
| Paging | offset/keyset | `@odata.nextLink`, ≤ 5,000 rows/page | abstract repositories return `{ items, nextCursor }` |
| Uniqueness | `UNIQUE` | alternate keys (enforced); duplicate detection is advisory | define alternate keys for real invariants |
| Ids | any | GUID; client may supply it on create | generate with `randomUUID()` in the service |
| Other writers | rarely | CRM staff, plugins, flows, integrations | `restore()` without rules; null-safe mappers |
| Server-side logic | triggers (rare) | plugins, business rules, workflows, rollups | know what fires on your writes; it can reject them |
| Consistency | strong | strong for direct reads; async plugins/flows are eventually consistent | don't read derived values right after a write |
