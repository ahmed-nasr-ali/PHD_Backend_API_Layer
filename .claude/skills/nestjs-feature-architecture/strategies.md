# One Operation, a Flow per Type (Strategies)

Use this when **one endpoint** does the same job for several kinds of caller, and each kind needs its own fields and its own steps. The register endpoint is the live example: one `POST /auth/register` for six user types (`src/modules/authentication/register/services/register/`).

Don't use it for a single flow with a couple of `if`s. Two or three small branches belong in the service itself.

## Shape

```text
services/
├── register.service.ts                  RegisterService.execute(input): picks the strategy, runs it
├── register.input.ts                    RegisterInput = union of the per-type inputs
└── register/
    ├── user-registrar.ts                helper shared by the strategies (find + save the user)
    ├── invited-user-registrar.ts        helper (save + keep the invitation in step)
    ├── registration-invitation.verifier.ts  helper (check the invitation)
    └── strategies/
        ├── registration.strategy.ts     the contract: `type` + `execute(input)`
        ├── registration-strategy.factory.ts  type → strategy
        ├── owner/
        │   ├── owner-registration.strategy.ts
        │   └── owner-register.input.ts
        ├── family-member/
        │   ├── family-member-registration.strategy.ts
        │   └── family-member-register.input.ts
        └── …one folder per type
```

| Piece | Job | Rule |
| --- | --- | --- |
| Service | the one entry point the controller calls | only asks the factory and runs the strategy |
| Input (per type) | what that strategy needs | plain interface next to its strategy, real types (`Date`, enums); `type` is a literal (`RegisteredAs.Owner`) |
| Input (union) | what the service takes | `services/<operation>.input.ts`: `type RegisterInput = OwnerRegisterInput \| …` |
| Contract | what every strategy has | abstract class: `readonly type` + `execute(input)` |
| Strategy | the flow for one type | one class per type, `@Injectable()`, composes helpers |
| Factory | type → strategy | a `Record` keyed by the union's `type` (below) |
| Helpers | steps several strategies share | small `@Injectable()` classes in `services/<operation>/`; never a base class |

## The factory: a `Record`, not `find` + `throw`

```ts
@Injectable()
export class RegistrationStrategyFactory {
  /** One strategy per accepted type: a type without a strategy fails `tsc`, so `for()` never misses at runtime. */
  private readonly strategies: Record<RegisterInput['type'], RegistrationStrategy>;

  constructor(owner: OwnerRegistrationStrategy, familyMember: FamilyMemberRegistrationStrategy /* … */) {
    this.strategies = {
      [RegisteredAs.Owner]: owner,
      [RegisteredAs.FamilyMember]: familyMember,
      // …
    };
  }

  /** input → the strategy for its type */
  for(input: RegisterInput): RegistrationStrategy {
    return this.strategies[input.type];
  }
}
```

`RegisterInput['type']` is "the values `type` can have in the input", here 1, 2, 3, 5, 6, 7. `Record<…>` demands one entry for each, so:
- a new input type without a strategy is a compile error, not a 500 for a real user;
- `for()` needs no `throw new Error(...)`: the missing case can't exist;
- a value the API doesn't accept (Helper, 4) can't be passed in.

The compiler checks that every key has *a* strategy, not that it is the *right* one. Keep the six lines in the constructor in the same order as the enum so a swap stands out.

## Strategies compose helpers; they don't inherit

```ts
@Injectable()
export class TenantRegistrationStrategy extends RegistrationStrategy {
  readonly type = RegisteredAs.Tenant;

  constructor(
    private readonly invitationVerifier: RegistrationInvitationVerifier,
    private readonly registrar: InvitedUserRegistrar,
  ) {
    super();
  }

  /** check the invitation → save the user (InvitedUserRegistrar handles the invitation) */
  async execute(input: TenantRegisterInput): Promise<User> {
    const invitation = await this.invitationVerifier.verify(input.code, input.invitationId, this.type);
    return this.registrar.register(invitation.id, { /* what a tenant saves */ });
  }
}
```

Each strategy reads top to bottom as the steps for its type. Shared steps are injected helpers, not a template-method base class: a base class hides the flow and forces every type into the same skeleton.

## Controller → service

The validated body (`z.discriminatedUnion('type', [...])`) already has the input's shape, so the controller assigns it and TypeScript checks the two match. See `request-validation-and-dtos` → "A body with several shapes".

```ts
const input: RegisterInput = dto;
const user = await this.register.execute(input);
```

## Module wiring

Every strategy, the factory and every helper are providers of the feature module. Nest resolves the factory's constructor by class, so no tokens are needed.

## Adding a type

1. `strategies/<type>/<type>-register.input.ts` and add it to the union in `register.input.ts`.
2. The Zod schema in `dto/register/` and add it to the `discriminatedUnion`.
3. `strategies/<type>/<type>-registration.strategy.ts`.
4. One line in the factory (`tsc` fails until you add it) and one provider in the module.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Strategies typed with the request DTO | per-type Input next to the strategy; nothing in `services/` imports `dto/` |
| Factory with `find` + `throw new Error('No strategy')` | `Record<Input['type'], Strategy>` |
| A base strategy class with the shared steps | inject helper classes; the strategy calls them in order |
| Helpers or the factory loose next to the service | `services/<operation>/` for helpers, `services/<operation>/strategies/` for the contract, the factory and the per-type folders |
| One strategy per *branch* inside a type | one per type; small branches stay `if`s inside it |
