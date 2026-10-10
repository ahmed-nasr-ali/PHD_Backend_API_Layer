# IT request: SharePoint access for the backend (Graph, `Sites.Selected`)

Status: **not sent yet** (decision F1 in [files-study.md](files-study.md) section 7). Until IT grants it, the backend uses the Power Automate flows adapter.

## Why

The backend should talk to SharePoint directly through Microsoft Graph: faster than a flow run per file, built-in thumbnails, direct download links. `Sites.Selected` limits the app to **one site** only.

Checked 2026-10-09: the app registration the backend already uses for Dataverse has **no Graph permissions**. The same app can be reused, so no new app or secret is needed.

## Before sending: fill in

| Placeholder | Where to get it |
| --- | --- |
| `<app name>` | `app_displayname` in a Graph token decoded on jwt.ms |
| `<client id>` | `DV_CLIENT_ID` in `.env` (not secret; **never** send `DV_CLIENT_SECRET`) |
| `<site URL>` | `com_sharepointsiteaddress` in `blser_generalsettings`: on phdtest `https://phdint.sharepoint.com/teams/CRMCaseManagement` |

## Our files on that site (phdtest, 2026-10-09)

- Library **`Sandbox Attachments`**, folder `Community App/User Attachments` (`com_userattachmentsfolderpath`).
- The site is **shared** ("CRM Case Management"), so other CRM systems likely keep files there too.
- Production is likely another library **in the same site**: a site-wide grant for the test backend could write production files.

So ask for the **narrowest** grant IT supports: write on the `Sandbox Attachments` library only (e.g. `Lists.SelectedOperations.Selected`) if available, else `Sites.Selected` on the site.

## Message (copy as is)

> **Subject: Grant our existing app access to one SharePoint site (Sites.Selected)**
>
> Hi,
>
> Our backend already uses the app registration **`<app name>`** (client ID `<client id>`) to access Dataverse. We now need the same app to read and write files in **one** SharePoint site, nothing else.
>
> Please:
>
> 1. **Add an API permission** to this app: **Microsoft Graph → Application permissions → `Sites.Selected`**, then **Grant admin consent**.
>    *(On its own, this permission gives access to no site.)*
>
> 2. **Give the app `write` access on our site only:** `<site URL>`
>    With PnP PowerShell:
>    ```
>    Grant-PnPAzureADAppSitePermission -AppId <client id> -DisplayName "<app name>" -Site <site URL> -Permissions Write
>    ```
>    Or with Graph: `POST /sites/{site-id}/permissions` with `"roles": ["write"]`.
>
>    **If possible, please limit it to the `Sandbox Attachments` library only** (e.g. `Lists.SelectedOperations.Selected` instead of `Sites.Selected`): this site is shared with other CRM systems and likely holds production files too.
>
> 3. Please confirm when it's done. No new secret is needed; we keep the current one.
>
> This is for the **Sandbox** environment for now. We'll ask for Production separately.
>
> Thanks!

## After IT confirms: check it

1. Postman `POST https://login.microsoftonline.com/<tenant id>/oauth2/v2.0/token`, body `x-www-form-urlencoded`: `grant_type=client_credentials`, `client_id`, `client_secret`, `scope=https://graph.microsoft.com/.default`.
2. Decode `access_token` on https://jwt.ms → `roles` must contain `Sites.Selected`.
3. `GET https://graph.microsoft.com/v1.0/sites/phdint.sharepoint.com:/teams/CRMCaseManagement` with `Authorization: Bearer <access_token>` → **200** = granted · **403** = consent done, site not granted yet.

Never paste the token or the secret anywhere.
