# Tasks

## Step 1: Check invitation code (`POST /invitations/check-code`)

| # | Task | Status |
| --- | --- | --- |
| 1 | `core/dataverse`: `odataString()` helper for safe `$filter` values (`data-access/odata.ts`, exported from `index.ts`) | done |
| 2 | `core/dataverse`: `expand` support on `DataverseQuery` (nested `DataverseExpand`, exported from `index.ts`) | done |
| 3 | `invitations` domain: `domain/enums/` (`InvitedAs`, `Relationship`, `InvitationStatus`), `domain/models/` (`invitation.model.ts` with `createdOn` + T&C de-duplication per compound, `invitation.props.ts`, `invitation-compound.model.ts`), `domain/rules/pick-invitation-for-code.ts` (newest Confirmed) | done |
| 4 | `invitations` domain errors in `domain/errors/invitation.errors.ts`: `InvitationNotFoundError` (404), `InvitationInvalidError` (403), `InvitationAlreadyUsedError` (409), `InvitationRoleNotSupportedError` (422); codes from `domain/enums/invitation-error-code.enum.ts` | done |
| 5 | Abstract `InvitationRepository.findAllByCode(code)` (no ordering needed: "newest" is decided in the domain) | done |
| 5b | T&C only for Tenant invitations: `Invitation.termsAndConditions` returns `[]` unless `invitedAs` is `InvitedAs.Tenant` (2 only; not Tenant Family Member / REF / REF Owner) | done |
| 6 | Dataverse: `tables/` (one row type per CRM table, prefixed with the query's entity: `invitation`, `invitation-unit-link` (`com_invitationunits`), `invitation-unit` (`com_units`), `invitation-compound` (`com_compounds`)), `queries/invitation.query.ts` (`$select` columns + `$expand`), `invitation.table-mapper.ts`, `dataverse-invitation.repository.ts`; + `core/dataverse` `optionSetValue()` | done |
| 7 | `CheckInvitationCodeService` (`execute(code: string)`, no input file) | done |
| 8 | DTOs (request schema + response with `invitationId`), response mapper, controller (`@HttpCode(200)`) | done |
| 9 | `InvitationsModule` (exports the abstract `InvitationRepository`) + register in `AppModule` | done |
| 9b | Manual test on phdtest through Postman (`POST /invitations/check-code`): all cases behave as agreed | done |
| 10 | Tests: `domain/rules/pick-invitation-for-code.spec.ts`, `domain/models/invitation.model.spec.ts`, `repositories/dataverse/invitation.table-mapper.spec.ts` (28 tests, code ready and passing in a scratch copy) | cancelled for now |
| 10b | Jest setup: `"rootDir": "./"` in `tsconfig.json` (TypeScript 6 TS5011) + run Jest with `node --experimental-vm-modules` (NestJS 12 is ESM-only) | cancelled for now |
| 11 | CRM numbers in the domain: **decided (B)** — the domain keeps the CRM option-set values, compared through enums named after the option set (e.g. `InvitedAs.Helpers`, never a bare `3`). No conversion in the table-mapper or the response mapper | done |
| 12 | CRM names confirmed by a real query on phdtest: `com_compoundid`, `createdon` (UTC ISO), navigation properties `com_com_invitationrequest_com_invitationunit_InvitationRequest` → `com_Unit` → `com_Compound`. Dataverse rejects `$top` with this nested one-to-many expand | done |
| 13 | Update skills + docs to the new domain layout: `domain/enums/<name>.enum.ts`, `domain/models/<entity>.model.ts`, `domain/errors/<entity>.errors.ts`, `domain/rules/<rule>.ts` (replaces `domain/<entity>.ts` + `domain/<entity>.errors.ts`); `repositories/dataverse/tables/<entity>-<table>.table.ts` (row shapes, one per CRM table, prefixed with the entity whose query returns them, e.g. `InvitationCompoundTableRow`; folder is `tables/`, never "schema", which stays reserved for Zod) + `repositories/dataverse/queries/<entity>.query.ts` (`$select` + `$expand`) instead of one `<entity>.table.ts`; business error codes always from an enum (`domain/enums/<entity>-error-code.enum.ts`), never string literals. After step 1 works | done |
| 13a | Skill `nestjs-feature-architecture`: SKILL.md, folder-structure.md, domain-models.md, error-handling.md, common-mistakes.md | done |
| 13b | Skill `dataverse-data-access`: SKILL.md, mapping.md, querying.md, error-handling.md (`tables/` + `queries/`, `optionSetValue`, enums keep CRM values, `odataString`/`expand` now exist, no `$top` with nested one-to-many expand) | done |
| 13c | Skills `repository-design` (SKILL, testing incl. the Jest/TS6 findings, relational-repositories) + `crm-to-relational-migration` + `request-validation-and-dtos` (response example) | done |
| 13d | Docs: `structure.md`, `nestjs-crm-architecture-reference.md`, `flow.md`, `nestjs-crm-architecture-guide.md` (ch. 5, 6, 7, 10, 11, 14, 17), `review-and-corrections.md` (incl. codebase observations 5, 6, 8) | done |

## Step 2: Register — owner + invited user, one endpoint (`authentication` module)

| # | Task | Status |
| --- | --- | --- |
| 1 | Answer the open questions (`OPEN_QUESTIONS.md` section 2), agree on the design, split into tasks | done (S19, S20 left) |
| 2 | `authentication` domain (14 files): enums (`RegisteredAs`, `UserStatus`, `IdentityKind`, `UserErrorCode`, `AccountErrorCode`), models (`User` + props with `isProfileComplete` (S6b), `UserIdentity`, `UserRegistrationData`, `PhdAccount`), errors (`UserExistsError` 409, `NotPhdCustomerError` 403), rules (`resolveExistingUser` (S18), `ensurePhdCustomer` (S22)) | in progress |
| 3 | Abstract `UserRepository`: `findByMobileOrIdentity`, `create`, `update` | todo |
| 4 | Dataverse `com_users`: `tables/`, `queries/`, table-mapper, `DataverseUserRepository` (mobile `eq` E.164, S11) | todo |
| 5 | `invitations`: `InvitationRoleMismatchError` (+ code), `InvitationRepository.deactivate(id)`, mapping `InvitedAs` → `RegisteredAs` | todo |
| 6 | Request DTO: `z.discriminatedUnion('type')`, one schema per type, `identity { kind, number }`, field rules (S10); response DTO + mapper (S19) | todo |
| 7 | Strategies: `RegistrationStrategy` interface + `REGISTRATION_STRATEGIES` token + `RegistrationStrategyFactory`; shared invited step (code + id re-check, role match, deactivate on mismatch) | todo |
| 8 | 5 invited strategies: Family Member, Tenant, Tenant Family Member, REF, REF Owner | todo |
| 9 | `RegisterService`, `AuthenticationController` (`POST /auth/register`), `AuthenticationModule` (imports `InvitationsModule`) + `AppModule` | todo |
| 10 | Manual Postman test of the 5 invited types | todo |
| 11 | Owner: `OwnerRegistrationStrategy` (match `accounts`, create user, send OTP). Ask O4–O7 first | todo |
| 12 | Owner: `POST /auth/verify-otp`. Ask O6–O8 first | todo |
