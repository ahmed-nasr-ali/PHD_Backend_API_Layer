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
| S18 | Find an existing user | by mobile **or** national ID / passport, for all types. None → create · one record found (by mobile, ID or both), unfinished, same role → reuse (its data is overwritten, the mobile too) · anything else → `USER_EXISTS`. Changed 2026-10-09: a record found by the ID is the same person (a national ID is never on 2 records); see `NOTES.md` | 2026-10-09 |
| S11 | Mobile match | `endswith(com_mobilenumber, <last 10 digits>)` for now: old records mix `+20…`, `0…`, `20…` (seen on phdtest). The rule compares the last 10 digits too. Exact E.164 match is in `ENHANCEMENTS.md` | 2026-10-08 |
| S20 | Firebase token | required in the body (`com_appnotificationtoken`) | 2026-10-08 |
| S21 | Fields per type | `z.discriminatedUnion('type')`, one `z.strictObject` per type: a missing field **or an extra field** (e.g. `birthDate` for an owner) → 422. Invited types never send the mobile (taken from the invitation) | 2026-10-08 |
| S22 | Owner `accounts` check | only when no user is found in `com_users`. Unfinished user reused → no `accounts` check. No account → `NOT_PHD_CUSTOMER` (403) | 2026-10-08 |
| S23 | How the register response is built | from the record the CRM saved: `create` / `update` send `Prefer: return=representation` and get the row back in the same request → `User` → response. No second request | 2026-10-08 |
| S19 | Register response | the user's basic data: `userId`, `name`, `mobile`, `email`, `registeredAs`, `status`, `identity { kind, number }`, `birthDate` (never password / OTP) | 2026-10-08 |
| S24 | Password length | at least 8 characters (plus digit + lower + upper + symbol) | 2026-10-08 |
| S25 | Email | trimmed, case kept (we never search by email) | 2026-10-08 |
| S26 | Link the invitation to the new user | yes, at register: `com_LinkedUser@odata.bind` on the invitation (the app does it right after create). The invitation stays Confirmed; Completed + `com_acceptedon` come after the documents (S15). Re-register links again (same user) | 2026-10-08 |
| S27 | Invited user, but the found user is **complete** | `USER_EXISTS` (go log in) + close the invitation like the app: Completed (statecode 1 / statuscode 2) + `com_acceptedon`, **not** linked to the existing user. "Found" = by the mobile or the ID (changed 2026-10-09 with S18). The other `USER_EXISTS` cases (2+ records with none complete, unfinished other type) leave the invitation Confirmed | 2026-10-09 |
| S28 | A found user is deactivated (`statecode` Inactive) | can't register again: 403 `USER_DEACTIVATED` ("This account is deactivated. Please contact support"), checked before anything else; nothing is written, the invitation stays Confirmed | 2026-10-09 |
| S17 | National ID / passport shape | `identity: { kind: 'national' \| 'passport', number }` | 2026-10-08 |

### Open

| # | Question | Status |
| --- | --- | --- |

## 3. Documents and files (study: `docs/files-study.md`)

### Open

| # | Question | Status |
| --- | --- | --- |
| F1 | Reach SharePoint through Microsoft Graph (needs an IT grant: `Sites.Selected` on one site) or keep calling the Power Automate flows from the backend? | decided (2026-10-09): Graph is the target; the flows adapter is a bridge until IT grants access. IT request not sent yet. Checked 2026-10-09: the app registration the backend uses for Dataverse has **no Graph application permissions**, so IT must add `Sites.Selected` (admin consent) and grant it `write` on our site; the same app can be reused |
| F2 | Serve files by streaming through our API, redirecting to a short-lived provider URL, or both? | decided (2026-10-09): **always stream through our API**, no redirect (Graph will make it fast enough) |
| F3 | Protect file links with signed URLs (expiry in the link) or a login-token header? | decided (2026-10-09): **two kinds of link**: private files (IDs, selfies, …) → signed link with expiry · public files for guest mode (events, news, …) → public link anyone can open. The server decides which kind per file source, never the link; which sources are public is agreed case by case when each endpoint is built |
| F4 | Keep the same SharePoint site / folders and the same CRM name/path fields, so the CRM team's review screens keep working? How does the CRM team open the documents today? | partly answered (2026-10-09): the `com_user` form has an **Attachments** tab (custom control: Browse / Delete / Upload per document). It shows the file name as a link; a click loads the file and opens it. It reads `com_<doc>name` + `com_<doc>path`. Stored path (sample user `f11e5ed2-…`) is URL-encoded **twice**: `%252fSandbox%2bAttachments%252fCommunity%2bApp%252fUser%2bAttachments%252f<name>` → `/Sandbox Attachments/Community App/User Attachments/<name>`, which equals `com_userattachmentsfolderpath` in `blser_generalsettings`; the site is `com_sharepointsiteaddress` = `https://phdint.sharepoint.com/teams/CRMCaseManagement` (shared site, production likely another library in it). One flat folder for all users; name = `<yyyyMMddHHmmss>_<doc>_<epoch ms>.<ext>` (e.g. `20260708063904_selfie_1783492741985.jpg`). We must write the same name, the same folder and the same double encoding. Still open: which flow/API the tab calls to load the file |
| F5 | Thumbnails from Graph or generated by us at upload? | decided (2026-10-09): **only from the store itself** (Graph thumbnails, Dataverse image-column thumbnail); we never generate them. A store without thumbnails (the flows) → the thumbnail link serves the full file |
| F6 | Limits: max size per document, allowed types | decided (2026-10-09): **per case**: every endpoint / document declares its own allowed types and max size, agreed when that endpoint is built |

## Later steps (from the handover docs)

### Owner registration

| # | Question | Status |
| --- | --- | --- |
| O1 | Unfinished user restarts with new name/email/password: overwrite the old record or keep it? | answered by S6 + S18 (2026-10-09): overwrite: the record is reused and all its data is replaced, the mobile too |
| O2 | Password hashing changes login for every user type: migrate all at once, or hash on next login? | open, for the login step: register stores the password as it is for now (S2) |
| O3 | Which status means "started, not submitted"? | answered by S6b + S7: no status for it. Every new user is Under Review (1); "unfinished" = no selfie (`com_profilepicturefilepath` empty), as the app does today |
| O4 | Is there a lookup field on `com_users` to link the matched `accounts` record? | answered 2026-10-08: `com_relatedaccount` exists, but register does **not** set it (same as the app today). The app links it **after login** (`relatedAccountProcess()` in `user_data.dart`: user not linked → `accounts` by `new_cbrnumber` = national ID **only** → first record → `com_RelatedAccount@odata.bind`). Decision (A): keep register as is; do the link when login moves to the backend. Known gap (same as today): owner accepted by mobile only (ID not in `accounts`) or by passport → never linked |
| O5 | Format of `accounts.new_mobilenumber` (`+20…`, leading `0`, …)? | answered 2026-10-08: local `01…` on phdtest, with duplicates (same mobile / ID on several accounts) → search with `endswith` last 10 digits, like `com_users` |
| O6 | OTP rules: expiry, max attempts, resend cooldown, max sends per hour. Where are counters stored? | answered 2026-10-09: expiry = 5 min, set by the plugin (see O7). Max attempts and max sends per hour → ENHANCEMENTS.md (need counter columns). Resend cooldown = 60 s, no new column: last send = `com_otpexpirydate` − 5 min. resend-otp: unknown `userId` → 404 · not an Owner → 403 · deactivated → 403 `USER_DEACTIVATED` · < 60 s since last send → 429 `OTP_RESEND_TOO_SOON` + `retryAfterSeconds` (capped at 60) · else → 200 + `com_requestotp = true` |
| O7 | Fix the `com_otpexpirydate` 6-hour offset in the CRM plugin, or in the API? | answered 2026-10-09 (phdtest test): column is `UserLocal` (stored in UTC). On resend (`com_requestotp = true`) the plugin **overwrites** any expiry we send with `now + 5 min` in UTC, makes a new `com_otp`, and sets `com_requestotp` back to `false`. No offset in the CRM: the app shows the UTC value as local time. Decision: the API never writes the expiry; verify checks `now <= com_otpexpirydate` (5 min, owned by the plugin). Create: confirmed 2026-10-09 from the audit history of `c1141473-…` (created by our API): create 20:54:35.914 with `com_requestotp = true` → 0.2 s later the plugin wrote `com_otpexpirydate = 20:59:36` (create + 5 min) and `com_requestotp = false`. Same on every later `com_requestotp = true` (9 times). Audit URL: `audits?$select=createdon,action,changedata&$filter=_objectid_value eq <userId>&$orderby=createdon asc` |
| O8 | Keep `/registration/cancel`, or expire unverified records with a scheduled job? | partly answered 2026-10-09: no cancel / delete endpoint (the app deletes the record to change the number; S18 reuse overwrites the mobile instead). Still open: clean up owners who never verified (scheduled job?) |
| O9 | Resend OTP (`com_requestotp = true` again): in the verify-otp task, or a task of its own? | answered 2026-10-09: same task (12d), own endpoint `POST /auth/resend-otp` |
| O11 | Who may call verify-otp? | answered 2026-10-09: unknown `userId` → 404 `USER_NOT_FOUND` · not an Owner → 403 `OTP_NOT_ALLOWED` · deactivated → 403 `USER_DEACTIVATED` · wrong OTP → 422 `OTP_INVALID` · expired → 422 `OTP_EXPIRED` (wrong is checked first) · else → 200 + `com_mobileverified = true`. Already-verified is **not** rejected: a user who verified, closed the app and registers again (S18 reuse) gets a new OTP and must be able to verify. So every Owner register writes `com_mobileverified = false` (the reuse may also change the mobile) |
| O10 | OTP length (4 or 6 digits) for the validation? | answered 2026-10-09: 4 digits (app `PinCodeTextField` length 4; plugin made `7563`, `3202` on phdtest) |

### Invited user registration

| # | Question | Status |
| --- | --- | --- |
| V7 | When the app sends `invitationId` back (e.g. to close the invitation), what proves the caller may act on it? Proposal: the request also carries the code, and the server checks the code belongs to that invitation and it is still Confirmed (never trust the id alone) | answered for register by S4 (id + code, re-checked). Open for the documents step, which closes the invitation (S15) |
| V1 | Add an OTP to the invitation's mobile? | open |
| V2 | Invited mobile already has a complete account: keep the invitation open, link it, or close it? | answered by S27 (2026-10-09): close it (Completed + `com_acceptedon`), not linked, `USER_EXISTS` |
| V3 | Where to store tenant T&C acceptance? | answered by S8: nowhere for now, mobile UI only; the API ignores it |
| V4 | May REF / REF Owner still change the name from the invitation? | answered by S9: yes, they send the name (required) |
| V5 | Who may receive a "request invitation": owners only, or tenants too? | open |
| V6 | REF Owner: are ID front and contract pages really optional? | open |
