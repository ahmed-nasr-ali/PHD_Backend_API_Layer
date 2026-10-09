# Files: study and design

How the mobile app uploads and reads files today (SharePoint and Dataverse images), why it is slow and unsafe, and a backend design that works with SharePoint now and can switch to another store later.

Source studied: the Flutter app (`D:\initium_projects\PHD Community App\lib`), the two handover guides in `old_project_docs/`, and Microsoft's current docs (links at the end). Nothing was called on phdtest.

---

## 1. Summary

- **Every file goes through 3 hops**: the app turns the file into base64, puts it in JSON, encrypts it, sends it to the `CommunityAppProxy`, which forwards it to a **Power Automate flow**, which talks to SharePoint. Reading a file is the same path backwards.
- **Events, news, announcements, sales launches and compounds are not SharePoint**: they are Dataverse image columns, read as base64, one request per item.
- **The main slowness is on the phone** (no cache, a new request on every rebuild), multiplied by the slow path (a flow run per file, base64 + encryption).
- **There are serious security holes**: any file on the site can be read by its path, any user's documents can be overwritten, and a signed flow URL is hard-coded in the app.
- **Target**: one storage port in the backend (`FileStorage`), SharePoint behind it through **Microsoft Graph**, files served to the app as **normal HTTP URLs** (binary, cacheable, thumbnails for lists). Switching to Azure Blob / S3 later = one new adapter class + one config value.

---

## 2. How the app handles files today

### 2.1 The path of one file

```text
upload:   picked file → base64 → JSON { attachmentbody: <base64>, … } → JSON { Endpoint, Method, Body, EnableAuthorization:false }
          → AES-encrypted → POST CommunityAppProxy/HandleRequest → POST <Power Automate flow URL> → SharePoint
download: same path back: flow reads SharePoint → base64 in JSON → proxy encrypts → app decrypts → base64Decode → Image.memory
```

`EnableAuthorization: false` tells the proxy not to add the CRM token: the flow URL itself is the secret (a SAS signature in the query string).

### 2.2 Two SharePoint integrations live side by side

| | Legacy flows | "Operation" flow (newer, service catalog) |
| --- | --- | --- |
| Where the URLs come from | `blser_generalsettings`: `com_sharepointattachmentcreationendpointurl`, `…retrievingendpointurl`, `…deletionendpointurl` (deletion is never used), `com_sharepointsiteaddress`, folder paths per area (`com_userattachmentsfolderpath`, `com_vehicleattachmentsfolderpath`, `com_gatepassattachmentsfolderpath`, `com_invitationunitattachmentsfolderpath`, `com_sendusamessagefolderpath`) | environment variable `phdsc_SharePointConfiguration` → `OperationEndpoint` |
| Upload body | `attachmentid` (record id), `attachmentname`, `attachmentbody` (base64), `siteaddress`, `folderpath`, `oldfilepath`, `entityname`, `filenamefield`, `filepathfield` | `actionType` (0 upload, 1 delete, 2 update, 3 get), `whichFolderPath` (0 = files; the flow picks the real folder), `fileName`, `fileContent` (base64), `contentType`, `oldFileName` |
| Who writes the CRM fields | **the flow**: it saves the file, then writes its name and path into `<entityname>.<filenamefield>/<filepathfield>` | **the app**: SharePoint returns the saved name (with a timestamp prefix), then the app writes `isc_files` rows in a `$batch` |
| Read | POST `{ filepath, siteaddress }` → base64 | `actionType: 3`, `fileName` → base64 |
| Replace / delete | `oldfilepath` (only the vehicle screen sends it) | update / delete actions, with a smart sync of added / removed / replaced files |

A third flow, hard-coded in `core/constants/constants.dart`, serves Facility Management service images (`ifm_serviceimagejson.filePath`).

### 2.3 Registration documents (all use the legacy flow, `entityname: com_users`)

| Type | Required | Optional | CRM name / path fields |
| --- | --- | --- | --- |
| Owner | selfie, ID or passport front | ID back | `com_profilepicturefilename/…filepath`, `com_nationalidfrontname/…frontpath`, `com_nationalidbackname/…backpath` |
| Family Member / Tenant Family Member | selfie, birth certificate, ID front if age ≥ 15, marriage certificate if Spouse | — | + `com_birthcertificatefilename/…filepath`, `com_marriagecertificatename/…path` |
| Tenant, REF | selfie | — | profile picture fields |
| REF Owner | selfie | ID front, contract page 1, contract page 2 (shown only for REF Owner) | + `com_contractfrontname/…frontpath`, `com_contractbackname/…backpath` |

How they are sent today:

| | Owner | Family | Tenant / REF / REF Owner |
| --- | --- | --- | --- |
| Order | all in parallel | all in parallel | one by one |
| Failure | ignored | ignored | logged and skipped |
| Then | status set to Under Review anyway | same + invitation closed | same + invitation closed |
| Selfie | face-checked on the phone (ML Kit), compressed to ~200 KB | same | same |
| Other images | **raw from the gallery** (often 2–8 MB), base64 | same | same |

Bugs seen in the code: the birth certificate is uploaded as `marriage.png`; replacing the selfie (force-update screen) never sends `oldfilepath`, so old selfies stay on SharePoint forever; `com_profilepicturefilepath` filled = "account complete", even if the other files failed.

### 2.4 Other uploads (same legacy flow, different table)

| Screen | Table | Fields |
| --- | --- | --- |
| Vehicles | `com_vehicles` | `com_carlicensefilepath` (the only one that sends `oldfilepath`) |
| Gate passes | `com_gatepasses` | `com_personimagefilepath`, `com_driveridfrontfilepath`, `com_driveridbackfilepath` |
| Tenant invitations / tenant children | `com_invitationrequests`, `com_invitationdocuments`, `com_tenantchildren` | tenant ID front/back, marriage / birth certificates, `com_path` |
| Household invitation | `com_invitationrequests` | `com_householderimagefilepath`, tenant ID front/back |
| Send us a message | `com_messages` | `com_sendusamessagepath` |
| Service requests (dynamic forms) | `isc_files` (via the operation flow) | `isc_filejson` = SharePoint file name |

### 2.5 Reading files: four different sources

| Source | Used for | How |
| --- | --- | --- |
| SharePoint, legacy retrieving flow | profile picture, family member photos, vehicle licence, city guide, stores, unit documents, privacy policy / T&C PDFs, message attachments | `getFileData(filepath)` → base64 |
| SharePoint, operation flow | service-catalog request files and file templates | `actionType: 3` + `isc_filejson` → base64 → written to a temp file |
| SharePoint, facility flow (hard-coded URL) | `ifm_services` images | `{ filecontent: <base64> }` |
| **Dataverse image columns** | events (`com_eventpicture`), news / announcements (`com_newspicture`), sales launches (`com_image`), compounds (`com_compundphoto`), QR codes (`com_gatepassqr`, `com_barcode`) | `GET <table>(<id>)/<column>` → base64. Per Microsoft's docs this returns the **thumbnail** (144×144 crop) unless `/$value?size=full` is used, so big banners are probably upscaled thumbnails (to confirm on phdtest) |

### 2.6 File settings in `blser_generalsettings` (column names checked on phdtest, 2026-10-09)

Flow URLs (secrets: never open their values in a browser, never paste them):

| Column | Does |
| --- | --- |
| `com_sharepointattachmentcreationendpointurl` | upload (replace = upload with `oldfilepath`; there is no update flow) |
| `com_sharepointattachmentretrievingendpointurl` | read |
| `com_sharepointattachmentdeletionendpointurl` | delete (the app never calls it) |
| `ifm_attachmentretrievingendpointurl` | read Facility Management files |

Site + one folder per area (not secrets):

| Column | Folder for |
| --- | --- |
| `com_sharepointsiteaddress` | the site: `https://phdint.sharepoint.com/teams/CRMCaseManagement` (shared "CRM Case Management" site) |
| `com_userattachmentsfolderpath` | registration documents: `/Sandbox Attachments/Community App/User Attachments` |
| `com_vehicleattachmentsfolderpath` | vehicles |
| `com_gatepassattachmentsfolderpath` | gate passes |
| `com_invitationunitattachmentsfolderpath` | invitations |
| `com_unitattachmentsfolderpath` · `com_compoundattachmentsfolderpath` | units · compounds |
| `com_commercialentityfolderpath` | commercial entities |
| `com_saleslaunchcontentattachmentsfolderpath` | sales launches |
| `com_privacyattachmentsfolderpath` | privacy policy / T&C |
| `com_sendusamessagefolderpath` | send us a message |
| `ifm_serviceattachmentsfolderpath` | service catalog (Facility Management) |

The backend reads site + folders from here (never hard-coded), so a change in the CRM needs no deploy.

**Azure Blob Storage already exists** in the same table: `com_blobserviceendpoint`, `com_storageaccountname`, `com_ontainername` (sic), `com_storageaccountkey`, `com_storagesastoken`, `com_connectionstring`. Not used by the mobile app. It is a ready second adapter for files only the app shows (no CRM review), with no IT request. ⚠️ The account key and connection string sit in a plain table that any reader of the settings can see: raise it with the team lead.

### 2.7 How the CRM team sees registration documents

The `com_user` form has an **Attachments** tab (custom control: Browse / Delete / Upload per document). It shows the file name as a link; a click loads the file and opens it. It reads the `name` + `path` columns, so the backend must write them exactly as the flow does:

- **path** is URL-encoded **twice**: `%252fSandbox%2bAttachments%252fCommunity%2bApp%252fUser%2bAttachments%252f<name>` = `/Sandbox Attachments/Community App/User Attachments/<name>`
- **name** = `<yyyyMMddHHmmss>_<doc>_<epoch ms>.<ext>`, e.g. `20260708063904_selfie_1783492741985.jpg`
- one flat folder for every user

---

## 3. Why it is slow (biggest first)

| # | Cause | Effect |
| --- | --- | --- |
| 1 | `FutureBuilder(future: Api.getImage(...))` **inside `build()`** (events, news, family members, compounds, sales launches, reservations…) | a new request on **every rebuild**; in a list, scrolling away and back downloads the image again |
| 2 | **No image cache** (`Image.memory`); the profile picture is cached as a base64 string in SharedPreferences | every screen visit is a full download; big strings in prefs slow app start |
| 3 | **One Power Automate run per file** + the proxy hop | a flow run takes seconds (and counts against the Power Platform daily request quota of the flow's owner, e.g. 40,000 / 24 h per paid licence) |
| 4 | **base64 inside JSON inside an encrypted JSON** | +33% bytes, the whole file in memory 3–4 times, decoding on the UI thread → jank |
| 5 | **N+1**: a list of 20 events = 1 list call + 20 image calls | the list waits on 21 slow calls |
| 6 | **Originals everywhere**: gallery images uploaded raw; full images shown where a thumbnail is enough | MBs where KBs would do |

HTTPS already encrypts the connection; the extra AES layer adds cost without adding safety once the backend owns the logic.

## 4. Security holes (must not survive the move)

| Hole | Why it matters |
| --- | --- |
| The retrieving flow returns **any path** sent to it | anyone who learns or guesses a path reads other people's national ID and selfie |
| The upload flow takes **any `attachmentid` + `entityname` + field names** | anyone can overwrite another user's documents, or write into any table's fields |
| The facility flow URL with its **SAS signature is in the app binary**; general settings (with the other flow URLs) are readable through the proxy | the flows can be called directly, with no app at all |
| File names come from the phone | path tricks and wrong names (`marriage.png`) |
| No size / type check on the server; EXIF (GPS location) kept in gallery photos | storage abuse; privacy leak of where an ID photo was taken |

---

## 5. Target design

### 5.1 Rules

1. **The app never sees a storage path, a flow URL or a CRM field name.** It sends files to business endpoints and receives URLs.
2. **Files travel as binary**: `multipart/form-data` up, plain HTTP body down. No base64, no extra encryption.
3. **The server decides** names, folders, required documents, size and type limits.
4. **Storage is a port.** Business code depends on `FileStorage`; SharePoint, Azure Blob, S3, local disk and in-memory are adapters.
5. **A file in the app = a URL** with a version, so the app can cache it on disk and reuse it until the version changes.

### 5.2 Where it lives

```text
src/core/files/                              technical building block, like core/dataverse (no business rules)
├── files.module.ts                          FilesModule.register({ driver }) → picks the adapter (one line to switch)
├── index.ts                                 the only import path for features
├── ports/
│   ├── file-reader.ts                       abstract FileReader   (describe, open)
│   ├── file-writer.ts                       abstract FileWriter   (upload, replace, delete)
│   └── file-storage.ts                      abstract FileStorage implements FileReader, FileWriter (all 5 written out)
├── types/                                   storage-folder.enum, storage-key, file-upload, stored-file, file-content (+ byte range / thumbnails in task 4)
├── links/
│   ├── file-link.factory.ts                 builds the URL the app receives (signed, versioned)
│   └── hmac-file-link.signer.ts             signs / checks link tokens (expiry, no tampering)
├── validation/                              size, real type (magic bytes), image re-encode + EXIF strip (chain)
├── sharepoint-graph/                        adapter: Microsoft Graph (+ graph.client.ts, sharepoint.config.ts)
├── power-automate/                          adapter: today's flows, only as a bridge if Graph access is late
├── dataverse-image/                         reader only: Dataverse image columns (events, news, …)
├── local-disk/                              adapter for local dev
└── in-memory/                               adapter for tests
test/contracts/file-storage.contract.ts      one suite every adapter must pass (in test/, outside the build)
src/modules/files/                           GET /files/:token  (streams the file, ETag / 304, Range)
src/modules/authentication/documents/        POST /auth/documents (registration documents) — a feature folder like register/ and otp/
```

### 5.3 The ports

As built in task 1 (`src/core/files/`):

```ts
/** Reads files. Every store implements it; read-only sources (Dataverse image columns) will too. */
export abstract class FileReader {
  /** found → its description, no bytes · missing → null */
  abstract describe(key: StorageKey): Promise<StoredFile | null>;
  /** found → its description + bytes · missing → null */
  abstract open(key: StorageKey): Promise<FileContent | null>;
}

/** Writes files. Only real stores implement it. */
export abstract class FileWriter {
  /** saves a new file · name already taken → a unique name, never an overwrite */
  abstract upload(file: FileUpload): Promise<StoredFile>;
  /** swaps the file at `key` for `file` · `key` missing → just saves `file`. The returned key may differ (the flows rename): callers keep it */
  abstract replace(key: StorageKey, file: FileUpload): Promise<StoredFile>;
  /** removes the file · already missing → no error (safe to retry) */
  abstract delete(key: StorageKey): Promise<void>;
}

/** A full store. A class extends one class only, so both ports are `implements` and all 5 methods are written out. */
export abstract class FileStorage implements FileReader, FileWriter { /* the 5 abstract methods */ }
```

DI: `{ provide: FileStorage, useClass: <adapter> }` + `{ provide: FileReader, useExisting: FileStorage }` + `{ provide: FileWriter, useExisting: FileStorage }`.

No `DirectDownload` port: F2 = always stream through our API. Byte ranges and thumbnails are added in task 4.

```ts
interface FileUpload {
  folder: StorageFolder;      // logical (UserDocuments, …; one member per feature, added with it); the adapter maps it to a real folder
  name: string;               // built by the server, never by the phone
  contentType: string;        // checked from the bytes, not the extension
  content: Buffer;            // whole file: files are small (F6) and the flows need it all as base64 anyway
}

interface FileContent {
  file: StoredFile;
  stream: Readable;           // sent to the client without loading it all in memory
}

interface StoredFile {
  key: StorageKey;            // opaque: a SharePoint path, a blob name… only the adapter reads it
  name: string;
  contentType: string;
  size: number;
  version: string;            // ETag: changes whenever the content changes
  updatedAt: Date;
}
```

`StorageKey` stays a SharePoint server-relative path while SharePoint is the store, so the existing CRM fields (`com_profilepicturefilepath`, …) and anything the CRM team uses to view documents keep working.

### 5.4 SOLID, concretely

| Principle | How |
| --- | --- |
| Single responsibility | storing bytes (`FileStorage`), naming (`DocumentNamingPolicy`), checking (`validation/`), links (`FileLinkFactory`), who may read what (feature services), CRM fields (repositories) are separate classes |
| Open / closed | new store = new adapter class; new read source = new `FileReader`; new check = one more validator in the chain; cross-cutting needs = decorators (`RetryingFileStorage`, `LoggingFileStorage`, `CachingFileReader`) around any adapter |
| Liskov | one **contract test suite** that every adapter must pass (upload → open returns the same bytes; delete twice is fine; missing → null; replace changes the version) |
| Interface segregation | `FileReader` / `FileWriter` / `DirectDownload`: the Dataverse image source only reads; only stores that can hand out URLs implement `DirectDownload` |
| Dependency inversion | services depend on the abstract classes (Nest DI tokens); `FilesModule.register({ driver })` binds the real class from config |

Patterns: Adapter (each store), Strategy (read sources, stream vs redirect), Chain of responsibility (validators), Decorator (retry / log / cache), Factory (links). Same composition-over-inheritance rule as the register strategies.

### 5.5 Upload: registration documents

```text
POST /auth/documents   multipart: userId + selfie, idFront, idBack, birthCertificate, marriageCertificate, contractFront, contractBack
 1. load the user → deactivated / not found / wrong state → error
 2. owner: mobile verified? else MOBILE_NOT_VERIFIED
 3. required documents for this user (domain rule per type: role, age ≥ 15 from com_birthdate, Spouse) → missing → DOCUMENTS_MISSING + the list
 4. each file: size limit, real type (JPEG / PNG / PDF), images re-encoded (max size, EXIF removed)
 5. upload all (in parallel); any failure → delete the ones already saved → UPLOAD_FAILED, nothing changed in the CRM
 6. one PATCH on com_users with every name/path field; on failure delete the new files
 7. replaced documents: the old files are deleted last (the record never points to a missing file)
 8. status → Under Review; invited users: the invitation is closed (Completed + com_acceptedon) in the same step
```

The server builds names such as `<userId>/selfie-20261009T110303.jpg`, so `marriage.png` mistakes and path tricks can't happen.

### 5.6 Download: files as network files

Every response that shows a file carries links instead of base64, **inside its own body** (e.g. the future Events / News list endpoint returns each item's image link with the item). The app never asks "give me file X": it puts the link straight in an image widget, which downloads it once and serves it from its disk cache afterwards.

```json
{
  "id": "…",
  "title": "Summer festival",
  "image": {
    "url": "https://api…/files/eyJr…sig",
    "thumbnailUrl": "https://api…/files/eyJr…sig?size=thumb",
    "contentType": "image/jpeg",
    "version": "W/\"76796548\""
  }
}
```

```text
GET /files/:token[?size=thumb]
  token = signed { source, key, version, expiry }   ← made by FileLinkFactory, checked by the signer (no storage path visible)
  → If-None-Match equals the version → 304 (nothing sent)
  → store supports DirectDownload and the file is big (PDF, video) → 302 to a short-lived provider URL
  → else stream it: Content-Type, Content-Length, ETag, Cache-Control: private, max-age=…, Accept-Ranges (206 for Range)
```

- The token carries the version, so a URL never changes while the file is the same: the app's disk cache serves it with **zero network**.
- `size=thumb`: SharePoint gives thumbnails for free through Graph (`small` 96 px, `medium` 176 px, `large` 800 px, or custom like `c300x400_crop`); Dataverse image columns give a 144×144 thumbnail. Lists download a few KB per item.
- Signed links work in any image widget (no auth header needed) and can sit behind a CDN later. Once login exists, a link can also be bound to the user.
- The existing `ResponseInterceptor` already lets `StreamableFile` through untouched.

### 5.7 Reaching SharePoint: Graph or the flows

| | Microsoft Graph (recommended) | Keep the Power Automate flows |
| --- | --- | --- |
| Speed | direct REST, binary, streaming | a flow run per file (seconds) |
| Limits | upload up to 250 MB in one request (larger: upload session, 320 KiB-multiple chunks) | 100 MB message, 120 s sync timeout, Power Platform daily request quota |
| Thumbnails / direct URLs | yes (`thumbnails`, `@microsoft.graph.downloadUrl`, Range) | no |
| Security | app-only token, `Sites.Selected` = access to **one** site only | SAS URLs that act as passwords |
| Setup | an Azure AD app permission + a grant on the site (IT admin). We already use MSAL client credentials for Dataverse, so the token code is reused | nothing new |
| CRM fields | our service writes them (step 6 above) | the flow writes them |

Both fit behind `FileStorage`. If IT approval takes time, the flow adapter can ship first and be swapped later without touching any feature.

### 5.8 Replacing SharePoint later

```text
1. add src/core/files/azure-blob/azure-blob.file-storage.ts (+ DirectDownload with SAS URLs)
2. run the same contract tests against it
3. FILES_DRIVER=azure-blob
4. copy existing files (one-off job), rewrite the stored keys
```

No feature, controller, DTO or mapper changes.

### 5.9 Testing

| Level | What |
| --- | --- |
| Contract tests | one suite, run against in-memory, local disk and (on a test site) Graph |
| Feature tests | `InMemoryFileStorage` + fake repositories, like the isolated register / OTP e2e |
| HTTP | `GET /files/:token`: 200, 304, 206, expired token, tampered token |
| Manual | Postman on phdtest, with the same browser checks as the register / OTP tests |

---

## 6. What the mobile team changes (performance)

| # | Change | Gain |
| --- | --- | --- |
| 1 | never create a future inside `build()`; load once in the cubit / controller | removes repeated downloads (the biggest win, possible today) |
| 2 | `cached_network_image` with the API's `url` and `cacheKey` = file id + version; `memCacheWidth` = display size | repeat views are instant and offline-friendly |
| 3 | lists use `thumbnailUrl`, detail screens use `url` | KBs instead of MBs per row |
| 4 | upload with `multipart/form-data` (Dio `MultipartFile.fromFile`, streamed from disk), compress every picked image (e.g. max 1920 px, JPEG 80) | smaller, faster uploads; no base64 in memory |
| 5 | drop base64 from SharedPreferences | faster app start |
| 6 | PDFs / videos: download to a file with progress (Range support for resume) | big files without freezing the UI |

---

## 7. Decisions needed

| # | Question | Recommendation |
| --- | --- | --- |
| F1 | Reach SharePoint through **Graph** (needs an IT grant) or keep the **flows** from the backend? | **decided**: Graph is the target, flows adapter until IT grants it ([IT request](it-request-sharepoint-access.md), not sent yet) |
| F2 | Serve files by **streaming through our API**, **redirecting** to a short-lived provider URL, or both? | **decided**: always stream through our API (no redirect) |
| F3 | Protect file links with **signed URLs** (expiry in the link) or a **login token** header? | **decided**: private files → signed link with expiry · guest-mode files (events, news, …) → public link; the server picks the kind per file source |
| F4 | Keep files in the **same site / folders** and keep writing the **same CRM fields**, so the CRM team's review screens keep working? | **answered**: yes, same folder, same name format, same double-encoded path (section 2.7) |
| F5 | Thumbnails from **Graph** (free) or generated by us at upload (e.g. `sharp`)? | **decided**: only from the store (Graph, Dataverse image columns); a store without thumbnails serves the full file |
| F6 | Limits: max size per document, allowed types | **decided**: per case, each endpoint / document declares its own types + max size |

## 8. Facts to collect on phdtest (browser, read-only)

Status 2026-10-09: 1 and 2 collected (sections 2.6, 2.7). 3 still open.

1. General settings, without the flow URLs (they are secrets):
   `blser_generalsettings?$select=com_sharepointsiteaddress,com_userattachmentsfolderpath,com_vehicleattachmentsfolderpath,com_gatepassattachmentsfolderpath,com_invitationunitattachmentsfolderpath,com_sendusamessagefolderpath`
2. The path format saved on a user:
   `com_users(<id>)?$select=com_profilepicturefilename,com_profilepicturefilepath,com_nationalidfrontname,com_nationalidfrontpath`
3. Which image columns keep a full-size image:
   `attributeimageconfigs?$select=parententitylogicalname,attributelogicalname,canstorefullimage`

## 9. Proposed tasks (Step 3)

The up-to-date list with statuses lives in [TASKS.md](../TASKS.md) (Step 3).

---

## Sources

- [Graph: upload small files (≤ 250 MB)](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content)
- [Graph: upload session (chunks, 320 KiB multiples, < 60 MiB per request)](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession)
- [Graph: download content (302 to a pre-authenticated URL, Range)](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content)
- [Graph: thumbnails (sizes, custom sizes, cache-safe URLs)](https://learn.microsoft.com/en-us/graph/api/driveitem-list-thumbnails)
- [Sites.Selected: app access to specific sites only](https://devblogs.microsoft.com/microsoft365dev/controlling-app-access-on-specific-sharepoint-site-collections/)
- [Dataverse image columns (thumbnail 144×144, `size=full`, `_URL` / `_Timestamp`)](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/image-column-data)
- [Power Automate limits (100 MB message, 120 s timeout)](https://learn.microsoft.com/en-us/power-automate/limits-and-config)
- [Power Platform request limits per licence](https://learn.microsoft.com/en-us/power-platform/admin/api-request-limits-allocations)
