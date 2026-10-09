# Notes

- **Terms & Conditions are only for Tenant invitations** (`InvitedAs.Tenant`). Other invitation types get no T&C.
- **`USER_EXISTS` is not only for a complete user (to ask the backend team lead).** On `POST /auth/register` we search `com_users` by the mobile **or** the national ID / passport (`resolveExistingUser`). The message is "This user already has an account. Please log in", and it is returned in all of these cases:

  | # | What the search finds | Example |
  | --- | --- | --- |
  | 1 | A **complete** user (selfie uploaded) with this mobile | Youssef registered and finished before, then registers again |
  | 2 | A user found **by the ID only**: the national ID / passport matches, the mobile is different | Youssef already has an account with `+201001111111` and now registers with `+201002222222` |
  | 3 | **2 different records**: one matches the mobile, another one matches the ID | `+201001111111` belongs to Youssef's record, the typed national ID belongs to Ahmed's record |
  | 4 | An **unfinished** user with this mobile, but a **different type** | Youssef started registering as Tenant, and now registers as Family Member with the same mobile |

  Only one case does not return `USER_EXISTS`: one unfinished user, same mobile, same type → we reuse it and overwrite its data.

  Question for the team lead: is "please log in" right for cases 2, 3 and 4, or does each one need its own error code / message?
- **A record found by the national ID is the same person (built 2026-10-09).** A national ID is never on 2 records in the CRM. So: one record found (by the mobile, the ID or both), same type, unfinished → reuse it and overwrite all its data, **the mobile too** (the owner's OTP then goes to the new mobile). This replaces case 2 in the table above. The mobile app does the same for the owner: it reuses the first unfinished record found by the mobile **or** the ID. Also: a complete user found by the ID only now closes the invitation too (S27).

  Why we still search by the mobile **or** the ID: the right key is the national ID only, but **a family member under 15 has no national ID**, so the ID can't be the only key.
