---
name: request-validation-and-dtos
description: How the inbound HTTP edge works in this NestJS project (controllers/, dto/, mappers/). Covers which kind of validation goes where (Zod schema in dto/ vs domain rule vs service check vs storage constraint), validating with the project's zodBody/zodQuery/zodParam pipes, the response envelope, the difference between request DTO, service Input, response DTO and response mapper, and keeping controllers thin. Use when adding or changing an endpoint, a request or response DTO, a controller, or when deciding where a validation rule belongs.
---

# Request Validation, DTOs and Response Mapping

## Purpose

Validate requests at the edge, keep business rules out of DTOs, and keep HTTP shapes out of services, so that the public API and the business logic can change independently.

## When to use

- Adding or changing an endpoint, a request DTO or a response DTO
- Deciding where a validation rule belongs
- Reviewing controllers

Related: `nestjs-feature-architecture` (folders, services, errors), `dataverse-data-access` (storage constraints in Dataverse).

## Prerequisites

`src/core/validation/presets` exports:

- `zodBody(schema)`: validates a body; failure → **422**
- `zodQuery(schema)`: validates query strings; failure → **400**
- `zodParam(schema)`: validates route params; failure → **400**

A validation failure returns the error envelope with `code: "VALIDATION_FAILED"` and one `errors` entry per issue. `field` is the dotted path (`tags.0.name`); for a root-level issue it is the param name (`id`) or the source (`body`, `query`):

```json
{ "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [{ "field": "email", "message": "Invalid email address" }] }
```

`src/core/http` (already registered in `AppModule`) wraps every successful controller result as `{ success: true, statusCode, message: "OK", data }`. Controllers return the response DTO, never the envelope. See `nestjs-feature-architecture` → `error-handling.md`.

## Core concept: four kinds of checks

| Kind | Question | Where |
| --- | --- | --- |
| Request validation | Is the request well-formed? | Zod schema in `dto/<verb>-<entity>.dto.ts` |
| Intrinsic business rule | Is this valid for the business, regardless of other data? | `domain/` model (`create()` / methods) |
| Contextual business rule | Does it need stored data or the caller? (unique, exists, belongs to tenant, state allows) | `services/`, via repositories |
| Storage constraint | Guarantee under concurrency | Dataverse alternate key / SQL `UNIQUE`, translated by the repository |

**Decision question: "Do I need stored data to answer this?"** No means Zod (shape) or domain (business). Yes means service, plus a storage constraint when it must be guaranteed.

## The four shapes at the edge

```text
HTTP JSON ──zodBody──► CreateCustomerDto ──controller──► CreateCustomerInput ──► Service
                                                                                   │
HTTP JSON ◄── CustomerResponseDto ◄── CustomerResponseMapper ◄── Customer (domain) ◄┘
```

| Shape | What it is | File |
| --- | --- | --- |
| Request DTO | Zod schema + inferred type: what the client sends | `dto/create-customer.dto.ts` |
| Input | what the service needs (body + params + current user, real types) | `services/create-customer.input.ts` (next to its service) |
| Response DTO | type of the JSON returned to the client (shape only, no logic) | `dto/customer-response.dto.ts` |
| Response mapper | function: domain → response DTO | `mappers/customer-response.mapper.ts` |

Why the Input is separate from the request DTO (even with Zod): services must not import `dto/`; the public API and the internal input evolve independently (string date vs `Date`); and inputs combine body + params + authenticated user.

Response DTO vs response mapper: the DTO is the **form**, the mapper is **who fills it in**.

## Example

```ts
// dto/create-customer.dto.ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1).max(50), // mirror the Dataverse column max length
  lastName: z.string().trim().min(1).max(50),
  email: z.email().max(100),
  birthDate: z.iso.date(),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
```

```ts
// dto/customer-id.dto.ts
import { z } from 'zod';

/** Dataverse ids are GUIDs; z.guid() accepts any 8-4-4-4-12 hex id, z.uuid() is stricter. */
export const customerIdSchema = z.guid();
```

```ts
// dto/customer-response.dto.ts
import { CustomerStatus } from '../domain/enums/customer-status.enum';

/** The JSON shape returned to API clients. Option sets go out as their CRM numbers. */
export interface CustomerResponseDto {
  id: string;
  fullName: string;
  email: string;
  status: CustomerStatus | null;
}
```

```ts
// mappers/customer-response.mapper.ts
import { Customer } from '../domain/models/customer.model';
import { CustomerResponseDto } from '../dto/customer-response.dto';

/** Translates the Customer domain model into the API response. */
export class CustomerResponseMapper {
  static toResponse(customer: Customer): CustomerResponseDto {
    return {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      status: customer.status,
    };
  }
}
```

```ts
// controllers/customers.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { zodBody, zodParam } from '../../../core/validation/presets';
import type { CreateCustomerDto } from '../dto/create-customer.dto';
import { createCustomerSchema } from '../dto/create-customer.dto';
import { customerIdSchema } from '../dto/customer-id.dto';
import { CustomerResponseDto } from '../dto/customer-response.dto';
import { CustomerResponseMapper } from '../mappers/customer-response.mapper';
import { CreateCustomerService } from '../services/create-customer.service';
import { GetCustomerService } from '../services/get-customer.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerService,
    private readonly getCustomer: GetCustomerService,
  ) {}

  @Post()
  async create(
    @Body(zodBody(createCustomerSchema)) dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.createCustomer.execute({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      birthDate: new Date(`${dto.birthDate}T00:00:00Z`),
    });
    return CustomerResponseMapper.toResponse(customer);
  }

  @Get(':id')
  async findOne(
    @Param('id', zodParam(customerIdSchema)) id: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.getCustomer.execute(id);
    return CustomerResponseMapper.toResponse(customer);
  }
}
```

## NestJS implementation notes

- **`import type` for Zod-inferred types used in decorated parameters** (`import type { CreateCustomerDto }`). This repo uses `isolatedModules` + `emitDecoratorMetadata`; a value import fails with TS1272. `tsc` catches it, so it can't slip through. Don't add a lint auto-fix for type imports: it can't see decorator metadata and may break DI imports.
- `@Body({ schema })` exists in NestJS 12 but **does nothing unless a `StandardSchemaValidationPipe` is registered**. This project uses `zodBody` / `zodQuery` / `zodParam` instead; don't mix the two.
- Query strings and params are strings: use `z.coerce.number()`, `z.coerce.boolean()` and so on.
- The controller builds the Input inline. There is no mapper class for copying request fields.
- The controller calls exactly one service and declares its return type (`Promise<CustomerResponseDto>`). The global `ResponseInterceptor` wraps it in `{ success, statusCode, message, data }`; the controller never builds that envelope.

## CRM considerations

- Mirror Dataverse column limits (max length, numeric ranges) in DTO schemas so that bad input fails as a clear 422, not as an opaque Dataverse 400 that surfaces as a 502.
- Validate Dataverse ids with `z.guid()` (not `z.uuid()`).
- Uniqueness and existence can't be checked by Zod; they need the service plus a Dataverse **alternate key** for a guarantee.

## PostgreSQL / SQL Server considerations

Nothing in `controllers/`, `dto/` or `mappers/` changes on a storage migration. Only the storage constraint behind the repository changes (`UNIQUE` index instead of an alternate key).

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Database/CRM lookups inside a Zod `refine` | move to the service |
| Business rules (age ≥ 18) only in Zod | domain model; Zod can additionally check format |
| Service typed with `CreateCustomerDto` | service takes `CreateCustomerInput` |
| Returning the domain object or Result from the controller | response mapper |
| Logic inside a response DTO | DTOs are types only; logic goes in the mapper |
| A top-level `inputs/` folder, or a mapper class that copies request fields | `services/<verb>-<entity>.input.ts` next to its service; build it inline in the controller |
| Response shape changes edited in the domain | edit only `dto/<entity>-response.dto.ts` + `mappers/<entity>-response.mapper.ts` |
| Controller returns `{ success: true, data: … }` itself | return the response DTO; `ResponseInterceptor` wraps it |
| `zodQuery` on a route param | `zodParam` (same 400 behaviour, clearer intent) |

## Decision rules

- Format, type, length, range, enum → Zod in `dto/`.
- Intrinsic business invariant → `domain/` (may *also* be in Zod for a friendlier message).
- Needs stored data or the caller → `services/`.
- Must hold under concurrency → storage constraint + repository translation.
- Frontend wants a different JSON shape → response DTO + response mapper only.

## Practical checklist

- [ ] Request schema in `dto/<verb>-<entity>.dto.ts`, with the `z.infer` type exported as `<Verb><Entity>Dto`
- [ ] Body: `zodBody`; query: `zodQuery`; params: `zodParam`; ids: `z.guid()`
- [ ] String limits match the Dataverse columns
- [ ] Inferred types imported with `import type` in controllers
- [ ] Controller builds the Input (body + params + user) and calls one service
- [ ] Response type in `dto/<entity>-response.dto.ts`; mapping in `mappers/<entity>-response.mapper.ts`
- [ ] No business lookups in DTO schemas
