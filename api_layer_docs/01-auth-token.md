# Dataverse — Step 1: Getting a token

Every request to Dataverse needs an Azure AD access token. This step covers the two classes that get one:

```
src/core/dataverse/auth/
├── token.provider.ts              TokenProvider       (abstract — the contract)
└── msal/
    └── msal-token.provider.ts     MsalTokenProvider   (implementation — uses @azure/msal-node)
```

---

## 1. The contract: `TokenProvider`

```ts
// src/core/dataverse/auth/token.provider.ts
export abstract class TokenProvider {
  abstract getCrmToken(forceRefresh?: boolean): Promise<string>;
}
```

The rest of the code only knows this class. It says *what* we need (a token as a string), not *how* we get it.

- **Why an abstract class and not an interface?** Interfaces disappear after compilation, so Nest cannot use them as an injection token. An abstract class exists at runtime, so it works as a contract **and** as a DI token:
  ```ts
  { provide: TokenProvider, useClass: MsalTokenProvider }
  ```
- **`forceRefresh`**: `true` skips the cached token and asks Azure AD for a new one. It is optional, so the normal call is just `getCrmToken()`.

To get tokens a different way later (for example a managed identity), add a new implementation in its own folder (`auth/managed-identity/`) and change the one `useClass` line. No code that uses `TokenProvider` changes.

---

## 2. The implementation: `MsalTokenProvider`

```ts
// src/core/dataverse/auth/msal/msal-token.provider.ts
@Injectable()
export class MsalTokenProvider extends TokenProvider {
  private readonly scope: string;

  constructor(
    private readonly msal: ConfidentialClientApplication,
    config: DataverseConfig,
  ) {
    super();
    this.scope = `${config.url}/.default`;
  }

  async getCrmToken(forceRefresh = false): Promise<string> {
    let result: AuthenticationResult | null;
    try {
      result = await this.msal.acquireTokenByClientCredential({
        scopes: [this.scope],
        skipCache: forceRefresh,
      });
    } catch (error) {
      throw new DataverseException('Failed to acquire Azure AD token', undefined, { cause: error });
    }

    if (!result?.accessToken) {
      throw new DataverseException('Azure AD returned no access token');
    }

    return result.accessToken;
  }
}
```

It uses the `@azure/msal-node` package with the **client credentials** flow: the app logs in as itself (client id + client secret), with no user involved.

### 2.1 The constructor: two dependencies, two lifetimes

```ts
constructor(
  private readonly msal: ConfidentialClientApplication,
  config: DataverseConfig,
) {
  super();
  this.scope = `${config.url}/.default`;
}
```

**`msal`: kept as a field, used on every call**

- `ConfidentialClientApplication` is the MSAL client. It is created once in `dataverse.providers.ts` (`msalProvider`) with the tenant id, client id and secret, and Nest injects it here.
- `private readonly` in front of a constructor parameter makes TypeScript save it as a field (`this.msal`). It is used inside `getCrmToken()` on every call, so it must live as long as the object.
  - `private`: only this class can use it. Nobody outside should call MSAL directly.
  - `readonly`: set once in the constructor and never replaced.
- MSAL also **caches** the token. Because the same `msal` object is kept, its cache is reused across calls, and Azure AD is only contacted when the token is missing, about to expire, or `forceRefresh` is used.

**`config`: used only inside the constructor**

- `config` has **no** modifier (`private`, `readonly`, `public`), so it is a plain parameter. It exists only while the constructor runs, and `this.config` does not exist.
- That is on purpose: the class needs only one value from the config, the scope. It builds that value once and keeps the result:
  ```ts
  this.scope = `${config.url}/.default`;   // e.g. https://org.crm.dynamics.com/.default
  ```
- Why not keep the whole config?
  - **Keep only what you use:** the class holds a string, not an object that also contains the client secret.
  - **Build it once:** the scope is computed once, not on every `getCrmToken()` call (which runs before every Dataverse request).

`scope` is declared as `private readonly scope: string;` for the same reasons as `msal`: internal detail, and it never changes after the constructor.

> `/.default` tells Azure AD: "give me a token with all the permissions this app was granted for this resource (the Dataverse URL)".

### 2.2 The method: `getCrmToken()`

```ts
async getCrmToken(forceRefresh = false): Promise<string>
```

- `forceRefresh = false`: by default, use the cache. `getCrmToken()` with no argument is the normal call.

**Step 1: ask MSAL for a token**

```ts
result = await this.msal.acquireTokenByClientCredential({
  scopes: [this.scope],
  skipCache: forceRefresh,
});
```

| `forceRefresh` | What MSAL does |
|---|---|
| `false` (default) | Returns the cached token if it is still valid; otherwise asks Azure AD |
| `true` | Skips the cache, asks Azure AD for a new token, and **stores it in the cache** |

`getCrmToken(true)` is used by the retry policy after Dataverse answers 401 (the token was rejected). Because MSAL stores the new token in its cache, the next normal `getCrmToken()` returns it.

**Step 2: translate a failure into our own error**

```ts
} catch (error) {
  throw new DataverseException('Failed to acquire Azure AD token', undefined, { cause: error });
}
```

- MSAL throws its own error types. We wrap them in `DataverseException`, so the rest of the app deals with one error type only.
- `undefined`: there is no HTTP status from Dataverse here, because we never reached it.
- `{ cause: error }`: keeps the original MSAL error for logs and debugging.

**Why `let result` and not `const`?** `result` gets its value inside `try` but is used after it. A `const` must get its value on the line where it is declared, and a variable declared inside `try { }` does not exist outside it. Keeping `try` around the MSAL call only also means the "no access token" error below is not caught and replaced by "Failed to acquire Azure AD token".

**Step 3: make sure there is a token**

```ts
if (!result?.accessToken) {
  throw new DataverseException('Azure AD returned no access token');
}
return result.accessToken;
```

MSAL's return type allows `null`. If no token came back, fail with a clear message instead of sending a request with an empty `Authorization` header.

### 2.3 `@Injectable()`

```ts
@Injectable()
export class MsalTokenProvider extends TokenProvider {
```

- The class is registered with `useClass`, so **Nest creates it** (`new MsalTokenProvider(...)`), not our code:
  ```ts
  // dataverse.module.ts
  { provide: TokenProvider, useClass: MsalTokenProvider }
  ```
- To call the constructor, Nest must know what to pass: a `ConfidentialClientApplication` and a `DataverseConfig`. TypeScript removes types after compilation; it keeps the constructor's parameter types (`design:paramtypes`) **only when the class has a decorator**. `@Injectable()` is that decorator.
- Without it, Nest cannot see what the constructor needs, and the app fails at startup.

**Rule:** put `@Injectable()` on every class that Nest creates. A class with no constructor dependencies would work without it, but keep it anyway: it marks the class as a provider, and adding a dependency later will not break the app.

---

## Summary

| Piece | Role |
|---|---|
| `TokenProvider` | Contract and DI token: "give me a token" |
| `MsalTokenProvider` | Gets the token from Azure AD with MSAL (client credentials) |
| `msal` (`private readonly`) | Kept as a field: used on every call, and holds the token cache |
| `config` (plain parameter) | Used once to build `scope`, then dropped |
| `getCrmToken(forceRefresh?)` | Cached token by default; a fresh one after a 401 |
| `@Injectable()` | Lets Nest read the constructor and inject its dependencies |
