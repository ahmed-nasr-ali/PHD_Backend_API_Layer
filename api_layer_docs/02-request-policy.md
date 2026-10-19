# Dataverse — Step 2: The request policy

A request to Dataverse can fail for reasons that a second try would fix. Today we handle one of them: **the token was rejected (401)**. The cached token can expire or be revoked before MSAL notices; when that happens we get a new token and send the request again, once.

This logic lives in its own classes, not inside the client:

```
src/core/dataverse/policies/
├── request.policy.ts                          RequestPolicy              (abstract — the contract)
└── expired-token/
    └── retry-on-expired-token.policy.ts       RetryOnExpiredTokenPolicy  (implementation — 401 → new token → send again)
```

---

## 1. The contract: `RequestPolicy`

```ts
// src/core/dataverse/policies/request.policy.ts
export abstract class RequestPolicy {
  abstract execute<T>(send: () => Promise<T>): Promise<T>;
}
```

- **`send`** is a function that performs one request. The client builds it; the policy does not know what is inside (a retrieve, a create, a delete …).
- **`execute`** runs `send` and decides what to do if it fails: rethrow, or call `send` again.
- **`<T>`** is whatever the request returns (a row, a list, an id, nothing). The policy returns the same type, untouched.

**Why `send` takes no parameters?**
The contract must fit every future policy. A token parameter would only make sense for the token policy; a policy that waits and retries on 429/503 would have to accept a parameter it never uses. The token policy does not need it either (see [2.3](#23-how-the-new-token-reaches-the-second-try)).

**Why a general name (`RequestPolicy`) and not `RetryPolicy`?**
Retrying is one way to handle a failing request. A future policy could add a timeout or stop calling after many failures (circuit breaker). The contract describes the job ("decide how a request is run"); each implementation's name says what it does.

**Why an abstract class?** Same reason as `TokenProvider`: it exists at runtime, so Nest can use it as the injection token.

---

## 2. The implementation: `RetryOnExpiredTokenPolicy`

```ts
// src/core/dataverse/policies/expired-token/retry-on-expired-token.policy.ts
@Injectable()
export class RetryOnExpiredTokenPolicy extends RequestPolicy {
  constructor(private readonly tokenProvider: TokenProvider) {
    super();
  }

  async execute<T>(send: () => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch (error) {
      const isUnauthorized =
        error instanceof DataverseException && error.status === 401;
      if (!isUnauthorized) throw error;

      // MSAL caches the new token, so the library's onTokenRefresh picks it up on the next send.
      await this.tokenProvider.getCrmToken(true);
      return send();
    }
  }
}
```

The name reads as a sentence: **retry on expired token**.

### 2.1 The constructor

- `TokenProvider` is injected (the contract from step 1, not `MsalTokenProvider`). The policy does not care how tokens are obtained.
- `private readonly`: kept as a field because `execute()` uses it, only this class uses it, and it never changes.
- `@Injectable()`: Nest creates this class (`useClass`), so it needs the decorator to read the constructor's parameter types, as explained in step 1.

### 2.2 The method, step by step

**Step 1: first try**

```ts
try {
  return await send();
}
```

Most requests succeed here. `await` is required: without it, a failing promise would be returned before `catch` could see the error.

**Step 2: is it a 401?**

```ts
const isUnauthorized =
  error instanceof DataverseException && error.status === 401;
if (!isUnauthorized) throw error;
```

| Error | Result |
|---|---|
| `DataverseException` with status 401 | Continue to step 3 |
| Any other status (400, 404, 500 …) | Rethrown as it is; a new token would not help |
| Not a `DataverseException` | Rethrown as it is |

This check only works because the client turns the library's errors into `DataverseException` **before** they reach the policy (see step 3, the client).

**Step 3: refresh the token, then send again once**

```ts
await this.tokenProvider.getCrmToken(true);
return send();
```

- `getCrmToken(true)` skips MSAL's cache, gets a new token from Azure AD, and MSAL **stores it in its cache**.
- `send()` is called a second time. There is no `try` around it: if the second try fails too (even with 401 again), the error goes up to the caller. **One retry only**, so a real permission problem cannot cause an endless loop.

### 2.3 How the new token reaches the second try

`send()` has no token parameter, and the policy does not pass the token anywhere. It still works because of how the library gets its token:

```ts
// dataverse.providers.ts
onTokenRefresh: () => tokenProvider.getCrmToken(),
```

`dynamics-web-api` calls `onTokenRefresh` **before every request**. So:

```
send()                          1st try
  └─ onTokenRefresh → getCrmToken()      → old token from MSAL cache
  └─ Dataverse answers 401
getCrmToken(true)               new token from Azure AD → saved in MSAL cache
send()                          2nd try
  └─ onTokenRefresh → getCrmToken()      → new token from MSAL cache ✅
```

---

## 3. Wiring

```ts
// dataverse.module.ts
{ provide: RequestPolicy, useClass: RetryOnExpiredTokenPolicy },
```

"Whoever asks for `RequestPolicy` gets a `RetryOnExpiredTokenPolicy`." The client asks for `RequestPolicy` and never names the implementation:

```ts
constructor(
  private readonly api: DynamicsWebApi,
  private readonly requestPolicy: RequestPolicy,
)
```

---

## 4. Why a separate class (Open/Closed)

If the retry logic were written inside the client, it would be repeated in all 7 client methods, and every change to it would mean editing the client.

With the policy outside the client, **changing the behaviour means adding a class, not editing one**. For example, to also wait and retry when Dataverse is busy (429/503):

1. Add `policies/busy-server/retry-on-busy-server.policy.ts` (`RetryOnBusyServerPolicy extends RequestPolicy`).
2. Change one line in `DataverseModule`:
   ```ts
   { provide: RequestPolicy, useClass: RetryOnBusyServerPolicy },
   ```

`DynamicsWebApiClient` does not change.

**Naming rule for new policies:** contract at the folder root; each implementation in its own folder named after what makes it different; class name reads as a sentence (`RetryOn…Policy`).

---

## Summary

| Piece | Role |
|---|---|
| `RequestPolicy` | Contract and DI token: "run this request, decide what to do if it fails" |
| `send` | One request, built by the client; the policy may call it again |
| `RetryOnExpiredTokenPolicy` | 401 → new token → send again once · anything else → rethrown |
| `getCrmToken(true)` | Puts a new token in MSAL's cache |
| `onTokenRefresh` | Makes the library read that new token on the second try |
| `useClass` in `DataverseModule` | The one line that picks which policy is used |
