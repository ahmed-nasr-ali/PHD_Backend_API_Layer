# OTP — manual test cases (Postman, phdtest)

New endpoints, Owner only:
- `POST /auth/resend-otp` `{ userId }`: asks the CRM for a new code (60 s between two sends)
- `POST /auth/verify-otp` `{ userId, otp }`: checks the code on the server, then `com_mobileverified = true`

Every case is a **real request you can paste as it is**, with the response you should get. Replace only the `<...>` values.

> ⚠️ These tests **write to phdtest**: Part 3 and Part 5 send a **real SMS** to your mobile; Part 4 sets `com_mobileverified` on your owner record.

**Every request:** `POST http://localhost:3000/auth/<endpoint>`, header `Content-Type: application/json`, body raw → JSON.

**Your owner record** (used in most cases): `c1141473-5ac3-f111-aaaf-7ced8dc64ae6` ("Test Owner", `+201063079418`).

**Check it in the CRM** (paste in the browser):

```
https://phdtest.crm4.dynamics.com/api/data/v9.1/com_users(c1141473-5ac3-f111-aaaf-7ced8dc64ae6)?$select=com_registeredas,statecode,com_otp,com_otpexpirydate,com_requestotp,com_mobileverified,modifiedon
```

`com_otpexpirydate` and `modifiedon` are UTC (`Z`): Egypt is UTC+3, so 09:35 in Cairo shows as `06:35Z`.

**Run in order:** part 0 → 1 → 2 → 3 → 4 → 5. Part 4 must start **within 5 minutes** of 3.1 (the code lives 5 minutes).

---

## Part 0 — Before you start

Open the URL above and check: `com_registeredas = 1` (Owner) and `statecode = 0` (Active). If not, the cases below return 403.

---

## Part 1 — Validation (422, nothing reaches the CRM)

### 1.1 Code of 3 digits

`POST /auth/verify-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "otp": "123" }
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "otp", "message": "Code must be exactly 4 digits" } ]
}
```

### 1.2 Code sent as a number

The code is a string, so a leading 0 (`"0123"`) is kept.

`POST /auth/verify-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "otp": 1234 }
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "otp", "message": "Invalid input: expected string, received number" } ]
}
```

### 1.3 Bad user id

`POST /auth/verify-otp`

```json
{ "userId": "abc", "otp": "1234" }
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "userId", "message": "User id is not valid" } ]
}
```

### 1.4 Extra field

`POST /auth/verify-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "otp": "1234", "mobile": "+201063079418" }
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "body", "message": "Unrecognized key: \"mobile\"" } ]
}
```

### 1.5 Resend without a user id

`POST /auth/resend-otp`

```json
{}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "userId", "message": "User id is not valid" } ]
}
```

---

## Part 2 — Who may use it (no SMS)

### 2.1 User that doesn't exist → 404

A valid id with no record: this checks that the CRM's own 404 becomes ours (not a 502).

`POST /auth/resend-otp`

```json
{ "userId": "00000000-0000-0000-0000-000000000001" }
```

```json
{ "success": false, "statusCode": 404, "code": "USER_NOT_FOUND", "message": "User not found", "data": null }
```

### 2.2 Invited user (Tenant, Family Member, …) → 403

Any `userId` of an invited user, e.g. from the register tests.

`POST /auth/verify-otp`

```json
{ "userId": "<invited user's userId>", "otp": "1234" }
```

```json
{ "success": false, "statusCode": 403, "code": "OTP_NOT_ALLOWED", "message": "Only owners verify their mobile with a code", "data": null }
```

Same body without `otp` on `POST /auth/resend-otp` → the same response, and **no SMS**.

### 2.3 Deactivated user → 403

The record you deactivated for the register tests (Part 3 there).

`POST /auth/resend-otp`

```json
{ "userId": "<deactivated user's userId>" }
```

```json
{ "success": false, "statusCode": 403, "code": "USER_DEACTIVATED", "message": "This account is deactivated. Please contact support", "data": null }
```

**Check:** no SMS.

---

## Part 3 — Resend

### 3.1 Resend → 200 + SMS

`POST /auth/resend-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6" }
```

```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": { "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "otpSent": true }
}
```

**Check:** the SMS arrives · in the CRM (after ~5 s) a **new** `com_otp`, `com_otpexpirydate` = now + 5 min (UTC), `com_requestotp = false`. Write the time down: Part 4 must finish 4.1–4.3 within 5 minutes.

### 3.2 Resend again at once → 429

`POST /auth/resend-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6" }
```

```json
{
  "success": false, "statusCode": 429, "code": "OTP_RESEND_TOO_SOON",
  "message": "Please wait 52 seconds before requesting a new code",
  "data": null, "retryAfterSeconds": 52
}
```

The number is whatever is left of the 60 s (≤ 60). **Check:** no SMS · `com_otp` unchanged in the CRM.

---

## Part 4 — Verify (within 5 minutes of 3.1)

### 4.1 Wrong code → 422

Any 4 digits that are not the code from the SMS.

`POST /auth/verify-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "otp": "<4 digits, not the SMS code>" }
```

```json
{ "success": false, "statusCode": 422, "code": "OTP_INVALID", "message": "The code is incorrect", "data": null }
```

**Check:** `com_mobileverified = false`.

### 4.2 Right code → 200

`POST /auth/verify-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "otp": "<code from the SMS>" }
```

```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": { "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "mobileVerified": true }
}
```

**Check:** `com_mobileverified = true`.

### 4.3 Same code again → 200

Verifying twice is allowed on purpose (O11): a user who verified, closed the app and comes back must not get stuck. Same body as 4.2, same response.

### 4.4 Right code after 5 minutes → 422 expired

Wait until `com_otpexpirydate` in the CRM has passed, then send the 4.2 body again.

```json
{ "success": false, "statusCode": 422, "code": "OTP_EXPIRED", "message": "The code has expired. Please request a new one", "data": null }
```

### 4.5 Wrong code after 5 minutes → 422 wrong, not expired

`{ "otp": "<4 digits, not the SMS code>" }` with the same `userId`.

```json
{ "success": false, "statusCode": 422, "code": "OTP_INVALID", "message": "The code is incorrect", "data": null }
```

A guesser never learns whether a code has expired.

---

## Part 5 — Register again after verifying (your case from O11)

A user verified, closed the app before the selfie, and registers again. Needs your owner record **without a selfie** (unfinished).

### 5.1 Register the same owner again → 201 + SMS, mobile not verified any more

`POST /auth/register`

```json
{
  "type": 1,
  "name": "Test Owner",
  "mobile": "+201063079418",
  "identity": { "kind": "national", "number": "<the national ID on this record>" },
  "email": "owner@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": true, "statusCode": 201, "message": "OK",
  "data": {
    "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6",
    "name": "Test Owner",
    "mobile": "+201063079418",
    "email": "owner@test.com",
    "registeredAs": 1,
    "status": 1,
    "identity": { "kind": "national", "number": "<the national ID>" },
    "birthDate": null
  }
}
```

**Check:** same `userId` (reused, not a new record) · SMS arrives · in the CRM `com_mobileverified = false` (was `true` after 4.2), a new `com_otp`, `com_otpexpirydate` = now + 5 min.

### 5.2 Verify with the new code → 200

`POST /auth/verify-otp`

```json
{ "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "otp": "<code from the new SMS>" }
```

```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": { "userId": "c1141473-5ac3-f111-aaaf-7ced8dc64ae6", "mobileVerified": true }
}
```

**Check:** `com_mobileverified = true`.

### 5.3 Expiry set on create (still open in O7)

Run `REGISTER_TEST_CASES.md` 4.1 with a **new** mobile + national ID: `com_otpexpirydate` must be `createdon` + 5 min. If it is empty or 6 hours off, tell me: verify would answer `OTP_EXPIRED` for every new owner.

---

## Results

| # | Case | Expected | Result |
| --- | --- | --- | --- |
| 1.1 | 3 digits | 422 | |
| 1.2 | number | 422 | |
| 1.3 | bad user id | 422 | |
| 1.4 | extra field | 422 | |
| 1.5 | resend, no user id | 422 | |
| 2.1 | unknown user | 404 `USER_NOT_FOUND` | |
| 2.2 | invited user (verify + resend) | 403 `OTP_NOT_ALLOWED`, no SMS | |
| 2.3 | deactivated user | 403 `USER_DEACTIVATED`, no SMS | |
| 3.1 | resend | 200 + SMS, new code + expiry | |
| 3.2 | resend at once | 429 + `retryAfterSeconds`, no SMS | |
| 4.1 | wrong code | 422 `OTP_INVALID` | |
| 4.2 | right code | 200, `com_mobileverified = true` | |
| 4.3 | same code again | 200 | |
| 4.4 | right code, late | 422 `OTP_EXPIRED` | |
| 4.5 | wrong code, late | 422 `OTP_INVALID` | |
| 5.1 | register again | 201 + SMS, `com_mobileverified = false` | |
| 5.2 | verify new code | 200 | |
| 5.3 | expiry on create | `createdon` + 5 min | |
