# Register — new manual test cases (Postman, phdtest)

The first round passed. These are the new cases only. Every case is a **real request you can paste as it is**, with the response you should get. Replace only the `<...>` values.

> ⚠️ These tests **write to phdtest**: part 2 updates hema's record, case 4.3 **closes** invitation `YHD56GGC`, the owner case 5.1 sends a **real SMS**.

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

**Main invitation:** `YHD56GGC` (Family Member), from check-code:

```json
{ "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca", "role": 1, "name": "hema", "mobile": "+201063079418", "relationship": 181410001, "termsAndConditions": [] }
```

**Run in order:** part 1 → 2 → 3 → 4 (4.3 last of the invited cases, it closes the invitation) → 5 (owner).

**Check the invitation in the CRM** (paste in the browser):

```
https://phdtest.crm4.dynamics.com/api/data/v9.1/com_invitationrequests(814b7422-41b7-f111-aaac-6045bd8caeca)?$select=_com_linkeduser_value,statecode,statuscode,com_acceptedon
```

---

## Part 1 — Invitation status

Each case needs its own invitation. Get its `invitationId` from check-code first.

### 1.1 Completed invitation → 409

```json
{
  "type": 2,
  "invitationId": "<id of a Completed Family Member invitation>",
  "code": "<its code>",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100021" },
  "email": "used@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 409, "code": "INVITATION_ALREADY_USED",
  "message": "This invitation has already been used", "data": null
}
```

### 1.2 Requested / Rejected / Under Review invitation → 403

```json
{
  "type": 2,
  "invitationId": "<id of a Requested, Rejected or Under Review Family Member invitation>",
  "code": "<its code>",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100022" },
  "email": "invalid@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 403, "code": "INVITATION_INVALID",
  "message": "This invitation is not valid", "data": null
}
```

### 1.3 Helpers invitation (check-code `role: 3`) → 422

```json
{
  "type": 3,
  "invitationId": "<id of a Helpers invitation>",
  "code": "<its code>",
  "identity": { "kind": "national", "number": "30404240100023" },
  "email": "helper@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "INVITATION_ROLE_NOT_SUPPORTED",
  "message": "This invitation type is not supported", "data": null
}
```

---

## Part 2 — Same input, different spelling (must still work)

hema is already registered (no selfie), so 2.1 – 2.3 **update the same record** and return the same `userId`.

### 2.1 Code in lower-case → 201

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "yhd56ggc",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": true, "statusCode": 201, "message": "OK",
  "data": {
    "userId": "<hema's userId>",
    "name": "hema",
    "mobile": "+201063079418",
    "email": "hema@test.com",
    "registeredAs": 2,
    "status": 1,
    "identity": { "kind": "national", "number": "30404240100011" },
    "birthDate": "2004-04-24"
  }
}
```

### 2.2 invitationId in upper-case → 201

```json
{
  "type": 2,
  "invitationId": "814B7422-41B7-F111-AAAC-6045BD8CAECA",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

Same response as 2.1 (same `userId`).

### 2.3 Email with spaces around → 201, trimmed

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "  hema@test.com  ",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

Same response as 2.1: `"email": "hema@test.com"` (no spaces).

### 2.4 REF with an Arabic name and spaces → 201, trimmed

Needs a Confirmed **REF** invitation (check-code `role: 4`).

```json
{
  "type": 6,
  "invitationId": "<REF invitationId>",
  "code": "<REF code>",
  "name": "  أحمد علي  ",
  "identity": { "kind": "national", "number": "30404240100024" },
  "email": "ref@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": true, "statusCode": 201, "message": "OK",
  "data": {
    "userId": "<new guid>",
    "name": "أحمد علي",
    "mobile": "<REF invitation mobile>",
    "email": "ref@test.com",
    "registeredAs": 6,
    "status": 1,
    "identity": { "kind": "national", "number": "30404240100024" },
    "birthDate": null
  }
}
```

---

## Part 3 — More validation (422, nothing changes in the CRM)

### 3.1 Empty body → 422

```json
{}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "type", "message": "Invalid discriminator value. Expected '1' | '2' | '5' | '3' | '6' | '7'" } ]
}
```

### 3.2 `type` as a string → 422

```json
{
  "type": "2",
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "type", "message": "Invalid discriminator value. Expected '1' | '2' | '5' | '3' | '6' | '7'" } ]
}
```

### 3.3 Unknown identity kind → 422

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "driver", "number": "123" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "identity.kind", "message": "Invalid discriminator value. Expected 'national' | 'passport'" } ]
}
```

### 3.4 Empty passport number → 422

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "passport", "number": "  " },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "identity.number", "message": "Passport number is required" } ]
}
```

### 3.5 No `notificationToken` → 422

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "notificationToken", "message": "Invalid input: expected string, received undefined" } ]
}
```

### 3.6 REF name with digits → 422

```json
{
  "type": 6,
  "invitationId": "<REF invitationId>",
  "code": "<REF code>",
  "name": "Ref 123",
  "identity": { "kind": "national", "number": "30404240100025" },
  "email": "ref@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 422, "code": "VALIDATION_FAILED", "message": "Validation failed", "data": null,
  "errors": [ { "field": "name", "message": "Name must contain letters and spaces only" } ]
}
```

---

## Part 4 — Existing users (`USER_EXISTS`)

Run 4.1 and 4.2 **before** 4.3: 4.3 gives hema a selfie and closes the invitation.

### 4.1 Mobile finds hema, ID finds another record → 409, invitation stays Confirmed

hema's body, but with the national ID of **another unfinished** record in `com_users` (other mobile, no selfie). The search finds 2 records, so it can't pick one.

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "<national ID of another unfinished record>" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 409, "code": "USER_EXISTS",
  "message": "This user already has an account. Please log in", "data": null
}
```

**Check the invitation:** `statecode = 0`, `statuscode` = Confirmed (not changed), `com_acceptedon = null`.

### 4.2 Unfinished user, other type → 409, the Tenant invitation stays Confirmed

Setup: send a **Tenant** invitation to hema's mobile `+201063079418` (hema is a Family Member with no selfie).

```json
{
  "type": 3,
  "invitationId": "<Tenant invitationId>",
  "code": "<Tenant code>",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 409, "code": "USER_EXISTS",
  "message": "This user already has an account. Please log in", "data": null
}
```

**Check the Tenant invitation** (same link as above, with its id): `statecode = 0`, `statuscode` = Confirmed, `com_acceptedon = null`, `_com_linkeduser_value` not changed.

### 4.3 Complete user (has a selfie) → 409 + the invitation is closed

Setup: in the CRM, set `com_profilepicturefilepath` on hema's `com_users` record to any text, e.g. `/test/selfie.jpg`.

```json
{
  "type": 2,
  "invitationId": "814b7422-41b7-f111-aaac-6045bd8caeca",
  "code": "YHD56GGC",
  "birthDate": "2004-04-24",
  "identity": { "kind": "national", "number": "30404240100011" },
  "email": "hema@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 409, "code": "USER_EXISTS",
  "message": "This user already has an account. Please log in", "data": null
}
```

**Check the invitation:** `statecode = 1`, `statuscode = 2` (Completed), `com_acceptedon` = now, `_com_linkeduser_value` not changed.

### 4.4 Same body again → 409, invitation already used

Same body as 4.3.

```json
{
  "success": false, "statusCode": 409, "code": "INVITATION_ALREADY_USED",
  "message": "This invitation has already been used", "data": null
}
```

---

## Part 5 — Owner

### 5.1 ID in `accounts`, mobile not in `accounts` → 201 + SMS

Setup: a national ID that is in `accounts.new_cbrnumber`, and your mobile, which is **not** in `accounts` or `com_users`.

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
    "userId": "<new guid>",
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

**Check:** the SMS arrives (one match, mobile **or** ID, is enough). In the CRM: `com_registeredas = 1`, `com_requestotp = true`.

### 5.2 Unfinished owner, same national ID, new mobile → 201, the mobile is updated

Setup: an **unfinished Owner** record (no selfie), e.g. mobile `+201063079418`, national ID `12345678911111`.

```json
{
  "type": 1,
  "name": "Test Owner",
  "mobile": "<+20 + a new mobile, not in com_users>",
  "identity": { "kind": "national", "number": "12345678911111" },
  "email": "owner@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": true, "statusCode": 201, "message": "OK",
  "data": {
    "userId": "<the same userId of that owner record>",
    "name": "Test Owner",
    "mobile": "<the new mobile>",
    "email": "owner@test.com",
    "registeredAs": 1,
    "status": 1,
    "identity": { "kind": "national", "number": "12345678911111" },
    "birthDate": null
  }
}
```

**Check:** no new record. The SMS goes to the **new** mobile. In the CRM: `com_mobilenumber` = the new mobile, `com_requestotp = true`.

### 5.3 Unfinished owner, same mobile, new national ID → 201, the ID is updated

Same owner record, now with its (new) mobile from 5.2 and a new national ID.

```json
{
  "type": 1,
  "name": "Test Owner",
  "mobile": "<the mobile from 5.2>",
  "identity": { "kind": "national", "number": "30404240100099" },
  "email": "owner@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

Same response as 5.2 (same `userId`), with `"number": "30404240100099"`.

**Check:** no new record, `com_nationalid = 30404240100099`, SMS sent.

### 5.4 Mobile of a Family Member → 409

```json
{
  "type": 1,
  "name": "Test Owner",
  "mobile": "<mobile of a Family Member record, e.g. hema>",
  "identity": { "kind": "national", "number": "30404240100098" },
  "email": "owner@test.com",
  "password": "Aa12345#",
  "notificationToken": "test-token"
}
```

```json
{
  "success": false, "statusCode": 409, "code": "USER_EXISTS",
  "message": "This user already has an account. Please log in", "data": null
}
```

No SMS. That record is another type, so an owner can't take it.

---

## Results

| # | Case | Expected | Got |
| --- | --- | --- | --- |
| 1.1 | Completed invitation | 409 `INVITATION_ALREADY_USED` | |
| 1.2 | Requested / Rejected invitation | 403 `INVITATION_INVALID` | |
| 1.3 | Helpers invitation | 422 `INVITATION_ROLE_NOT_SUPPORTED` | |
| 2.1 | lower-case code | 201, same userId | |
| 2.2 | upper-case invitationId | 201, same userId | |
| 2.3 | email with spaces | 201, trimmed | |
| 2.4 | Arabic REF name | 201, trimmed | |
| 3.1 | empty body | 422 | |
| 3.2 | type as string | 422 | |
| 3.3 | identity kind "driver" | 422 | |
| 3.4 | empty passport | 422 | |
| 3.5 | no notificationToken | 422 | |
| 3.6 | REF name with digits | 422 | |
| 4.1 | mobile → hema, ID → another record | 409, invitation stays Confirmed | |
| 4.2 | unfinished user, other type | 409, invitation stays Confirmed | |
| 4.3 | complete user | 409 + invitation Completed | |
| 4.4 | same body again | 409 `INVITATION_ALREADY_USED` | |
| 5.1 | owner matched by ID only | 201 + SMS | |
| 5.2 | unfinished owner, same ID, new mobile | 201, mobile updated + SMS | |
| 5.3 | unfinished owner, same mobile, new ID | 201, ID updated + SMS | |
| 5.4 | owner, mobile of a Family Member | 409 | |
