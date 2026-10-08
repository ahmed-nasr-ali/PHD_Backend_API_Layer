# Testing With Repositories

## What to test where

| Target | File | Technique | Survives a storage migration |
| --- | --- | --- | --- |
| Domain models and rules | `domain/models/customer.model.spec.ts`, `domain/rules/<rule>.spec.ts` | plain unit tests | yes |
| Services | `services/create-customer.service.spec.ts` | unit tests with an in-memory repository fake | yes |
| Controllers / HTTP | `test/customers.e2e-spec.ts` | e2e with fake repositories bound in the testing module | yes |
| Table-mappers | `repositories/dataverse/customer.table-mapper.spec.ts` | pure tests: real-looking JSON in, domain out (nulls, unknown choices) | removed with the implementation |
| Dataverse repositories | `repositories/dataverse/dataverse-customer.repository.spec.ts` | mocked `DataverseClient`: assert table, `$select`, filter, 404 → null | removed with the implementation |
| Repository contract | `repositories/customer.repository.contract.ts` | one shared suite run against **every** implementation | yes, and it proves the new implementation matches |

## In-memory fake

```ts
class InMemoryCustomerRepository extends CustomerRepository {
  readonly items = new Map<string, Customer>();

  async findById(id: string) {
    return this.items.get(id) ?? null;
  }

  async findByEmail(email: string) {
    return [...this.items.values()].find((c) => c.email === email) ?? null;
  }

  async create(customer: Customer) {
    this.items.set(customer.id, customer);
  }
}
```

## Service test

```ts
it('rejects a duplicate email', async () => {
  const repo = new InMemoryCustomerRepository();
  const service = new CreateCustomerService(repo);
  await service.execute(input);

  await expect(service.execute(input)).rejects.toBeInstanceOf(
    EmailAlreadyInUseError,
  );
});
```

## Contract test sketch

```ts
// repositories/customer.repository.contract.ts
export function describeCustomerRepositoryContract(
  name: string,
  makeRepository: () => Promise<CustomerRepository>,
) {
  describe(`${name} satisfies CustomerRepository`, () => {
    it('returns null for an unknown id', async () => {
      const repo = await makeRepository();
      expect(await repo.findById(randomUUID())).toBeNull();
    });

    it('finds a created customer by email', async () => {
      const repo = await makeRepository();
      const customer = Customer.create(
        {
          id: randomUUID(),
          firstName: 'Mona',
          lastName: 'Adel',
          email: `${randomUUID()}@example.com`,
          birthDate: new Date('1990-05-14T00:00:00Z'),
        },
        new Date(),
      );
      await repo.create(customer);
      expect((await repo.findByEmail(customer.email))?.id).toBe(customer.id);
    });
  });
}

describeCustomerRepositoryContract('InMemory', async () => new InMemoryCustomerRepository());
// later: describeCustomerRepositoryContract('Postgres', async () => new PostgresCustomerRepository(testPool));
```

Run Dataverse contract tests only against a dedicated test environment, never production.

## ⚠️ Jest + NestJS 12 in this repository

Two problems block the first test inside `src/` (both reproduced and fixed in a scratch copy; not applied yet):

1. **TypeScript 6 (TS5011):** ts-jest reads `tsconfig.json`, which has `outDir` but no `rootDir`, so every suite fails before running. Fix: `"rootDir": "./"` in `tsconfig.json` (the build keeps its own `rootDir` in `tsconfig.build.json`).
2. **NestJS 12 is ESM-only:** any test that imports `@nestjs/common` fails with "Must use import to load ES Module". This includes files that import the `core/dataverse` barrel (it re-exports `DataverseModule`), e.g. table-mappers. Fix: run Jest with `node --experimental-vm-modules node_modules/jest/bin/jest.js` in the `test*` scripts.

Pure domain tests (no Nest imports) only need fix 1.
