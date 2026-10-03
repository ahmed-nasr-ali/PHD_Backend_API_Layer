# Module Wiring and Dependency Injection

## Feature module

```ts
// modules/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { DataverseModule } from '../../core/dataverse';
import { CustomersController } from './controllers/customers.controller';
import { CustomerRepository } from './repositories/customer.repository';
import { DataverseCustomerRepository } from './repositories/dataverse/dataverse-customer.repository';
import { CreateCustomerService } from './services/create-customer.service';
import { GetCustomerService } from './services/get-customer.service';

@Module({
  imports: [DataverseModule],
  controllers: [CustomersController],
  providers: [
    CreateCustomerService,
    GetCustomerService,
    { provide: CustomerRepository, useClass: DataverseCustomerRepository },
  ],
  exports: [CustomerRepository],
})
export class CustomersModule {}
```

## Depending on another feature

```ts
// modules/orders/orders.module.ts
@Module({
  imports: [DataverseModule, CustomersModule], // gives access to the exported CustomerRepository
  controllers: [CustomerOverviewController],
  providers: [
    PlaceOrderService,
    GetCustomerOverviewService,
    { provide: OrderRepository, useClass: DataverseOrderRepository },
  ],
})
export class OrdersModule {}
```

## Rules

| Do | Don't |
| --- | --- |
| Abstract class as token: `provide: CustomerRepository` | string tokens `'CustomerRepository'` + `@Inject(...)` |
| Inject by type: `constructor(private readonly customers: CustomerRepository)` | inject `DataverseCustomerRepository` (the implementation) anywhere |
| Export the abstract repository | export the implementation class |
| Import `DataverseModule` for `DataverseClient` | register `DataverseClient`, MSAL or `DynamicsWebApi` providers in a feature |
| Implementation `extends` the abstract repository and calls `super()` | `implements` an interface while using a string token |
| Choose an implementation when the module is defined (`static register(source)`) if a switch is ever needed | `useFactory: () => new XRepository(...)`, which bypasses DI |

## Switching implementation (only for a planned cut-over)

```ts
@Module({})
export class CustomersModule {
  static register(source: 'dataverse' | 'postgres'): DynamicModule {
    const postgres = source === 'postgres';
    return {
      module: CustomersModule,
      imports: [postgres ? PostgresModule : DataverseModule],
      controllers: [CustomersController],
      providers: [
        CreateCustomerService,
        GetCustomerService,
        {
          provide: CustomerRepository,
          useClass: postgres
            ? PostgresCustomerRepository
            : DataverseCustomerRepository,
        },
      ],
      exports: [CustomerRepository],
    };
  }
}
```

`DataverseModule` is not global. Each feature that needs it imports it, and Nest still creates a single instance, so the MSAL token cache is shared.
