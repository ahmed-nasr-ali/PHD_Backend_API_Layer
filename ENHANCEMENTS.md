# Enhancements

- **Rate limit on invitation code check:** limit code guessing per device/IP and per code (e.g. 5 failures → lock 15 min). Needs a decision on where counters are stored.
- **Limit wrong OTP attempts:** the OTP is 4 digits (10,000 options) and lives 5 minutes, so without a limit it can be guessed. E.g. 5 wrong tries → the OTP is dead, a resend is needed. Needs a new `com_users` column for the counter (CRM team).
- **Max OTP sends per hour:** resend already waits 60 s between sends, but there is no total cap (e.g. 5 SMS per hour per user). Needs a counter column too (CRM team).
- **Log system (last task in the project):** today errors only go to the console through Nest's `Logger` (e.g. the exception filters, the SharePoint settings that fail to load at startup). Add a real log store (a log file per day, or a log service) so problems can be found later. Until then every place that must be logged uses Nest's `Logger`, so switching it is one change.
- **Prove who uploads documents (with the login task):** `POST /auth/documents` takes only `userId` for now (decision 2026-10-10), so anyone who knows a user id can send documents for that user. Fix together with login: a token that works **only** for the documents step (its own purpose, short life), never accepted as a login token, so it can't be used anywhere else in the app.
- **Clean up old temp files:** files of jobs that failed for good stay on disk so they can be retried. If nobody retries them they pile up. Add a cleanup that removes them after N days (N to decide).
- **Temp files on Azure App Service:** phdtest runs on Azure App Service. Point `TEMP_FILES_DIR` to a folder under `/home` (kept across deploys and shared between instances), so files are not lost on a redeploy. Config only, no code.
- **Find users by the exact mobile number (to ask the team lead).**

  **What we do today.** On register we look for an existing user with the same mobile. We match only the **last 10 digits** (`endswith`):

  ```
  user types +201006625243 → we search: com_mobilenumber ends with '1006625243'
  ```

  **Why.** Old records save the same kind of number in different shapes, so an exact search would miss them. Real examples from phdtest:

  | Saved in `com_users` | Shape |
  | --- | --- |
  | `+201006551124` | correct (country code + number) |
  | `01006625243` | local, no country code |
  | `+01234567891` | broken: `+` before a local number |
  | `98765674320` | unknown / test data |

  **Problems with "last 10 digits".**
  1. **Wrong match:** two different numbers from two countries can end with the same 10 digits, so we may treat a stranger as the same user.
  2. **Missed match for other countries:** an Egyptian number without its country code is exactly 10 digits, other countries are not. A UAE number `+971501234567` saved as `0501234567` is not found, because its last 10 digits are `1501234567`.
  3. **Slow:** "ends with" can't use the database index, so the CRM reads the whole `com_users` table on every register.

  **Proposed fix.**
  1. **Clean the old data (CRM team):** rewrite every `com_users.com_mobilenumber` (and `accounts.new_mobilenumber`) to one shape: `+` + country code + number, e.g. `01006625243` → `+201006625243`. To see how many records need it, run on production:
     `com_users?$select=com_mobilenumber&$filter=not startswith(com_mobilenumber,'+')&$count=true`
  2. **Then search by the exact number** (`com_mobilenumber eq '+201006625243'`): no wrong matches, works for every country, fast.
