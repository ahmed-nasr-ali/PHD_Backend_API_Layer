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
| 2 | `authentication` domain (12 files): enums (`RegisteredAs`, `UserStatus`, `IdentityKind`, one `AuthenticationErrorCode` for the module), models (`User` + props with `isProfileComplete` (S6b), `UserIdentity`, `UserRegistrationData`, `PhdAccount`), one `authentication.errors.ts` (`UserExistsError` 409, `NotPhdCustomerError` 403), rules (`resolveExistingUser` (S18), `ensurePhdCustomer` (S22)) | done |
| 3 | Abstract `UserRepository`: `findByMobileOrIdentity`, `create` / `update` (return the saved `User`, S23) | done |
| 4 | Dataverse `com_users`: `tables/user.table.ts` (read row + write row), `queries/user.query.ts`, `user.table-mapper.ts`, `DataverseUserRepository` (mobile `endswith` last 10 digits + `isSameMobile`, S11) | done |
| 5 | `invitations`: `InvitationRoleMismatchError` (+ code), `InvitationState` enum, `InvitationRepository.deactivate(id)` (Inactive + Deactivated); `authentication`: `registeredAsForInvitation` (`InvitedAs` → `RegisteredAs`) | done |
| 6 | Request DTO: `dto/fields/` (one Zod field per file) + `dto/register/` (one strict schema per type) + `register.dto.ts` (`discriminatedUnion('type')`); check-code made strict; response DTO + mapper from the saved `User` (S19, S23: `createAndRetrieve` / `updateAndRetrieve` in `core/dataverse`) | done |
| 7 | Strategies, built bottom-up (each piece only uses pieces already built): | done |
| 7a | `RegistrationStrategy`: the contract every strategy follows (`type` + `execute`) | done |
| 7b | `RegistrationInvitationVerifier`: checks the invitation only (code + id, mobile, type match → deactivate + `ROLE_MISMATCH`). Uses `InvitationRepository`, `pickInvitationForCode`, `registeredAsForInvitation` | done |
| 7c | `UserRegistrar`: finds + saves the user only (create / update / `USER_EXISTS`). Uses `UserRepository`, `resolveExistingUser` | done |
| 8 | 5 invited strategies (Family Member, Tenant Family Member, Tenant, REF, REF Owner): each uses 7b + 7c and says what it saves | done |
| 8b | `RegistrationStrategyFactory`: type → strategy (last, it needs the 5 strategies; the 5 are injected by class, no token) | done |
| 9 | `RegisterService`, `AuthenticationController` (`POST /auth/register`), `AuthenticationModule` (imports `InvitationsModule`) + `AppModule`. Until task 11, `type: 1` (Owner) passes the DTO but has no strategy → 500 (accepted, temporary). Isolated e2e (fake repositories, no CRM): 19/19 cases pass | done |
| 11 | Owner: `OwnerRegistrationStrategy` (match `accounts`, create user, send OTP via `com_requestotp = true`) | done |
| 11a | `accounts` search: `PhdAccountRepository` + Dataverse (table, query, mapper; `endswith` mobile OR ID, `top: 1`) | done |
| 11b | `requestOtp` on `UserRegistrationData` → `com_requestotp` (optional, default false) | done |
| 11c | `UserRegistrar` split into `findExisting` + `write` (invited keep `save`); `OwnerRegistrationStrategy` | done |
| 11d | Owner in the factory + the module (`PhdAccountRepository` provider). Isolated e2e: 25/25 pass (6 owner cases) | done |
| 12 | Owner: `POST /auth/verify-otp` + `POST /auth/resend-otp` (rules: O6, O7, O11 in `OPEN_QUESTIONS.md`; the plugin owns the OTP and its 5-min expiry, tested on phdtest 2026-10-09) | done (Postman on phdtest passed 2026-10-09) |
| 12-0 | `authentication` split into feature folders, each a Nest sub-module with all its layers: `register/` (everything that existed, `RegisterModule`, `RegisterController`) + `shared/domain/` (`RegisteredAs`, `UserStatus`/`UserState`, `AuthenticationErrorCode`, `UserDeactivatedError`); `authentication.module.ts` only imports `RegisterModule`. Moved with `git mv`, imports recomputed. `tsc` clean, isolated e2e 36/36 + mapper 2/2. Skill (`folder-structure.md`, `SKILL.md`, `strategies.md`) + `docs/structure.md` § 4c | done |
| 12f | `dto/` split into `requests/` (Zod schemas + `fields/`) and `responses/` (plain types) in `otp/`, `register/` and `invitations/`: 27 files moved with `git mv`, imports recomputed, only import lines changed. `tsc` + `oxlint` clean; isolated resend 15/15, verify 18/18, OTP domain 19/19, register 36/36, mapper 2/2. Skills (`folder-structure.md`, `SKILL.md`, `strategies.md`, `request-validation-and-dtos`) + docs (`structure.md`, `flow.md`, guide, reference) | done |
| 12a | Owner register writes `com_mobileverified = false` (a reused user may come back with a new mobile, and must be able to verify again). Mapper: `requestOtp` → `com_mobileverified: false` · no OTP → not sent. Isolated: mapper check 2/2 + e2e 36/36 | done |
| 12b | `otp/` domain + repository (own `OtpUser` model + `OtpUserRepository` over `com_users`, register untouched): read `com_otp`, `com_otpexpirydate`; rules `ensureCanUseOtp` + `ensureOtpValid`; `findById` (404 → null), `markMobileVerified`, `requestOtp`; errors `USER_NOT_FOUND` 404, `OTP_NOT_ALLOWED` 403, `OTP_INVALID` / `OTP_EXPIRED` 422 (`UserNotFoundError` moves to `shared/` when login needs it). Isolated: 19/19 (rules, mapper, repository with a fake client) + register 36/36 | done |
| 12c | `POST /auth/verify-otp` `{ userId, otp }`: DTO (OTP = 4 digits, string), input, service, `OtpController`, `OtpModule` (imported by `AuthenticationModule`). 200 → `{ userId, mobileVerified: true }`; every error 422 / 404 / 403 with its `code`. Isolated HTTP e2e 18/18 + OTP domain 19/19 + register 36/36 | done |
| 12d | `POST /auth/resend-otp` `{ userId }`: 60 s cooldown from `com_otpexpirydate − 5 min` → 429 `OTP_RESEND_TOO_SOON` + `retryAfterSeconds` in the body (capped at 60). Core: `BusinessErrorKind.TooManyRequests` + `RetryLaterError`, filter adds `retryAfterSeconds`. 200 → `{ userId, otpSent: true }`. Isolated HTTP e2e 15/15 + verify 18/18 + OTP domain 19/19 + register 36/36 | done |
| 12e | Isolated e2e (fake repositories): resend 15/15, verify 18/18, OTP domain 19/19, register 36/36. Manual cases for Postman on phdtest: `OTP_TEST_CASES.md` (18 cases, incl. register again after verify and the O7 create check) | done (Postman on phdtest passed 2026-10-09) |
| 13 | Invited types: link the invitation to the user after save (`com_LinkedUser`, S26), invitation stays Confirmed | done |
| 13a | `invitations`: `InvitationRepository.linkUser(invitationId, userId)` + Dataverse (`InvitationLinkUserWriteRow`); verifier returns the invitation `id` | done |
| 13b | The 5 invited strategies call `linkUser` after `registrar.save` | done |
| 14 | Invited + complete user found → `USER_EXISTS` + close the invitation (Completed + `com_acceptedon`, no link) (S27). Isolated e2e: 31/31 pass | done |
| 14a | Domain: `UserExistsError.hasCompleteAccount` set by `resolveExistingUser` (only the user with the invitation's mobile counts; a complete user found by ID only → false) | done |
| 14b | `invitations`: `InvitationRepository.complete(id)` + Dataverse (`InvitationCompleteWriteRow`) | done |
| 14c | `InvitedUserRegistrar`: save + link, or close on a complete user; the 5 strategies use it; module | done |
| 15 | A record found by the national ID is the same person (S18): `resolveExistingUser` drops the same-mobile check; reuse overwrites the mobile too; `hasCompleteAccount` = any found user is complete. Isolated e2e: 33/33 pass | done |
| 17 | Services take an Input, not a DTO: `services/register.input.ts` (union) + one `<type>-register.input.ts` next to each strategy; `birthDateSchema` turns the string into a `Date`; the controller passes the validated body as `RegisterInput` (checked by TypeScript). Isolated e2e: 33/33 pass | done |
| 18 | Full review of the register cycle against the skills, then a flow-chart doc for the team lead. Committed: e351c70 | done |
| 18a | Deactivated user (`statecode` Inactive) found → 403 `USER_DEACTIVATED`, nothing written, invitation untouched (`UserState` next to `UserStatus`, `statecode` read) | done |
| 18b | Zod max lengths = `com_users` columns (name / email / password / passport 100, token 300); `PhdAccountSearchColumns` types the `accounts` filter column; comments on national-id / passport | done |
| 18c | Dead code: unused `OwnerRegisterDto` import + 6 unused `<Type>RegisterDto` types | done |
| 18d | Flow-chart doc of every register case for the team lead: https://claude.ai/artifact/PkrLJofCgcqje2YAsjHtni (private until shared) | done |
| 18f | `RegistrationStrategyFactory`: `Record<RegisterInput['type'], RegistrationStrategy>` instead of array + `find` + `throw new Error` (a missing strategy fails `tsc`). Isolated e2e: 36/36 | done |
| 18g | Table-mappers moved to `repositories/dataverse/mappers/` (authentication: user, phd-account · invitations: invitation), imports fixed. Isolated e2e: 36/36 | done |
| 18h | Strategies grouped: `services/register/strategies/` holds the contract + factory and one folder per type (`<type>/<type>-registration.strategy.ts` + `<type>-register.input.ts`); helpers stay in `services/register/`; factory `for(input)`. Isolated e2e: 36/36 | done |
| 18e | Skills (+ the new `mappers/` path, 27 mentions in 10 files, + the `strategies/<type>/` layout): document the strategy + helpers pattern (`services/register/`) and the `User` without `create()` (S23) | done: new `nestjs-feature-architecture/strategies.md`; SKILL / folder-structure / common-mistakes (#22–25) / domain-models (model without `create()`, status + state); `request-validation-and-dtos` (body with several shapes, `.transform`, `abort`, max lengths from metadata); `mappers/` path in `dataverse-data-access`, `repository-design`, `crm-to-relational-migration` |
| 18i | Docs (`docs/structure.md`, `nestjs-crm-architecture-guide.md`, `-reference.md`, `review-and-corrections.md`): `mappers/` path + strategies | done (`review-and-corrections.md` only mentions "table-mapper" in general words, no path: left as it is) |
| 10 | Manual Postman test on phdtest of all 6 types. First round (invited, owner) passed; extra cases in `REGISTER_TEST_CASES.md` passed (2026-10-09) | done |
| 16 | Clean-up before OTP: `birthDate` returns one message only (`abort: true`); remove the unused `isSameMobile` (file deleted, the 10 digits are inline in the 2 repositories) | done |

## Step 3: Files — upload / update / delete / get, served as network files (`core/files`)

Study: [docs/files-study.md](docs/files-study.md) · decisions F1–F6 in `OPEN_QUESTIONS.md` section 3 · IT request: [docs/it-request-sharepoint-access.md](docs/it-request-sharepoint-access.md).

| # | Task | Status |
| --- | --- | --- |
| 0 | Study + decisions: F1 decided (Graph target, flows until IT grants), F4 answered (same folder, name format, double-encoded path), F2 always stream, F3 signed (private) + public (guest mode) links, public sources agreed per case, F5 thumbnails only from the store, F6 per case | done |
| 1 | `core/files` contract: ports `FileReader` / `FileWriter` / `FileStorage` (upload, replace, delete, get), types (file key, content, metadata), `InMemoryFileStorage`, one contract test suite every adapter must pass. No SharePoint | todo |
| 2 | File settings: read site + folder paths (+ flow URLs, never logged) from `blser_generalsettings`, cached; one settings port so the source can change | todo |
| 3 | Power Automate flows adapter (bridge): create / retrieve / delete flows behind `FileStorage`; replace = create with `oldfilepath`. Check first whether the create flow works without `entityname` (else it writes the CRM fields itself) | todo |
| 4 | File links: private = signed token (source + key + version + expiry), public (guest mode) = no expiry, kind chosen by the server per source; `FileLinkFactory` + `GET /files/:token` (always streamed, ETag / 304, Range, thumbnails per F5) | todo |
| 5 | `POST /auth/documents` (multipart): required documents per type, size / type checks, images re-encoded (no EXIF / GPS), same name + double-encoded path as the CRM tab reads, clean-up on failure, then Under Review + close the invitation | todo |
| 6 | Handover note for the mobile team: multipart upload, links in bodies, `cached_network_image`, thumbnails, no future in `build()` | todo |
| 7 | Graph adapter (when IT grants access): same contract tests; switch with one config value | blocked (IT) |
| later | With their own modules: Dataverse image reader (events, news, sales launches, compounds), service-catalog "operation" flow, Facility Management flow | later |
