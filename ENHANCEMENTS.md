# Enhancements

- **Rate limit on invitation code check:** limit code guessing per device/IP and per code (e.g. 5 failures → lock 15 min). Needs a decision on where counters are stored.
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
