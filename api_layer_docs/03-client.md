# Dataverse — Step 3: The client

The client is the class that **sends requests to Dataverse**: read, create, update, delete. Repositories use it; nothing else in the app talks to Dataverse.

```
src/core/dataverse/client/
├── dataverse.client.ts                       DataverseClient       (abstract — the contract)
└── dynamics-web-api/
    └── dynamics-web-api.client.ts            DynamicsWebApiClient  (implementation — uses the dynamics-web-api library)
```

It brings the first two steps together:

```
Repository
   │  this.dataverse.retrieveMultiple(...)
   ▼
DynamicsWebApiClient
   │  run(send)
   ▼
RequestPolicy.execute(...)          step 2: 401 → new token → send again
   │
   ▼
dynamics-web-api library
   │  onTokenRefresh → TokenProvider.getCrmToken()     step 1
   ▼
Dataverse Web API
```

---

## 1. The contract: `DataverseClient`

```ts
// src/core/dataverse/client/dataverse.client.ts
export abstract class DataverseClient {
  abstract retrieve<T>(table: string, id: string, select?: string[]): Promise<T>;

  abstract retrieveMultiple<T>(table: string, query?: DataverseQuery): Promise<T[]>;

  abstract create(table: string, data: object): Promise<string>;

  /** Creates the record and returns it (the `select` columns) in the same request: `Prefer: return=representation`. */
  abstract createAndRetrieve<T>(table: string, data: object, select: string[]): Promise<T>;

  abstract update(table: string, id: string, data: object): Promise<void>;

  /** Updates the record and returns it (the `select` columns) in the same request: `Prefer: return=representation`. */
  abstract updateAndRetrieve<T>(table: string, id: string, data: object, select: string[]): Promise<T>;

  abstract delete(table: string, id: string): Promise<void>;
}
```

- This is what repositories inject: `constructor(private readonly dataverse: DataverseClient)`. They never see the library.
- It is exported from `core/dataverse` (`index.ts`) **and** from `DataverseModule` (`exports: [DataverseClient]`): the first lets repositories import the type, the second lets Nest inject the object.
- **`<T>`** is the row shape the repository expects (a `*TableRow` interface). The client does not check it; the repository's table-mapper turns it into a domain model.

### The methods

| Method | Sends | Returns |
|---|---|---|
| `retrieve(table, id, select?)` | `GET /table(id)` | One row |
| `retrieveMultiple(table, query?)` | `GET /table?$select&$filter…` | Array of rows |
| `create(table, data)` | `POST /table` | The new id |
| `createAndRetrieve(table, data, select)` | `POST /table` + `Prefer: return=representation` | The new row |
| `update(table, id, data)` | `PATCH /table(id)` | Nothing |
| `updateAndRetrieve(table, id, data, select)` | `PATCH /table(id)` + `Prefer: return=representation` | The updated row |
| `delete(table, id)` | `DELETE /table(id)` | Nothing |

**Why `…AndRetrieve` versions?** By default Dataverse answers a create or update with `204 No Content` (only the new id in a header). If the repository needs the row, it would have to send a second `GET`. With `returnRepresentation: true` the library adds `Prefer: return=representation`, and Dataverse returns the row (the `select` columns) in the same response: one request instead of two, and the row is exactly what was written. The plain versions stay for when only the id, or nothing, is needed.

### `DataverseQuery`

```ts
// src/core/dataverse/query/dataverse-query.types.ts
export interface DataverseQuery {
  select?: string[];      // $select   — columns to return
  filter?: string;        // $filter   — which rows
  orderBy?: string[];     // $orderby
  top?: number;           // $top      — max rows
  expand?: DataverseExpand[];   // $expand — related rows (lookups)
}
```

A plain options object (an `interface`, not a class): no logic, not injected. Example from a repository:

```ts
const rows = await this.dataverse.retrieveMultiple<InvitationTableRow>(
  INVITATION_TABLE,
  {
    select: INVITATION_COLUMNS,
    filter: `com_code eq ${odataString(code)}`,
    expand: INVITATION_EXPAND,
  },
);
```

Any text value inside `filter` goes through `odataString` (quotes it and escapes `'`), so user input cannot change the filter.

---

## 2. The implementation: `DynamicsWebApiClient`

```ts
// src/core/dataverse/client/dynamics-web-api/dynamics-web-api.client.ts
@Injectable()
export class DynamicsWebApiClient extends DataverseClient {
  constructor(
    private readonly api: DynamicsWebApi,
    private readonly requestPolicy: RequestPolicy,
  ) {
    super();
  }

  retrieve<T>(table: string, id: string, select?: string[]): Promise<T> {
    return this.run(() =>
      this.api.retrieve<T>({ collection: table, key: id, select }),
    );
  }

  async retrieveMultiple<T>(table: string, query?: DataverseQuery): Promise<T[]> {
    const response = await this.run(() =>
      this.api.retrieveMultiple<T>({ collection: table, ...query }),
    );
    return response.value;
  }

  // create, createAndRetrieve, update, updateAndRetrieve, delete: same shape

  private run<R>(send: () => Promise<R>): Promise<R> {
    return this.requestPolicy.execute(() =>
      send().catch((error) => {
        throw toDataverseException(error);
      }),
    );
  }
}

function toDataverseException(error: unknown): DataverseException {
  if (error instanceof DataverseException) return error;

  const { message, status } = (error ?? {}) as Partial<RequestError>;
  return new DataverseException(message ?? 'Dataverse request failed', status, {
    cause: error,
  });
}
```

### 2.1 The constructor

| Dependency | What it is | Where it comes from |
|---|---|---|
| `api: DynamicsWebApi` | The library object that builds and sends the HTTP requests | `dynamicsWebApiProvider` in `dataverse.providers.ts` (server URL, API version 9.2, `onTokenRefresh`) |
| `requestPolicy: RequestPolicy` | The contract from step 2 | `{ provide: RequestPolicy, useClass: RetryOnExpiredTokenPolicy }` |

- Both are `private readonly`: used by every method, used only by this class, never replaced.
- The field is named after the **contract** (`requestPolicy`), not the implementation. If the module switches to another policy, the client stays correct.
- `@Injectable()`: Nest creates the client (`useClass`), so it needs the decorator to read these two parameter types (see step 1).

### 2.2 Every method has the same shape

```ts
delete(table, id) {
  return this.run(() => this.api.deleteRecord({ collection: table, key: id }));
}
```

Each method only describes **its request**, as a function, and hands it to `run()`. No method has its own `try/catch`, retry or error handling; that is all in `run()`.

- `collection` = the table's plural name (e.g. `contacts`); `key` = the row id.
- No token is passed. The library gets it itself through `onTokenRefresh` before every request.

**`async`/`await` or not?**

| Case | Shape | Example |
|---|---|---|
| The method returns the library's result as it is | `return this.run(...)`, no `async` | `retrieve`, `create`, `…AndRetrieve` |
| The method must do something with the result first | `async` + `await` | `retrieveMultiple` (returns `response.value`), `update`/`delete` (return `void`) |

The library answers a list as `{ value: [...rows], oDataNextLink }`; `retrieveMultiple` returns only `value`.

> Known limit: `oDataNextLink` is dropped, so a list returns **the first page only** (up to 5,000 rows, or fewer with `top`). See `docs/review-and-corrections.md`, item 2.

### 2.3 `run()`: the two layers around every request

```ts
private run<R>(send: () => Promise<R>): Promise<R> {
  return this.requestPolicy.execute(() =>
    send().catch((error) => {
      throw toDataverseException(error);
    }),
  );
}
```

Two layers, two jobs:

| Layer | Job |
|---|---|
| Inner: `.catch(... toDataverseException ...)` | **Translate** the library's error into our `DataverseException` |
| Outer: `requestPolicy.execute(...)` | **Decide** what to do with the failure (step 2) |

**Why the translation must happen first (inside):**
The library throws its own error type (`RequestError`). The policy checks `error instanceof DataverseException && error.status === 401`. If the policy saw the raw `RequestError`, `instanceof` would be `false`, it would think "not a 401", and **never refresh the token**.

On a 401 the flow is:

```
api.deleteRecord()   → throws RequestError { status: 401 }
inner .catch         → DataverseException { status: 401 }
policy               → sees 401 → getCrmToken(true) → calls send again
```

**Why the translation is in the client:**
The client is the only class that knows the `dynamics-web-api` library. Everything after it (the policy, repositories, the global `DataverseExceptionFilter`) deals with `DataverseException` only. Replacing the library would mean changing this class only.

### 2.4 `toDataverseException()`

```ts
function toDataverseException(error: unknown): DataverseException {
  if (error instanceof DataverseException) return error;

  const { message, status } = (error ?? {}) as Partial<RequestError>;
  return new DataverseException(message ?? 'Dataverse request failed', status, {
    cause: error,
  });
}
```

| Input | Result |
|---|---|
| Already a `DataverseException` (e.g. from `getCrmToken`) | Returned as it is, not wrapped twice |
| A library `RequestError` | New `DataverseException` with its `message` and HTTP `status` |
| Anything else (network error, `null` …) | New `DataverseException` with a default message and no status |

- `Partial<RequestError>`: we cannot be sure the error really has `message`/`status`, so both are treated as optional.
- `{ cause: error }`: the original error is kept for logs.
- It is a plain function outside the class because it does not use `this`.

Repositories then read `error.status` to translate expected cases, for example:

```ts
if (error instanceof DataverseException && error.status === 404) {
  return null;   // row not found
}
```

---

## 3. Wiring

```ts
// dataverse.module.ts
@Module({
  providers: [
    dataverseConfigProvider,
    msalProvider,
    { provide: TokenProvider, useClass: MsalTokenProvider },
    dynamicsWebApiProvider,
    { provide: RequestPolicy, useClass: RetryOnExpiredTokenPolicy },
    { provide: DataverseClient, useClass: DynamicsWebApiClient },
  ],
  exports: [DataverseClient],
})
export class DataverseModule {}
```

- Only `DataverseClient` is exported. `TokenProvider`, `RequestPolicy` and the library are internal to the module.
- A feature module adds `DataverseModule` to its `imports`, and its Dataverse repositories inject `DataverseClient`.

---

## Summary

| Piece | Role |
|---|---|
| `DataverseClient` | Contract and DI token: the 7 operations repositories can use |
| `DataverseQuery` | Options for a list request: select, filter, orderBy, top, expand |
| `DynamicsWebApiClient` | Sends the requests with the `dynamics-web-api` library |
| Each method | Describes its request as a function and passes it to `run()` |
| `run()` | Inner: translate the error · outer: let the policy decide |
| `toDataverseException()` | Library error → `DataverseException` with message, status, cause |
| `…AndRetrieve` | Write and get the row back in one request |
