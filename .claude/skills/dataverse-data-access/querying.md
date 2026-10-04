# Querying Dataverse Safely

## `$select`

Always pass explicit columns (`<ENTITY>_TABLE_COLUMNS` from `<entity>.table.ts`). Without `$select`, Dataverse returns every column: slower, and coupled to columns you never meant to read.

## `$filter` and injection

`DataverseQuery.filter` is a raw OData string. Never interpolate unchecked input.

```ts
// strings: escape with odataString (single quotes doubled)
filter: `emailaddress1 eq ${odataString(email)}`

// GUIDs are unquoted in OData: validate first
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!GUID.test(customerId)) {
  return [];
}
filter: `_new_customerid_value eq ${customerId}`

// numbers / choices: only from typed values (constants or number-typed variables)
filter: `new_status eq ${STATUS_TO_CHOICE.placed}`
```

Useful operators: `eq`, `ne`, `gt`, `lt`, `and`, `or`, `contains(name,'x')`, `startswith(...)`, `Microsoft.Dynamics.CRM.In(PropertyName='x',PropertyValues=[...])`.

## Ordering and limits

```ts
await this.dataverse.retrieveMultiple<OrderTableRow>(ORDER_TABLE, {
  select: ORDER_TABLE_COLUMNS,
  filter: `_new_customerid_value eq ${customerId}`,
  orderBy: ['createdon desc'],
  top: limit,
});
```

## Pagination

- Dataverse returns at most 5,000 rows per page, plus `@odata.nextLink` when more exist. **There is no `$skip`.**
- ⚠️ The current `DynamicsWebApiClient.retrieveMultiple` returns `response.value` and drops `oDataNextLink`, so it returns **only the first page**.
- For a paged list, first extend `core/dataverse`: a paged variant returning `{ items, nextLink }` (the `dynamics-web-api` request supports `maxPageSize`; the response carries `oDataNextLink`). Expose it through the abstract repository as an opaque cursor:

```ts
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
```

- Never promise offset/page-number paging in the API for Dataverse-backed lists.
- `$count` is capped (5,000) and costly; avoid "total pages" UIs.

## Related data (`$expand`)

| Need | Approach |
| --- | --- |
| Data from a single-valued lookup | `$expand=parentcustomerid_account($select=name)` |
| Small child collection on a single retrieve | `$expand=<collection nav prop>($select=…;$top=N)` |
| Large or paged children | separate query filtered on the lookup |

The current `DataverseClient` has no `expand` parameter (the library supports it). Add it to `DataverseClient` + `DynamicsWebApiClient` when first needed. **The abstract repository never changes for this.**

## Atomic multi-record writes

Each Web API call is its own transaction. For all-or-nothing writes across records, use a `$batch` changeset (`startBatch()` / `executeBatch()` in `dynamics-web-api`), exposed as **one** repository method (for example `createWithLines(order)`), never as a generic transaction API.

## Throttling

429 responses (service-protection limits) are not retried by `dynamics-web-api` or by the current `TokenRefreshRetryPolicy` (which handles only 401). Avoid bursts (parallelise with care, batch where sensible), and add a bounded `Retry-After` retry when it becomes a problem: a new `DataverseRetryPolicy` implementation (or a decorator wrapping the current one) in `core/dataverse/policies` + one `useClass` change in `DataverseModule`.
