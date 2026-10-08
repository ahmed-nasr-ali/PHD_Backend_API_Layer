# Open Questions

One section per step. Answered questions stay in their section with the answer.

## 1. Check invitation code

### Answered

| # | Question | Answer | Date |
| --- | --- | --- | --- |
| I1 | Code format | 8 characters, upper-case letters and digits, e.g. `OG9O8OKR` | 2026-10-08 |
| I2 | Rate limit for code guessing | not in this step; listed in `ENHANCEMENTS.md` | 2026-10-08 |
| I3 | Household (`com_to` 3) | return `INVITATION_ROLE_NOT_SUPPORTED` | 2026-10-08 |
| I4 | Mobile in the response | full mobile, as today (`com_familymembermobilenumber`) | 2026-10-08 |
| I6 | Several units in the same compound | de-duplicate: one T&C text per compound | 2026-10-08 |
| I7 | Invitation not Confirmed | Completed → `INVITATION_ALREADY_USED`; any other status → `INVITATION_INVALID` | 2026-10-08 |
| I8 | Invalid body status | 422 (project default) | 2026-10-08 |
| I9 | Module placement | separate `invitations` module; later also holds send / accept / reject invitation | 2026-10-08 |
| I10 | Registration token | none. The next steps send the code again and the server re-validates it each time. | 2026-10-08 |
| I5 | Who decides the form fields after the check | the app, from `role` | 2026-10-08 |
| I11 | Code validation | only 8 letters/digits (`^[A-Za-z0-9]{8}$`), case not checked; searched as typed (Dataverse comparison is case-insensitive) | 2026-10-08 |
| I12 | Several invitations with the same code | use the Confirmed one only; if 2+ Confirmed, use the first one. The response is always one object, never a list | 2026-10-08 |
| I14 | Route | `POST /invitations/check-code` | 2026-10-08 |
| I15 | Format of `role` / `relationship` | CRM numbers as they are | 2026-10-08 |
| I19 | `role` number in the response | `com_to` from the invitation as it is (1, 21, 2, 4, 41) | 2026-10-08 |
| I20 | "First" Confirmed invitation | the newest (`createdon desc`) | 2026-10-08 |
| I23 | Error codes | no invitation with this code → `INVITATION_NOT_FOUND` (NotFound, 404) · other status or empty/unknown `com_to` → `INVITATION_INVALID` (Forbidden, 403) · Completed → `INVITATION_ALREADY_USED` (Conflict, 409) · Household → `INVITATION_ROLE_NOT_SUPPORTED` (RuleViolation, 422) | 2026-10-08 |
| I21 | `com_to` empty or unknown | `INVITATION_INVALID` | 2026-10-08 |
| I22 | Invitation without a name or mobile | return `null` in that field; the invitation stays valid | 2026-10-08 |
| I18 | Result rule | one or more Confirmed → valid (first one) · none Confirmed but a Completed exists → `INVITATION_ALREADY_USED` · otherwise → `INVITATION_INVALID` | 2026-10-08 |
| I13 | `INVITATION_ALREADY_USED` kind | `Conflict` (409) | 2026-10-08 |
| I16 | Invitation expiry | by status only | 2026-10-08 |
| I17 | Response fields | `invitationId`, `role`, `name`, `mobile`, `relationship`, `termsAndConditions[]` (`invitationId` added: the app sends it back in later steps, e.g. to close the invitation) | 2026-10-08 |

### Open

| # | Question | Status |
| --- | --- | --- |

## 2. Register (owner + invited user, one endpoint)

One endpoint for every user type. The body carries `type`; each type has its own required fields. Invited types also send `invitationId` + `code`. Only the owner gets an OTP.

| Type | Required fields |
| --- | --- |
| Owner | name, mobile, national ID **or** passport (one only), email, password |
| Family Member / Tenant Family Member | birth date, national ID **or** passport (one only), email, password |
| Tenant | national ID **or** passport (one only), email, password |
| REF / REF Owner | name, national ID **or** passport (one only), email, password |

### Answered

| # | Question | Answer | Date |
| --- | --- | --- | --- |
| S1 | OTP | owner only; invited types: no OTP | 2026-10-08 |
| S2 | Password hashing | no: store the password as it is (login still in the mobile) | 2026-10-08 |
| S3 | Module | `authentication` module, one register endpoint for owner + invited | 2026-10-08 |
| S4 | `invitationId` + `code` | yes: invited types send both, the server re-checks them (code belongs to that invitation, still Confirmed) | 2026-10-08 |
| S9 | REF / REF Owner name | they send the name (required) | 2026-10-08 |
| S15 | Close the invitation at register? | no: it stays Confirmed; closed later, after the documents are uploaded | 2026-10-08 |
| S16 | Design | factory picks owner vs invited; one strategy class **per invited type** (single responsibility; a new type = a new injected class) | 2026-10-08 |
| S12 | Body `type` ≠ invitation's `com_to` | reject with `INVITATION_ROLE_MISMATCH` (should not happen from the app) | 2026-10-08 |
| S13 | Value of `type` | `com_registeredas` option set: Owner 1, Family Member 2, Tenant 3, Helper 4 (not accepted), Tenant Family Member 5, REF 6, REF Owner 7. Invitation → type: `com_to` 1→2, 2→3, 21→5, 4→6, 41→7 | 2026-10-08 |
| S14 | Owner account | created at register (no separate step before creating it) | 2026-10-08 |
| S8 | Tenant T&C acceptance | mobile UI only; the API ignores it | 2026-10-08 |
| S12b | Close the invitation on a role mismatch | yes: set it to Deactivated (181410000) | 2026-10-08 |
| S14b | Owner OTP | register creates the account and sends the OTP; `POST /auth/verify-otp` marks the mobile verified | 2026-10-08 |
| S5 | Mobile or ID belongs to a complete user | `USER_EXISTS` | 2026-10-08 |
| S7 | Status of the new user | Under Review (1) | 2026-10-08 |
| S10 | Field rules | national ID exactly 14 digits; passport no length rule; email regex; password digit + lower + upper + symbol | 2026-10-08 |
| S6 | Unfinished user with the same mobile | reuse the record and overwrite email / password / ID with the new values, only if its role matches | 2026-10-08 |
| S6b | "Complete" vs "unfinished" | `com_profilepicturefilepath` empty = unfinished (all types), as the app does today | 2026-10-08 |
| S18 | Find an existing user | by mobile **or** national ID / passport, for all types. None → create · one record found by mobile, unfinished, same role → reuse · anything else → `USER_EXISTS` | 2026-10-08 |
| S11 | Mobile match | exact `com_mobilenumber eq` on E.164 (`+…`), no `endswith`; old data format to confirm with a browser query | 2026-10-08 |
| S20 | Firebase token | required in the body (`com_appnotificationtoken`) | 2026-10-08 |
| S21 | Fields per type | `z.discriminatedUnion('type')`, one `z.strictObject` per type: a missing field **or an extra field** (e.g. `birthDate` for an owner) → 422. Invited types never send the mobile (taken from the invitation) | 2026-10-08 |
| S22 | Owner `accounts` check | only when no user is found in `com_users`. Unfinished user reused → no `accounts` check. No account → `NOT_PHD_CUSTOMER` (403) | 2026-10-08 |
| S17 | National ID / passport shape | `identity: { kind: 'national' \| 'passport', number }` | 2026-10-08 |

### Open

| # | Question | Status |
| --- | --- | --- |
| S19 | Register response = the user's basic data: `userId`, `name`, `mobile`, `email`, `registeredAs`, `status`, `identity { kind, number }`, `birthDate` (never password / OTP). Confirm the fields | open |

## Later steps (from the handover docs)

### Owner registration

| # | Question | Status |
| --- | --- | --- |
| O1 | Unfinished user restarts with new name/email/password: overwrite the old record or keep it? | open |
| O2 | Password hashing changes login for every user type: migrate all at once, or hash on next login? | open |
| O3 | Which status means "started, not submitted"? | open |
| O4 | Is there a lookup field on `com_users` to link the matched `accounts` record? | open |
| O5 | Format of `accounts.new_mobilenumber` (`+20…`, leading `0`, …)? | open |
| O6 | OTP rules: expiry, max attempts, resend cooldown, max sends per hour. Where are counters stored? | open |
| O7 | Fix the `com_otpexpirydate` 6-hour offset in the CRM plugin, or in the API? | open |
| O8 | Keep `/registration/cancel`, or expire unverified records with a scheduled job? | open |

### Invited user registration

| # | Question | Status |
| --- | --- | --- |
| V7 | When the app sends `invitationId` back (e.g. to close the invitation), what proves the caller may act on it? Proposal: the request also carries the code, and the server checks the code belongs to that invitation and it is still Confirmed (never trust the id alone) | open |
| V1 | Add an OTP to the invitation's mobile? | open |
| V2 | Invited mobile already has a complete account: keep the invitation open, link it, or close it? | open |
| V3 | Where to store tenant T&C acceptance? | open |
| V4 | May REF / REF Owner still change the name from the invitation? | open |
| V5 | Who may receive a "request invitation": owners only, or tenants too? | open |
| V6 | REF Owner: are ID front and contract pages really optional? | open |
