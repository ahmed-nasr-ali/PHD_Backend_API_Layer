# Register — new manual test cases (Postman, phdtest)

The earlier rounds passed. These cases cover only what changed since then:
- the code was reorganised (Input types, `strategies/<type>/`, `mappers/`)
- `birthDate` now returns one message
- max lengths
- `USER_DEACTIVATED`

Every case is a **real request you can paste as it is**, with the response you should get. Replace only the `<...>` values.

> ⚠️ These tests **write to phdtest**: 1.1 creates or updates a user, 4.1 sends a **real SMS**. Part 3 needs a record you deactivate yourself.

**Every request:** `POST http://localhost:3000/auth/register`, header `Content-Type: application/json`, body raw → JSON.

**`role` (check-code) is not `type` (register):**

| check-code `role` | register `type` | who |
| --- | --- | --- |
| 1 | 2 | Family Member |
| 21 | 5 | Tenant Family Member |
| 2 | 3 | Tenant |
| 4 | 6 | REF |
| 41 | 7 | REF Owner |
| — | 1 | Owner |

**Check a user in the CRM** (paste in the browser):

```
https://phdtest.crm4.dynamics.com/api/data/v9.1/com_users(<userId>)?$select=com_name,com_mobilenumber,com_nationalid,com_birthdate,com_registeredas,statecode,statuscode,com_requestotp
```

**Check an invitation in the CRM:**

```
https://phdtest.crm4.dynamics.com/api/data/v9.1/com_invitationrequests(<invitationId>)?$select=_com_linkeduser_value,statecode,statuscode,com_acceptedon
```

**Run in order:** part 1 → 2 → 3 → 4 (owner).

---

## Part 1 — Still works after the reorganisation

### 1.1 Family Member → 201, birth date saved on the same day

Needs a Confirmed **Family Member** invitation (check-code `role: 1`) whose mobile has no user yet, or has an unfinished Family Member.

```json
{
  "type": 2,
  "invitationId": "<Family Member invitationId>",
  "code": "<its code>",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100031" },
  "email": "family@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": true, "statusCode": 201, "message": "OK",
  "data": {
    "userId": "<guid>",
    "name": "<invitation name>",
    "mobile": "<invitation mobile>",
    "email": "family@test.com",
    "registeredAs": 2,
    "status": 1,
    "identity": { "kind": "national", "number": "30404240100031" },
    "birthDate": "2004-04-24"
  }
}
```

**Check the user:** `com_birthdate = 2004-04-24`. Same day: `birthDate` is now turned into a date during validation, so this checks it didn't shift by a day.
**Check the invitation:** `_com_linkeduser_value = <userId>`, `statuscode` still Confirmed.

---

## Part 2 — Validation (422, nothing reaches the CRM)

These fail before any CRM call, so the ids in the body don't need to be real.

### 2.1 Birth date not a date → one message only

Before this change it returned two messages ("must be YYYY-MM-DD" and "cannot be in the future").

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "abc",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "birthDate", "message": "Birth date must be YYYY-MM-DD" } ]
}
```

### 2.2 Name of 101 characters → 422

REF body (it sends a name). The `com_name` column holds 100.

```json
{
  "type": 6,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "name": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "ref@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "name", "message": "Name must be at most 100 characters" } ]
}
```

### 2.3 Email of 101 characters → 422

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "email", "message": "Email must be at most 100 characters" } ]
}
```

### 2.4 Password of 101 characters → 422

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "password", "message": "Password must be at most 100 characters" } ]
}
```

### 2.5 Passport of 101 characters → 422

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "passport", "number": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "identity.number", "message": "Passport number must be at most 100 characters" } ]
}
```

### 2.6 Notification token of 301 characters → 422

The `com_appnotificationtoken` column holds 300.

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "notificationToken", "message": "Notification token must be at most 300 characters" } ]
}
```

---

## Part 3 — Deactivated account (invited)

**Setup:** pick a test user in `com_users` and press **Deactivate** in the CRM, so it gets `statecode = 1`, `statuscode = 2`. Then send an invitation (any type, e.g. Tenant) to **that user's mobile**. Write down the user's id, mobile and national ID: part 4 uses them too.

### 3.1 Invitation to a deactivated user's mobile → 403, invitation untouched

```json
{
  "type": 3,
  "invitationId": "<Tenant invitationId sent to the deactivated mobile>",
  "code": "<its code>",
  "identity": { "kind": "national", "number": "30404240100032" },
  "email": "tenant@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 403, "code": "USER_DEACTIVATED",
  "message": "This account is deactivated. Please contact support", "data": null
}
```

**Check the invitation:** `statecode = 0`, `statuscode` still Confirmed, `com_acceptedon = null`, `_com_linkeduser_value` not changed.
**Check the user:** still `statecode = 1`, `statuscode = 2`, nothing else changed.

---

## Part 4 — Owner

### 4.1 Owner still works after the reorganisation → 201 + SMS

A national ID that is in `accounts.new_cbrnumber`, and your mobile (not in `com_users`, or an unfinished owner).

```json
{
  "type": 1,
  "name": "Test Owner",
  "mobile": "<+20 + your mobile without the leading 0>",
  "identity": { "kind": "national", "number": "<national ID from accounts.new_cbrnumber>" },
  "email": "owner@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": true, "statusCode": 201, "message": "OK",
  "data": {
    "userId": "<guid>",
    "name": "Test Owner",
    "mobile": "<your mobile>",
    "email": "owner@test.com",
    "registeredAs": 1,
    "status": 1,
    "identity": { "kind": "national", "number": "<the national ID>" },
    "birthDate": null
  }
}
```

**Check:** the SMS arrives · in the CRM `com_registeredas = 1`, `com_requestotp = false` (the plugin sets it back after sending) · **new user only:** `com_otpexpirydate` = `createdon` + 5 min (confirms the plugin sets the expiry on create too, see O7):

```
https://phdtest.crm4.dynamics.com/api/data/v9.1/com_users(<userId>)?$select=createdon,com_otp,com_otpexpirydate,com_requestotp
```

### 4.2 Owner with the deactivated user's mobile → 403, no SMS

```json
{
  "type": 1,
  "name": "Test Owner",
  "mobile": "<the deactivated user's mobile, +20…>",
  "identity": { "kind": "national", "number": "30404240100033" },
  "email": "owner@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 403, "code": "USER_DEACTIVATED",
  "message": "This account is deactivated. Please contact support", "data": null
}
```

**Check:** no SMS · the user is unchanged (`statecode = 1`).

### 4.3 Owner with the deactivated user's national ID and a new mobile → 403, no SMS

The record is found by the ID only, and it still counts.

```json
{
  "type": 1,
  "name": "Test Owner",
  "mobile": "<+20 + a mobile not in com_users>",
  "identity": { "kind": "national", "number": "<the deactivated user's national ID>" },
  "email": "owner@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 403, "code": "USER_DEACTIVATED",
  "message": "This account is deactivated. Please contact support", "data": null
}
```

**Check:** no SMS · the user's mobile is **not** changed to the new one.

---

## Results

| # | Case | Expected | Got |
| --- | --- | --- | --- |
| 1.1 | Family Member after the reorganisation | 201, same birth date, invitation linked | |
| 2.1 | birth date "abc" | 422, one message | |
| 2.2 | name 101 | 422 | |
| 2.3 | email 101 | 422 | |
| 2.4 | password 101 | 422 | |
| 2.5 | passport 101 | 422 | |
| 2.6 | token 301 | 422 | |
| 3.1 | invited, deactivated mobile | 403 `USER_DEACTIVATED`, invitation untouched | |
| 4.1 | owner after the reorganisation | 201 + SMS | |
| 4.2 | owner, deactivated mobile | 403, no SMS | |
| 4.3 | owner, deactivated ID + new mobile | 403, no SMS, mobile unchanged | |
