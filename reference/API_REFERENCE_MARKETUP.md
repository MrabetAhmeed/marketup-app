# MARKET-UP API Reference

This document summarizes the API endpoints required to power the **MARKET-UP** platform (vivasky.media).
It is the contract between the Next.js implementation team and the existing static mockups (Phase A + B2 + C + D) which serve as the source of truth for shapes and UX states.

> **Source of truth:** the 33 HTML mockups under the project root + `marketup_seed_data.js` (data shape, enums, narrative conventions).
> When this document and the mockups disagree, the mockups win — please flag the discrepancy.

---

## Base Configuration

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json` (unless multipart for uploads)
- **Charset**: `UTF-8`
- **Locale**: French (`fr-FR`). Currency: Tunisian Dinar (`DT`). VAT: 19%.
- **All monetary values are in DT**, stored HT (excl. VAT) and surfaced TTC (incl. VAT) at read-time.
- **All i18n fields** (`{fr, ar, en}` in the seed) are normalized to a single FR string in responses unless the request includes `?lang=ar` or `?lang=en`.

### Authentication — Two Options Documented

The team has not yet decided between the two patterns below. Both are equally supported by the backend.

#### Option A — NextAuth.js Sessions (recommended for browser app)
- Auth is handled by NextAuth with the `Credentials` provider.
- Session is stored in an `httpOnly` cookie (`__Secure-next-auth.session-token`).
- All `/api/v1/me/*` and `/api/v1/admin/*` endpoints require an active session.
- Session payload contains:
  ```json
  {
    "user": {
      "id": "uuid",
      "companyId": "uuid",
      "role": "OWNER",
      "email": "ahmed@technofab.tn"
    },
    "expires": "2026-05-12T00:00:00.000Z"
  }
  ```
- No additional headers needed from the client; CSRF is handled by NextAuth.

#### Option B — JWT Headers (recommended for mobile / external clients)
All requests must include:
- `x-user-id`: UUID of the authenticated user
- `x-user-role`: One of `OWNER` | `SUPER_ADMIN`
- `x-company-id`: UUID of the user's company (for OWNER role only)
- `Authorization`: `Bearer <jwt>` — signed JWT containing `{userId, role, companyId, exp}`

JWT is obtained via `POST /auth/login` and refreshed via `POST /auth/refresh`.

### Common Response Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `204` | Success, no content |
| `400` | Validation error (returns `{ error: { code, message, fields } }`) |
| `401` | Not authenticated |
| `403` | Authenticated but not authorized for this resource |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate RNE, email already used) |
| `422` | Business rule violation (e.g. trying to boost a non-active profile) |
| `429` | Rate-limited |
| `500` | Server error |

### Standard Error Body

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid request body",
    "fields": {
      "email": "Must be a valid email",
      "rne": "RNE must be 7 characters"
    }
  }
}
```

### Pagination Convention

All list endpoints accept `?page=N&limit=M` and return:

```json
{
  "items": [ /* ... */ ],
  "total": 142,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

Default `limit` is `20`, max is `100`.

### Sorting & Filtering

- Sort: `?sort=field` or `?sort=-field` for desc. Examples: `?sort=createdAt`, `?sort=-views30d`.
- Search: `?q=<term>` performs full-text search on a relevant subset of fields per endpoint.
- Date filters: `?from=YYYY-MM-DD&to=YYYY-MM-DD` (ISO 8601).

---

## 1. Authentication

The signup flow has **three steps** (see `auth_inscription-entreprise.html` → `auth_inscription-utilisateur.html` → `auth_inscription-otp.html`):
company info → user info → email OTP verification. After OTP the account is created but stays in `pending` validation state until an admin approves it (24–48h SLA).

### `POST /auth/signup/company`
**Auth:** Public.
Step 1/3. Creates a draft company. Returns a `signupToken` to use in steps 2 & 3.

**Request Body:**
```json
{
  "type": "B2B",
  "displayName": "TechnoFab Industries",
  "legalId": "B12345",
  "vatNumber": "1234567/A/P/M/000",
  "accountEmail": "ahmed@technofab.tn",
  "country": "TN",
  "sectorId": "mecanique",
  "gouvernorat": "sousse",
  "ville": "Sahline",
  "address": "Rue de l'Industrie, ZI Sahline"
}
```

**Validation rules:**
- `type` ∈ `{ "B2B", "B2C" }`
- `legalId`: 7 chars (RNE format)
- `vatNumber`: optional, format `1234567/A/P/M/000`
- `accountEmail`: must not exist for any active company
- `sectorId`: must exist in `GET /resources/sectors-b2b` (if B2B) or `/resources/categories-b2c` (if B2C)

**Response Body (`201`):**
```json
{
  "signupToken": "stk_abc123",
  "companyDraftId": "uuid",
  "expiresAt": "2026-05-12T11:00:00.000Z"
}
```

---

### `POST /auth/signup/user`
**Auth:** Public, requires `signupToken` from step 1.
Step 2/3. Attaches user info to the company draft and triggers OTP email.

**Request Body:**
```json
{
  "signupToken": "stk_abc123",
  "firstName": "Ahmed",
  "lastName": "Mrabet",
  "phone": "+216 71 234 567",
  "languages": ["fr", "ar"],
  "password": "Demo1234!",
  "acceptedTermsAt": "2026-05-12T10:00:00.000Z"
}
```

**Validation rules:**
- `password`: min 8 chars, ≥1 uppercase, ≥1 digit, ≥1 special
- `acceptedTermsAt`: required (CGU acceptance timestamp)

**Response Body (`200`):**
```json
{
  "otpSentTo": "ahm***@technofab.tn",
  "otpExpiresAt": "2026-05-12T10:10:00.000Z",
  "canResendAt": "2026-05-12T10:01:00.000Z"
}
```

---

### `POST /auth/signup/verify-otp`
**Auth:** Public.
Step 3/3. Verifies the 6-digit OTP, finalizes account creation, and transitions company to `pending` validation status.

**Request Body:**
```json
{
  "signupToken": "stk_abc123",
  "otpCode": "123456"
}
```

**Response Body (`201`):**
```json
{
  "company": {
    "id": "uuid",
    "displayName": "TechnoFab Industries",
    "status": "pending",
    "createdAt": "2026-05-12T10:05:00.000Z"
  },
  "user": {
    "id": "uuid",
    "email": "ahmed@technofab.tn",
    "firstName": "Ahmed"
  },
  "next": "WAIT_ADMIN_VALIDATION"
}
```

**Note:** No session/JWT issued at this point — the account cannot log in until admin approval. UI must redirect to `auth_validation-success.html` and display the 3-step validation timeline.

---

### `POST /auth/signup/resend-otp`
**Auth:** Public, requires `signupToken`.
Resends OTP email. Rate-limited to once every 60 seconds.

**Request Body:**
```json
{ "signupToken": "stk_abc123" }
```

**Response Body (`200`):**
```json
{ "otpExpiresAt": "...", "canResendAt": "..." }
```

**Errors:** `429` if called before `canResendAt`.

---

### `POST /auth/login`
**Auth:** Public.
Authenticates an existing user. Only succeeds if the company is `active`.

**Request Body:**
```json
{
  "email": "ahmed@technofab.tn",
  "password": "Demo1234!",
  "rememberMe": true
}
```

**Response Body (`200`):**
- **Option A (NextAuth):** sets session cookie, returns user payload.
- **Option B (JWT):**
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rfk_...",
    "expiresIn": 3600,
    "user": { "id": "uuid", "companyId": "uuid", "role": "OWNER" }
  }
  ```

**Errors:**
- `401` invalid credentials
- `403 { code: "COMPANY_NOT_ACTIVE", status: "pending"|"rejected"|"suspended" }` — the UI in `auth_connexion.html` shows the appropriate banner.

---

### `POST /auth/logout`
**Auth:** Required.
Invalidates session (Option A) or refresh token (Option B).

**Response (`204`):** No content.

---

### `POST /auth/refresh` *(Option B only)*
**Auth:** Public, requires `refreshToken`.

**Request Body:**
```json
{ "refreshToken": "rfk_..." }
```

**Response Body (`200`):** Same shape as `POST /auth/login`.

---

### `POST /auth/password/forgot`
**Auth:** Public.
Triggers password-reset email. Always returns `200` regardless of whether the email exists (anti-enumeration).

**Request Body:**
```json
{ "email": "ahmed@technofab.tn" }
```

**Response Body (`200`):**
```json
{ "message": "If an account exists for this email, a reset link has been sent." }
```

---

### `POST /auth/password/reset`
**Auth:** Public, requires `resetToken` from email.

**Request Body:**
```json
{
  "resetToken": "rst_xyz",
  "newPassword": "NewPass123!"
}
```

**Response Body (`200`):**
```json
{ "message": "Password updated. You can now log in." }
```

**Errors:** `400 { code: "TOKEN_EXPIRED" | "TOKEN_INVALID" }`

---

### `POST /auth/email/resend-validation`
**Auth:** Public.
Used by `auth_validation-email.html` when a user lost the OTP email post-signup.

**Request Body:**
```json
{ "email": "ahmed@technofab.tn" }
```

**Response Body (`200`):** Same as `resend-otp`.

---

## 2. Account & Company (Owner)

The "Account" zone follows MARKET-UP's **3-tier validation pattern** (see `SEED_ARCHITECTURE.md §4.4.1`):

- **`liveData`** (instant-edit fields): phone, whatsapp, contactEmail, address, ville, gouvernorat, sectorId, languages
- **`data`** (admin-validated fields): displayName, logo
- **Locked fields** (immutable after signup): legalId (RNE), vatNumber, accountEmail, type (B2B/B2C), country

Modifying an `instant` field updates the company immediately. Modifying a `validation` field goes into `pendingUpdates` and waits for admin approval.

### `GET /me`
**Auth:** Required (OWNER).
Returns the current user's profile, their company, and the 3 profiles' summary.

**Response Body:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "Ahmed",
    "lastName": "Mrabet",
    "email": "ahmed@technofab.tn",
    "phone": "+216 71 234 567",
    "languages": ["fr", "ar"],
    "avatarInitials": "AM",
    "lastLoginAt": "2026-05-12T08:00:00.000Z"
  },
  "company": {
    "id": "c-001",
    "slug": "technofab-industries",
    "type": "B2B",
    "status": "active",
    "displayName": "TechnoFab Industries",
    "legalId": "B12345",
    "vatNumber": null,
    "accountEmail": "ahmed@technofab.tn",
    "country": "TN",
    "sector": { "id": "mecanique", "name": "Mécanique" },
    "gouvernorat": { "id": "sousse", "name": "Sousse" },
    "ville": "Sahline",
    "address": "Rue de l'Industrie, ZI Sahline",
    "contactEmail": "contact@technofab.tn",
    "phone": "+216 73 222 333",
    "whatsapp": "+216 20 123 456",
    "logoUrl": "https://cdn.../technofab-logo.png",
    "registeredAt": "2025-12-01T10:00:00.000Z",
    "validatedAt": "2025-12-02T10:00:00.000Z",
    "rseBadgeStatus": "validated"
  },
  "profiles": {
    "brandup": { "status": "rejected", "visible": false },
    "traceup": { "status": "pending",  "visible": false },
    "linkup":  { "status": "active",   "visible": true, "boosted": true, "sponsoring": true }
  },
  "pendingUpdates": null
}
```

**Maquette:** `dashboard_index.html` (welcome + status), `dashboard_account.html` (full form).

---

### `PUT /me/account/live`
**Auth:** Required (OWNER).
Updates *instant-edit* fields (`liveData` in the seed). Takes effect immediately without admin review.

**Request Body:**
```json
{
  "phone": "+216 73 222 333",
  "whatsapp": "+216 20 123 456",
  "contactEmail": "contact@technofab.tn",
  "address": "Rue de l'Industrie, ZI Sahline",
  "ville": "Sahline",
  "gouvernorat": "sousse",
  "sectorId": "mecanique",
  "languages": ["fr", "ar"]
}
```

All fields are optional — only provided keys are updated.

**Response Body (`200`):** Updated `company` object (same shape as in `GET /me`).

---

### `POST /me/account/request-changes`
**Auth:** Required (OWNER).
Submits a change request for *validation-gated* fields (`displayName`, `logo`). The change is staged in `pendingUpdates` and waits for admin approval. The company status remains `active` during the review; existing public profiles stay visible (unlike profile-level pendingData which hides the profile).

**Request Body (multipart/form-data):**
- `displayName` (optional): string
- `logoFile` (optional): File — uploaded image (PNG/JPG, max 2 MB)
- `note` (optional): string — explanation visible to the admin

**Response Body (`202` Accepted):**
```json
{
  "pendingUpdates": {
    "submittedAt": "2026-05-12T11:00:00.000Z",
    "fields": [
      { "key": "logo", "label": "Logo", "currentValue": "logo-v1.png", "newValue": "logo-v2-rebrand.png" }
    ],
    "note": "Refonte de l'identité visuelle"
  },
  "message": "Modifications soumises. Validation admin sous 48h."
}
```

**Maquette:** `dashboard_account.html` "Demander modification" CTA on locked fields.

---

### `DELETE /me/account/request-changes`
**Auth:** Required (OWNER).
Cancels a pending change request before admin reviews it.

**Response (`204`):** No content.

---

### `PUT /me/security/password`
**Auth:** Required (OWNER).

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Maquette:** `dashboard_settings.html` "Sécurité" section.

---

### `DELETE /me/account`
**Auth:** Required (OWNER).
Soft-deletes the user's company (sets `deletedAt`, cascades to hide all profiles publicly). The deletion is **reversible by an admin** for 30 days.

**Request Body:**
```json
{
  "password": "CurrentPass!",
  "reason": "Cessation d'activité"
}
```

**Response (`204`):** No content.

**Maquette:** `dashboard_settings.html` deletion modal.

---

## 3. Profiles (BrandUP / TraceUP / LinkUP)

MARKET-UP exposes three independent profile types per company. Each follows the **"Model B + Draft pre-flight"** workflow:

1. Owner edits content → status remains `incomplete` or stays in current state with `pendingData`.
2. Owner submits → status becomes `pending`, profile is **invisible publicly** (Model B strict).
3. Admin reviews → `approve` → status `active` + content merged + profile becomes visible / OR `reject` with a reason.

**Profile visibility rule:**
```
profile.visible = (company.status === "active")
              && (profile.status === "active")
              && (profile.isPublic === true)
              && (profile.pendingData === null)
```

**Profile-type quirks:**
- **BrandUP**: editable content lives in `data.pitch`, `data.about`, `data.services`, `data.gallery`, `data.projects`, `data.certifications`, `data.links`, `data.color`. Uses `pendingData` for modifs.
- **TraceUP**: `data.channelName`, `data.channelDescription`, and `data.videos[]`. Per `SEED_ARCHITECTURE §4.4.1`, **videos are added/removed without admin re-validation** (decision Apr 19, 2026). Only the channel metadata (name, description) goes through `pendingData`.
- **LinkUP**: `data.contactCard` (fullName, title, company, bio, email, phone, whatsapp, website, address, gpsPosition), `data.qrConfig`, `data.socials[]`. Uses `pendingData` for modifs.

---

### `GET /me/profiles`
**Auth:** Required (OWNER).
Returns all 3 profiles in a single payload.

**Response Body:**
```json
{
  "brandup": { /* see GET /me/profiles/brandup */ },
  "traceup": { /* ... */ },
  "linkup":  { /* ... */ }
}
```

---

### `GET /me/profiles/:type`
**Auth:** Required (OWNER).
**Path Parameters:** `type` ∈ `{ "brandup", "traceup", "linkup" }`

**Response Body (BrandUP example):**
```json
{
  "type": "brandup",
  "status": "active",
  "submittedAt": "2026-02-01T10:00:00.000Z",
  "publishedAt": "2026-02-15T10:00:00.000Z",
  "lastValidatedAt": "2026-02-15T10:00:00.000Z",
  "rejectionReason": null,
  "rejectedAt": null,
  "isPublic": true,
  "visible": true,
  "data": {
    "pitch": "Distributeur de pièces automobiles...",
    "about": "Fondée en 2015...",
    "color": "#DC2626",
    "services": [
      { "name": "Pièces détachées" },
      { "name": "Équipements garage" }
    ],
    "gallery": [
      { "id": "img-1", "url": "https://...", "order": 1 }
    ],
    "projects": [
      { "id": "proj-1", "name": "...", "image": "...", "description": "...", "order": 1 }
    ],
    "certifications": [
      { "id": "cert-1", "name": "ISO 9001", "label": "...", "image": "...", "issuedAt": "2024-01-15", "expiresAt": "2027-01-15" }
    ],
    "links": [
      { "label": "Site web", "url": "https://...", "icon": "language" }
    ]
  },
  "pendingData": null,
  "stats": {
    "viewsTotal": 1287,
    "views30d": 234,
    "clicksTotal": 76
  }
}
```

**Response Body (TraceUP):** Same envelope, `data` contains:
```json
{
  "channelName": "TechnoFab Studio",
  "channelDescription": "...",
  "videos": [
    {
      "id": "v-1",
      "source": "youtube",
      "videoId": "abc123",
      "videoUrl": "https://www.youtube.com/watch?v=abc123",
      "thumbnailUrl": "https://...",
      "category": "actualite",
      "title": "...",
      "description": "...",
      "status": "active",
      "publishedAt": "2026-04-01T08:00:00.000Z",
      "order": 1
    }
  ]
}
```

**Response Body (LinkUP):** Same envelope, `data` contains:
```json
{
  "contactCard": {
    "photo": "https://...",
    "fullName": "Ahmed Mrabet",
    "title": "Directeur Général",
    "company": "TechnoFab Industries",
    "bio": "...",
    "email": "ahmed@technofab.tn",
    "phone": "+216 71 234 567",
    "whatsapp": "+216 71 234 567",
    "website": "https://technofab.tn",
    "address": "Rue de l'Industrie, ZI Sahline, Sousse",
    "gpsPosition": { "type": "Point", "coordinates": [10.5907, 35.7628] }
  },
  "qrConfig": {
    "style": "rounded",
    "colorForeground": "#000000",
    "colorBackground": "#FFFFFF",
    "logoOverlay": true
  },
  "socials": [
    { "platform": "linkedin",  "url": "https://linkedin.com/in/ahmedmrabet" },
    { "platform": "facebook",  "url": "..." }
  ]
}
```

**Maquettes:** `dashboard_brandup.html`, `dashboard_traceup.html`, `dashboard_linkup.html`.

---

### `POST /me/profiles/:type/submit`
**Auth:** Required (OWNER).
First-time submission: transitions a profile from `incomplete` to `pending`. The full content is taken from `data` (already saved via `PUT /me/profiles/:type`).

**Request Body:** Empty.

**Response Body (`200`):**
```json
{
  "type": "brandup",
  "status": "pending",
  "submittedAt": "2026-05-12T11:00:00.000Z",
  "message": "Profil soumis. Validation admin sous 48h."
}
```

**Errors:**
- `422 { code: "INCOMPLETE_CONTENT", missingFields: ["pitch", "services"] }` — required content fields missing.
- `422 { code: "ALREADY_SUBMITTED" }` — profile is already pending or active.

---

### `PUT /me/profiles/:type`
**Auth:** Required (OWNER).
Updates profile content.

- If `status === "incomplete"`: writes directly to `data` (no admin review yet).
- If `status ∈ ("active", "rejected")`: writes to `pendingData` and the profile becomes **invisible publicly** until approval.
- If `status === "pending"`: returns `422` — owner cannot edit during admin review.

**Request Body (BrandUP example):**
```json
{
  "pitch": "Updated pitch...",
  "about": "Updated about...",
  "color": "#0078D4",
  "services": [{ "name": "Nouveau service" }],
  "links": [{ "label": "...", "url": "...", "icon": "language" }],
  "note": "Mise à jour suite à l'ouverture du nouveau centre."
}
```

**Response Body (`200`):**
```json
{
  "type": "brandup",
  "status": "active",
  "pendingData": {
    "submittedAt": "2026-05-12T11:00:00.000Z",
    "note": "Mise à jour...",
    "fields": [
      { "key": "pitch",     "label": "Pitch",      "currentValue": "...",  "newValue": "Updated pitch..." },
      { "key": "services",  "label": "Services",   "currentValue": "...",  "newValue": "..." }
    ]
  },
  "visible": false,
  "message": "Modifications soumises. Le profil sera de nouveau visible après validation admin (sous 48h)."
}
```

**Maquettes:** edit forms in `dashboard_brandup.html`, `dashboard_linkup.html`.

---

### `DELETE /me/profiles/:type/pending-data`
**Auth:** Required (OWNER).
Cancels a pending modification request, re-publishes the original `data` (profile becomes visible again).

**Response (`204`):** No content.

---

### `PUT /me/profiles/:type/disable`
**Auth:** Required (OWNER).
Disables a profile manually (status → `disabled`, profile invisible publicly). Useful for seasonal businesses.

**Response Body (`200`):**
```json
{ "type": "linkup", "status": "disabled", "disabledAt": "2026-05-12T11:00:00.000Z" }
```

**Errors:** `422 { code: "INVALID_STATE_TRANSITION" }` if status is not `active`.

---

### `PUT /me/profiles/:type/enable`
**Auth:** Required (OWNER).
Re-enables a disabled profile. Goes back to `active` (no admin review needed, the content was previously validated).

**Response Body (`200`):**
```json
{ "type": "linkup", "status": "active", "publishedAt": "..." }
```

---

### TraceUP-specific: Video Management

Per the multi-platform patch of April 20, 2026 (`BRIEF_PATCH_VIDEO_SOURCES.md`), TraceUP supports **three video sources**: YouTube, Dailymotion, Vimeo. Videos are added/removed without admin re-validation.

**Supported URL patterns:**
- YouTube: `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/shorts/…`
- Dailymotion: `dailymotion.com/video/…`, `dai.ly/…`
- Vimeo: `vimeo.com/…`

#### `POST /me/profiles/traceup/videos`
**Auth:** Required (OWNER).
Adds a video to the channel. The server extracts the video ID, fetches the thumbnail (via oEmbed for Dailymotion/Vimeo, direct URL for YouTube), and saves the record.

**Request Body:**
```json
{
  "source": "youtube",
  "videoUrl": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "category": "actualite",
  "title": "Visite de notre nouvelle ligne de production CNC",
  "description": "Découvrez nos nouvelles machines..."
}
```

**Validation:**
- `source` ∈ `{ "youtube", "dailymotion", "vimeo" }`
- `videoUrl` must match a known regex for the chosen `source`
- `category` ∈ `{ "actualite", "offres", "astuces", "emplois" }`
- `title` ≤ 120 chars
- `description` ≤ 280 chars, optional

**Response Body (`201`):**
```json
{
  "id": "v-uuid",
  "source": "youtube",
  "videoId": "jNQXAC9IVRw",
  "videoUrl": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "thumbnailUrl": "https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg",
  "category": "actualite",
  "title": "...",
  "description": "...",
  "status": "active",
  "publishedAt": "2026-05-12T11:00:00.000Z",
  "order": 7
}
```

**Errors:**
- `400 { code: "INVALID_URL_FOR_SOURCE" }` — URL doesn't match the source's regex.
- `409 { code: "DUPLICATE_VIDEO" }` — videoId already exists on this channel.
- `502 { code: "THUMBNAIL_FETCH_FAILED" }` — oEmbed call failed (Dailymotion/Vimeo).

#### `PUT /me/profiles/traceup/videos/:id`
Updates the title, description, or category of a video.

#### `PUT /me/profiles/traceup/videos/reorder`
**Request Body:** `{ "videoIds": ["v-1", "v-3", "v-2"] }` — new order.

#### `DELETE /me/profiles/traceup/videos/:id`
Deletes a video from the channel.

**Maquette:** `dashboard_traceup.html` "Ajouter une vidéo" modal.

---

## 4. Public Search Engines & Profiles

Three independent search engines, each serving a different intent. All public (no auth required). Only profiles where `visible === true` are returned.

### `GET /search/brandup`
**Auth:** Public.

**Query Parameters:**
- `q` (optional): full-text search on `displayName`, `pitch`, `services`, `keywords`
- `sectorId` (optional): filter by B2B sector or B2C category
- `gouvernorat` (optional): filter by governorate
- `type` (optional): `B2B` | `B2C`
- `page`, `limit` (pagination)
- `sort` (optional): `-views30d` (default), `-publishedAt`, `displayName`

**Response Body:**
```json
{
  "items": [
    {
      "companyId": "c-001",
      "slug": "technofab-industries",
      "displayName": "TechnoFab Industries",
      "logoUrl": "https://...",
      "type": "B2B",
      "sector": { "id": "mecanique", "name": "Mécanique" },
      "gouvernorat": "Sousse",
      "ville": "Sahline",
      "pitch": "Distributeur de pièces automobiles...",
      "boosted": true,
      "color": "#0078D4"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

**Maquette:** `public_brandup.html`.

---

### `GET /search/traceup`
**Auth:** Public.

**Query Parameters:**
- `q` (optional): full-text search on `channelName`, `displayName`, video titles
- `category` (optional): `actualite` | `offres` | `astuces` | `emplois`
- `sectorId`, `gouvernorat`, `type`, `page`, `limit`, `sort`

**Response Body:** Similar to BrandUP, items include `channelName`, `videosCount`, `lastVideoPublishedAt`, top 1–3 video thumbnails.

**Maquette:** `public_traceup.html`.

---

### `GET /search/linkup`
**Auth:** Public.

**Query Parameters:** Same as BrandUP plus optional `?contactKind=email|phone|whatsapp`.

**Response Body:** items include `cardName`, `cardTitle`, `cardCompany`, primary contact methods preview.

**Maquette:** `public_linkup.html`.

---

### `GET /public/brandup/:slug`
**Auth:** Public.
Returns the full public BrandUP profile, **only if visible**. Otherwise `404`.

**Response Body:** Same shape as `GET /me/profiles/brandup`, minus owner-only fields (`pendingData`, `submittedAt`, `rejectionReason`, etc.).

**Maquette:** `public_brandup_<slug>.html` (e.g., `public_brandup_technofab-industries.html`).

---

### `GET /public/traceup/:slug`
**Auth:** Public. Same pattern as BrandUP.

**Maquette:** `public_traceup_<slug>.html`.

---

### `GET /public/linkup/:slug`
**Auth:** Public. Same pattern as BrandUP.

**Maquette:** `public_linkup_<slug>.html`.

---

### `POST /public/profiles/:type/:slug/track`
**Auth:** Public.
Records an engagement event (view, click, contact action). Used for stats and boost ROI.

**Request Body:**
```json
{
  "event": "view",
  "source": "search|direct|qr|share",
  "referrer": "https://...",
  "sessionId": "anon-uuid"
}
```

**Events:**
- `view` — profile page opened
- `click_link` — outbound link clicked (BrandUP `data.links`)
- `click_contact` — contact method clicked (LinkUP)
- `click_video` — video clicked (TraceUP)
- `qr_scan` — LinkUP QR code scanned

**Response (`204`):** No content.

---

### `GET /search/popup/:type/:slug`
**Auth:** Public.
Lightweight payload optimized for the popup quick-preview UI (used in search result hover/click).

**Response Body:** Compact subset of the full profile (~6–8 fields).

**Maquettes:** `public_brandup_popup_<slug>.html`, `public_traceup_popup_<slug>.html`, `public_linkup_popup_<slug>.html`.

---

## 5. Boost & Sponsoring

Both monetization features share the same business rule: **only `active` profiles can be boosted or sponsored**. A profile that is `pending`, `rejected`, `incomplete`, or `disabled` returns `422` on checkout.

**Pricing (canon V1.2):**
- **Boost**: 50 DT HT / 30 days = 59.50 DT TTC (VAT 19%)
- **Sponsoring**: 100 DT HT / 7 days = 119.00 DT TTC

### `GET /me/boost`
**Auth:** Required (OWNER).
Returns the 3 profile cards (one per type) with their boost eligibility and current boost (if any).

**Response Body:**
```json
{
  "cards": [
    {
      "profileType": "brandup",
      "status": "rejected",
      "eligible": false,
      "blockedReason": "Profil refusé — corrigez et soumettez à nouveau pour activer le boost.",
      "activeBoost": null,
      "history": []
    },
    {
      "profileType": "traceup",
      "status": "pending",
      "eligible": false,
      "blockedReason": "Profil en attente de validation — boost indisponible.",
      "activeBoost": null,
      "history": []
    },
    {
      "profileType": "linkup",
      "status": "active",
      "eligible": true,
      "activeBoost": {
        "id": "b-001",
        "from": "2026-04-24T00:00:00.000Z",
        "to":   "2026-05-24T23:59:59.000Z",
        "remainingDays": 12,
        "viewsAdded": 212,
        "clicksAdded": 18,
        "transactionId": "t-001"
      },
      "history": [
        { "id": "b-000", "from": "...", "to": "...", "status": "expired", "viewsAdded": 78 }
      ]
    }
  ],
  "pricing": { "ht": 50, "vatRate": 0.19, "ttc": 59.50, "currency": "DT", "durationDays": 30 }
}
```

**Maquette:** `dashboard_boost.html`.

---

### `POST /me/boost/checkout`
**Auth:** Required (OWNER).
Initiates a boost purchase for a given profile.

**Request Body:**
```json
{
  "profileType": "linkup",
  "paymentMethod": "card"
}
```

**Response Body (`201`):**
```json
{
  "boost": {
    "id": "b-uuid",
    "profileType": "linkup",
    "from": "2026-05-12T11:00:00.000Z",
    "to":   "2026-06-11T11:00:00.000Z",
    "status": "active"
  },
  "transaction": {
    "id": "t-uuid",
    "type": "boost",
    "priceHT": 50,
    "vatAmount": 9.50,
    "priceTTC": 59.50,
    "status": "paid",
    "paymentMethod": "card",
    "invoiceUrl": "https://.../invoice-2026-0042.pdf",
    "invoiceNumber": "INV-2026-0042"
  }
}
```

**Errors:**
- `422 { code: "PROFILE_NOT_ELIGIBLE", profileStatus: "rejected" }`
- `409 { code: "BOOST_ALREADY_ACTIVE" }` — owner has an active boost on this profile.

---

### `GET /me/sponsoring`
**Auth:** Required (OWNER). **Guard:** `requireMonetization()`.
Returns 3 profile cards (one per kind) with current sponsoring state + paginated history.

**Response Body:**
```json
{
  "cards": [
    {
      "profileKind": "brandup",
      "profileExists": true,
      "profileStatus": "active",
      "isPublic": true,
      "current": {
        "id": "...",
        "status": "pending|confirmed|active",
        "bannerUrl": "https://...",
        "linkUrl": "https://...",
        "from": null,
        "to": null,
        "paidAt": null,
        "confirmedAt": null,
        "rejectionReason": null,
        "impressions": 0,
        "clicks": 0,
        "createdAt": "..."
      }
    }
  ],
  "history": [
    {
      "id": "...",
      "profileKind": "brandup",
      "status": "expired|rejected|cancelled",
      "bannerUrl": "https://...",
      "from": "...",
      "to": "...",
      "priceTTC": 119,
      "currency": "DT",
      "impressions": 1250,
      "clicks": 45,
      "createdAt": "..."
    }
  ]
}
```

**Maquette:** `dashboard_sponsoring.html`.

---

### `POST /me/sponsoring/request`
**Auth:** Required (OWNER). **Guard:** `requireMonetization()`.
Creates a sponsoring demand (status: `pending`). Requires admin validation before payment.

**Request Body:**
```json
{
  "profileKind": "brandup|traceup|linkup",
  "bannerUrl": "https://cdn.example.com/banner.jpg",
  "linkUrl": "https://www.example.com"
}
```

**Guards:** company active, profile active+isPublic, no existing pending/confirmed/active on same (companyId, profileKind).

**Response Body (`201`):**
```json
{
  "id": "...",
  "profileKind": "brandup",
  "status": "pending",
  "bannerUrl": "https://...",
  "linkUrl": "https://...",
  "createdAt": "..."
}
```

---

### `POST /me/sponsoring/[id]/cancel`
**Auth:** Required (OWNER). **Guard:** `requireMonetization()`.
Cancels a sponsoring from `pending` or `confirmed` status only. Active sponsorings cannot be cancelled in V1.

---

### `POST /me/sponsoring/checkout`
**Auth:** Required (OWNER). **Guard:** `requireMonetization()`.
Pays for a `confirmed` sponsoring (after admin validation). Creates Transaction atomically.

**Request Body:**
```json
{
  "sponsoringId": "ObjectId",
  "idempotencyKey": "unique-key"
}
```

**Response Body (`201`):** Same shape as boost checkout, with `sponsoring` instead of `boost`.

---

### `POST /admin/sponsorings/[id]/validate`
**Auth:** Required (SUPER_ADMIN). No `requireMonetization()`.
Validates a pending sponsoring → `confirmed`. Owner is notified (in-app + email).

---

### `POST /admin/sponsorings/[id]/reject`
**Auth:** Required (SUPER_ADMIN). No `requireMonetization()`.
Rejects a pending sponsoring → `rejected`. Reason is required.

**Request Body:**
```json
{
  "reason": "Bannière inappropriée"
}
```

---

### Track extension: `sponsor_click`
`POST /api/v1/public/track` now accepts:
```json
{
  "sponsoringId": "ObjectId",
  "event": "sponsor_click"
}
```
Returns 204 always. $inc `Sponsoring.clicks` + daily breakdown. Fail-silent.

---

## 6. RSE (Corporate Social Responsibility)

Companies that donate to partner associations receive an "Engagement Social **Attesté**" badge after admin validation of at least one receipt. **Donations are paid directly to the association — they never transit through MARKET-UP**, so they never appear in `/me/transactions`.

### `GET /me/rse`
**Auth:** Required (OWNER).

**Response Body:**
```json
{
  "badgeStatus": "validated",
  "validatedAt": "2025-12-06T09:00:00.000Z",
  "receipts": [
    {
      "id": "r-001",
      "associationId": "a-001",
      "associationName": "Association Al Ahed",
      "amount": 5200,
      "donationDate": "2026-04-18",
      "receiptDocumentUrl": "https://.../receipt.pdf",
      "status": "pending",
      "submittedAt": "2026-04-18T10:30:00.000Z",
      "validatedAt": null,
      "rejectedReason": null
    }
  ],
  "totalValidated": 7200,
  "totalPending": 5200
}
```

**Maquette:** `dashboard_rse.html`.

---

### `POST /me/rse/receipts`
**Auth:** Required (OWNER).
Submits a donation receipt for validation.

**Request Body (multipart/form-data):**
- `associationId`: string (required)
- `amount`: number (DT, required, > 0)
- `donationDate`: string (YYYY-MM-DD, required, not in the future)
- `receiptFile`: File (PDF/JPG/PNG, max 5 MB, required)

**Response Body (`201`):** The newly created receipt object (status `pending`).

---

### `GET /me/rse/associations`
**Auth:** Required (OWNER).
Returns the directory of MARKET-UP partner associations.

**Response Body:**
```json
[
  {
    "id": "a-001",
    "slug": "association-al-ahed",
    "name": "Association Al Ahed",
    "logoUrl": "https://...",
    "description": "...",
    "domain": "Aide aux orphelins"
  }
]
```

---

## 7. Billing & Transactions

Only Boost and Sponsoring transactions show here. RSE donations do **not** appear (see §6).

### `GET /me/transactions`
**Auth:** Required (OWNER).

**Query Parameters:**
- `type` (optional): `boost` | `sponsoring`
- `status` (optional): `paid` | `pending` | `failed` | `refunded`
- `from`, `to` (optional): date range
- `page`, `limit` (pagination)

**Response Body:**
```json
{
  "items": [
    {
      "id": "t-001",
      "type": "sponsoring",
      "refId": "s-001",
      "profileType": "linkup",
      "priceHT": 100,
      "vatRate": 0.19,
      "vatAmount": 19,
      "priceTTC": 119,
      "status": "paid",
      "paymentMethod": "card",
      "paymentReference": "MP-20260415-001",
      "invoiceUrl": "https://.../INV-2026-0042.pdf",
      "invoiceNumber": "INV-2026-0042",
      "createdAt": "2026-04-15T07:55:00.000Z",
      "paidAt":    "2026-04-15T07:56:00.000Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "summary": {
    "totalHT":  800,
    "totalVAT": 152,
    "totalTTC": 952,
    "currency": "DT"
  }
}
```

**Maquette:** `dashboard_billing.html`.

---

### `GET /me/transactions/:id/invoice`
**Auth:** Required (OWNER).

**Query Parameters:**
- `format` (optional, default `pdf`): `pdf` | `excel`

**Response:** Binary file download. Content-Type: `application/pdf` or `application/vnd.ms-excel`.

---

## 8. Notifications

### `GET /me/notifications`
**Auth:** Required (OWNER).

**Query Parameters:**
- `unreadOnly` (optional): `true` | `false`
- `page`, `limit`

**Response Body:**
```json
{
  "items": [
    {
      "id": "n-001",
      "kind": "boost_expiring",
      "icon": "trending_up",
      "color": "#0078D4",
      "title": "Votre boost LinkUP expire dans 3 jours",
      "body": "Renouvelez pour ne pas perdre votre visibilité.",
      "actionUrl": "/dashboard/boost",
      "actionLabel": "Renouveler",
      "read": false,
      "createdAt": "2026-05-09T08:00:00.000Z"
    }
  ],
  "total": 15,
  "unreadCount": 3,
  "page": 1, "limit": 20, "totalPages": 1
}
```

**Notification kinds:**
- `boost_expiring` (3 days before expiry)
- `boost_expired`
- `sponsoring_stats` (after a campaign generates impressions)
- `profile_approved`, `profile_rejected`, `profile_modifs_approved`, `profile_modifs_rejected`
- `rse_receipt_validated`, `rse_receipt_rejected`, `rse_badge_unlocked`
- `account_approved`, `account_rejected`
- `account_modifs_approved`, `account_modifs_rejected`

**Maquette:** `dashboard_notifications.html`, plus the bell dropdown in every dashboard page topbar.

---

### `PUT /me/notifications/:id/read`
**Auth:** Required (OWNER).
Marks a single notification as read.

**Response (`204`):** No content.

---

### `PUT /me/notifications/read-all`
**Auth:** Required (OWNER).

**Response Body:** `{ "markedAsRead": 12 }`

---

### `DELETE /me/notifications/:id`
**Auth:** Required (OWNER).

**Response (`204`):** No content.

---

## 9. Admin Endpoints (SUPER_ADMIN role)

All endpoints under `/admin/*` require `x-user-role: SUPER_ADMIN` (Option B) or a session with `role === "SUPER_ADMIN"` (Option A). Otherwise return `403`.

### `GET /admin/dashboard`
**Auth:** Required (SUPER_ADMIN).
Aggregate KPIs for the admin home page.

**Response Body:**
```json
{
  "kpis": {
    "companiesTotal": 20,
    "companiesActive": 11,
    "companiesPending": 8,
    "companiesSuspended": 1,
    "newCompaniesThisMonth": 3,
    "monthlyRevenueHT": 800,
    "monthlyRevenueTTC": 952,
    "vatCollected": 152,
    "revenueGrowthPct": 18,
    "rseValidatedAmount": 34200,
    "rseValidatedCompanies": 6,
    "rseValidatedAssociations": 4,
    "profilesPendingCount": 10
  },
  "queues": {
    "accounts":   { "newCount": 8,  "modifsCount": 2,  "oldestSubmittedAt": "..." },
    "profiles":   { "newCount": 10, "modifsCount": 3,  "oldestSubmittedAt": "..." },
    "rseReceipts":{ "pendingCount": 3, "oldestSubmittedAt": "..." }
  },
  "recentActivity": [
    {
      "ts": "...",
      "kind": "company_registered" | "profile_submitted" | "profile_rejected" | "rse_submitted",
      "icon": "...",
      "color": "...",
      "company": { "id": "...", "name": "..." },
      "title": "...",
      "meta": "..."
    }
  ],
  "alerts": [
    { "kind": "sla_exceeded", "count": 2, "actionUrl": "/admin/validation/comptes" }
  ]
}
```

**Maquette:** `admin_dashboard.html`.

---

### Account Validation

#### `GET /admin/companies`
**Auth:** Required (SUPER_ADMIN).

**Query Parameters:**
- `status` (optional): `pending` | `active` | `rejected` | `suspended`
- `withPendingUpdates` (optional, boolean): only companies that have modif requests
- `type` (optional): `B2B` | `B2C`
- `q` (optional): search by name, RNE, email
- `sort` (default `submittedAt`)
- `page`, `limit`

**Response Body:**
```json
{
  "items": [
    {
      "id": "c-001",
      "name": "TechnoFab Industries",
      "type": "B2B",
      "status": "pending",
      "registeredAt": "...",
      "owner": { "firstName": "Ahmed", "lastName": "Mrabet", "email": "..." },
      "sector": "Mécanique",
      "gouvernorat": "Sousse",
      "pendingUpdates": null,
      "slaHoursElapsed": 32
    }
  ],
  "total": 20,
  "page": 1, "limit": 20, "totalPages": 1
}
```

**Maquettes:** `admin_entreprises.html`, `admin_validation-comptes.html`.

---

#### `GET /admin/companies/:id`
**Auth:** Required (SUPER_ADMIN).
Full detail of one company including identityDocument URL, all profiles' content, full pendingUpdates object, audit trail.

**Maquette:** `admin_entreprise-detail.html`.

---

#### `POST /admin/companies/:id/approve`
**Auth:** Required (SUPER_ADMIN).
Approves a new account registration. Transitions company status `pending → active`.

**Request Body:** Empty (or `{ "note": "..." }` for internal audit log).

**Response Body (`200`):**
```json
{ "company": { "id": "...", "status": "active", "validatedAt": "...", "validatedBy": "u-001" } }
```

Side-effects:
- Creates an in-app notification `account_approved` for the owner.
- Triggers email "Compte activé".

---

#### `POST /admin/companies/:id/reject`
**Auth:** Required (SUPER_ADMIN).

**Request Body:**
```json
{
  "reasons": ["DOCUMENT_INVALID", "DUPLICATE_RNE"],
  "note": "RNE déjà utilisé pour une autre entreprise active."
}
```

**Predefined reasons:**
- `LEGAL_ID_INVALID`
- `DOCUMENT_INVALID`
- `DOCUMENT_MISSING`
- `DUPLICATE_RNE`
- `SECTOR_NOT_ALLOWED`
- `OTHER` (requires `note`)

**Response Body (`200`):** Updated company object with `status: "rejected"`, `rejectedAt`, `rejectedReason`.

---

#### `POST /admin/companies/:id/suspend`
**Auth:** Required (SUPER_ADMIN).
Suspends an active company. Cascade: all 3 profiles become invisible publicly (without changing their individual `status`).

**Request Body:**
```json
{ "reason": "PAYMENT_FRAUD", "note": "..." }
```

---

#### `POST /admin/companies/:id/reactivate`
**Auth:** Required (SUPER_ADMIN). Reverses a `suspend`.

---

#### `POST /admin/companies/:id/pending-updates/approve`
**Auth:** Required (SUPER_ADMIN).
Applies the staged `pendingUpdates` to the company (merges into `data` / `liveData`), clears `pendingUpdates`.

**Request Body:** Empty.

---

#### `POST /admin/companies/:id/pending-updates/reject`
**Auth:** Required (SUPER_ADMIN). Discards `pendingUpdates` with a reason.

**Request Body:**
```json
{ "reasons": ["LOGO_LOW_RES"], "note": "Le logo doit être au minimum 512×512 px." }
```

---

### Profile Validation

#### `GET /admin/profiles`
**Auth:** Required (SUPER_ADMIN).
Lists profiles awaiting review. **Includes both "new submissions" and "modifs on active profiles"**:
- new submission: `profile.status === "pending"`
- modifs: `profile.status === "active" && profile.pendingData !== null`

**Query Parameters:**
- `type` (optional): `brandup` | `traceup` | `linkup`
- `kind` (optional): `new` | `modif`
- `slaExceeded` (optional, boolean)
- `q`, `sort`, `page`, `limit`

**Response Body:**
```json
{
  "items": [
    {
      "profileId": "p-001",
      "profileType": "brandup",
      "kind": "modif",
      "company": { "id": "c-007", "name": "AutoPlus", "logoUrl": "..." },
      "submittedAt": "2026-04-21T11:00:00.000Z",
      "slaHoursElapsed": 18,
      "slaExceeded": false,
      "pendingFields": [
        { "key": "pitch", "label": "Pitch" },
        { "key": "services", "label": "Services" }
      ]
    }
  ],
  "total": 13, "page": 1, "limit": 20, "totalPages": 1
}
```

**Maquette:** `admin_validation-profils.html`.

---

#### `GET /admin/profiles/:id`
**Auth:** Required (SUPER_ADMIN).
Returns full content (`data`) and pending modifications (`pendingData`) for side-by-side review.

**Response Body:**
```json
{
  "profileId": "p-001",
  "profileType": "brandup",
  "company": { "id": "c-007", "name": "AutoPlus", ... },
  "status": "active",
  "data": { /* full current content */ },
  "pendingData": {
    "submittedAt": "...",
    "note": "...",
    "fields": [
      { "key": "pitch", "label": "Pitch", "currentValue": "...", "newValue": "..." }
    ]
  },
  "auditTrail": [
    { "at": "...", "by": "u-001", "action": "approved" }
  ]
}
```

**Maquettes:** `admin_brandup-detail.html`, `admin_traceup-detail.html`, `admin_linkup-detail.html`.

---

#### `POST /admin/profiles/:id/approve`
**Auth:** Required (SUPER_ADMIN).
Approves a **new submission** (status `pending → active`). Sets `publishedAt`, `lastValidatedAt`, `lastValidatedBy`.

**Request Body:** Empty.

**Response Body (`200`):** Updated profile object.

---

#### `POST /admin/profiles/:id/reject`
**Auth:** Required (SUPER_ADMIN).
Rejects a new submission. Status `pending → rejected`.

**Request Body:**
```json
{
  "reasons": ["PITCH_NON_COMPLIANT", "DOCUMENT_INVALID"],
  "note": "..."
}
```

**Predefined reasons:**
- `LOGO_LOW_RESOLUTION`
- `PITCH_NON_COMPLIANT`
- `CONTACT_INCOMPLETE`
- `DOCUMENT_INVALID`
- `SECTOR_NOT_ALLOWED`
- `OTHER` (requires `note`)

---

#### `POST /admin/profiles/:id/modifs/approve`
**Auth:** Required (SUPER_ADMIN).
Applies `pendingData` to `data`, clears `pendingData`, re-publishes the profile.

---

#### `POST /admin/profiles/:id/modifs/reject`
**Auth:** Required (SUPER_ADMIN).
Discards `pendingData` (the original `data` stays untouched and re-becomes visible publicly).

**Request Body:** Same shape as `/reject` above.

---

### RSE Receipts Validation

#### `GET /admin/rse/receipts`
**Auth:** Required (SUPER_ADMIN).

**Query Parameters:** `status`, `associationId`, `from`, `to`, `q`, `page`, `limit`.

**Response Body:**
```json
{
  "items": [
    {
      "id": "r-001",
      "company": { "id": "c-001", "name": "TechnoFab Industries" },
      "association": { "id": "a-001", "name": "Association Al Ahed" },
      "amount": 5200,
      "donationDate": "2026-04-18",
      "receiptDocumentUrl": "...",
      "status": "pending",
      "submittedAt": "...",
      "slaHoursElapsed": 22
    }
  ],
  "total": 3, "page": 1, "limit": 20, "totalPages": 1
}
```

**Maquette:** `admin_validation-rse.html`.

---

#### `POST /admin/rse/receipts/:id/approve`
**Auth:** Required (SUPER_ADMIN).
Validates the receipt. If it's the company's first validated receipt, the badge becomes `validated` and a notification is sent.

#### `POST /admin/rse/receipts/:id/reject`
**Auth:** Required (SUPER_ADMIN).

**Request Body:**
```json
{
  "reasons": ["RECEIPT_UNREADABLE", "AMOUNT_MISMATCH"],
  "note": "..."
}
```

---

### Admin Transactions Overview

#### `GET /admin/transactions`
**Auth:** Required (SUPER_ADMIN).
Cross-company view of all paid transactions.

**Query Parameters:** `type`, `status`, `from`, `to`, `companyId`, `q`, `page`, `limit`.

**Response Body:**
```json
{
  "items": [ /* same shape as /me/transactions items, plus "company": {id, name} */ ],
  "total": 142,
  "summary": {
    "totalHT": 7100,
    "totalVAT": 1349,
    "totalTTC": 8449,
    "boostCount": 95,
    "sponsoringCount": 47
  }
}
```

**Maquette:** `admin_transactions.html`.

---

#### `GET /admin/transactions/export`
**Auth:** Required (SUPER_ADMIN).

**Query Parameters:**
- `format` (required): `excel` | `pdf`
- `from`, `to` (optional date range)
- `type`, `status` (optional filters)

**Response:** Binary file. For Excel: tab-separated UTF-16LE (Excel-friendly). Columns: Référence, Date, Entreprise, Type, HT, TVA, TTC, Statut, Méthode paiement.

---

## 10. Global Resources

Static reference data. Cacheable for 24h. Public (no auth required for the read endpoints).

### `GET /resources/sectors-b2b`
**Response Body:**
```json
[
  {
    "id": "mecanique",
    "slug": "mecanique",
    "name": "Mécanique",
    "icon": "settings",
    "order": 1
  }
]
```

### `GET /resources/categories-b2c`
Same shape, B2C categories.

### `GET /resources/gouvernorats`
The 24 Tunisian governorates.

**Response Body:**
```json
[
  { "id": "tunis", "slug": "tunis", "name": "Tunis", "order": 1 }
]
```

### `GET /resources/associations`
Active RSE partner associations.

**Response Body:** Same as `GET /me/rse/associations`.

### `GET /resources/video-sources`
Supported TraceUP video sources and their URL patterns (helper for the client-side regex).

**Response Body:**
```json
[
  {
    "key": "youtube",
    "name": "YouTube",
    "iconColor": "#FF0000",
    "patterns": [
      "youtube\\.com/watch\\?v=([a-zA-Z0-9_-]{11})",
      "youtu\\.be/([a-zA-Z0-9_-]{11})",
      "youtube\\.com/shorts/([a-zA-Z0-9_-]{11})"
    ],
    "embedTemplate": "https://www.youtube.com/embed/{id}"
  },
  {
    "key": "dailymotion",
    "name": "Dailymotion",
    "iconColor": "#0066DC",
    "patterns": ["dailymotion\\.com/video/([a-zA-Z0-9]+)", "dai\\.ly/([a-zA-Z0-9]+)"],
    "embedTemplate": "https://www.dailymotion.com/embed/video/{id}"
  },
  {
    "key": "vimeo",
    "name": "Vimeo",
    "iconColor": "#1AB7EA",
    "patterns": ["vimeo\\.com/(\\d+)"],
    "embedTemplate": "https://player.vimeo.com/video/{id}"
  }
]
```

---

## 11. Files Upload

### `POST /uploads`
**Auth:** Required (OWNER or SUPER_ADMIN).

**Request Body (multipart/form-data):**
- `file`: File (required)
- `purpose`: string (required) — one of:
  - `company_logo`
  - `company_identity_document` (signup)
  - `brandup_gallery_image`
  - `brandup_project_image`
  - `brandup_certification_image`
  - `linkup_contact_photo`
  - `rse_receipt`

**Constraints by purpose:**

| Purpose | Allowed types | Max size | Min dimensions |
|---|---|---|---|
| `company_logo` | png, jpg, svg, webp | 2 MB | 512×512 |
| `company_identity_document` | pdf, png, jpg | 5 MB | — |
| `brandup_gallery_image` | png, jpg, webp | 3 MB | 800×600 |
| `brandup_project_image` | png, jpg, webp | 3 MB | 800×600 |
| `brandup_certification_image` | png, jpg, webp | 1 MB | 200×200 |
| `linkup_contact_photo` | png, jpg, webp | 2 MB | 400×400 |
| `rse_receipt` | pdf, png, jpg | 5 MB | — |

**Response Body (`201`):**
```json
{
  "id": "file-uuid",
  "url": "https://cdn.vivasky.media/uploads/abc.png",
  "mimeType": "image/png",
  "size": 123456,
  "uploadedAt": "..."
}
```

**Errors:**
- `400 { code: "FILE_TOO_LARGE" }`
- `400 { code: "INVALID_FILE_TYPE" }`
- `400 { code: "IMAGE_TOO_SMALL" }`

---

### `DELETE /uploads/:id`
**Auth:** Required (file owner only).

**Response (`204`):** No content.

---

## 12. Real-time Events

The frontend should subscribe to a per-company channel (and an admin-broadcast channel for SUPER_ADMIN).

**Channels:**
- `marketup:company:<companyId>` — owner-facing events
- `marketup:admin` — admin-facing events

**Recommended provider:** Pusher Channels or Ably (both work cleanly with Next.js Edge runtime).

### Owner events (channel `marketup:company:<companyId>`)

| Event name | Payload | UI trigger |
|---|---|---|
| `profile.approved` | `{ profileType, publishedAt }` | Toast + status pill refresh + notification badge increment |
| `profile.rejected` | `{ profileType, rejectionReason, rejectedAt }` | Toast + status pill refresh |
| `profile.modifs_approved` | `{ profileType, appliedAt }` | Toast + refetch profile |
| `profile.modifs_rejected` | `{ profileType, rejectionReason }` | Toast + refetch profile |
| `account.approved` | `{ validatedAt }` | Redirect to dashboard |
| `account.modifs_approved` | `{ appliedAt }` | Refetch /me |
| `boost.expiring` | `{ profileType, remainingDays, expiresAt }` | In-app notification |
| `boost.expired` | `{ profileType }` | Toast + refetch /me/boost |
| `sponsoring.stats` | `{ campaignId, impressions, clicks }` | Stats refresh |
| `rse.receipt_validated` | `{ receiptId, validatedAt }` | Refetch /me/rse |
| `rse.badge_unlocked` | `{ validatedAt }` | Celebration animation |
| `notification.new` | `{ notification }` | Bell badge increment + dropdown refresh |

### Admin events (channel `marketup:admin`)

| Event name | Payload | UI trigger |
|---|---|---|
| `admin.queue_changed` | `{ queue: "accounts"\|"profiles"\|"rse", delta: +1\|-1 }` | Sidebar pill update |
| `admin.sla_exceeded` | `{ kind, itemId }` | Alert card on dashboard |
| `admin.kpis_refresh` | `{ kpis }` | Dashboard KPIs refresh |

---

## Appendix A — Enums

All enums use lowercase plain strings (no `is`-prefix, no PascalCase).

```ts
// Company
type CompanyType   = "B2B" | "B2C";
type CompanyStatus = "pending" | "active" | "rejected" | "suspended" | "deleted";

// User
type UserRole = "OWNER" | "SUPER_ADMIN";

// Profile
type ProfileType   = "brandup" | "traceup" | "linkup";
type ProfileStatus = "incomplete" | "pending" | "active" | "rejected" | "disabled";

// TraceUP videos
type VideoSource   = "youtube" | "dailymotion" | "vimeo";
type VideoCategory = "actualite" | "offres" | "astuces" | "emplois";
type VideoStatus   = "pending" | "active" | "rejected";

// Monetization
type BoostStatus       = "active" | "expired";
type SponsoringStatus  = "active" | "completed" | "cancelled";

// Transactions
type TransactionType   = "boost" | "sponsoring";
type TransactionStatus = "pending" | "paid" | "refunded" | "failed";
type PaymentMethod     = "card" | "wire" | "other";

// RSE
type RseReceiptStatus = "pending" | "validated" | "rejected";
type RseBadgeStatus   = "none" | "validated";

// Notifications
type NotificationKind =
  | "boost_expiring" | "boost_expired"
  | "sponsoring_stats"
  | "profile_approved" | "profile_rejected"
  | "profile_modifs_approved" | "profile_modifs_rejected"
  | "rse_receipt_validated" | "rse_receipt_rejected" | "rse_badge_unlocked"
  | "account_approved" | "account_rejected"
  | "account_modifs_approved" | "account_modifs_rejected";
```

---

## Appendix B — SLA Conventions

| Workflow | SLA |
|---|---|
| New company validation | 48 hours from `registeredAt` |
| Company pendingUpdates | 48 hours from `pendingUpdates.submittedAt` |
| New profile submission | 48 hours from `profile.submittedAt` |
| Profile pendingData | 48 hours from `pendingData.submittedAt` |
| RSE receipt | 72 hours from `submittedAt` |

UI displays `SLA exceeded · {N}h` once `slaHoursElapsed > sla`. Admin queue UIs sort FIFO (oldest first).

---

## Appendix C — Maquette → Endpoint Traceability

The 33 HTML mockups are the source of truth for UI states and content shape. The table below maps each significant maquette to its primary endpoints.

### Auth + Onboarding
| Maquette | Endpoints |
|---|---|
| `onboarding_onboarding.html` | none (static product picker) |
| `auth_inscription-entreprise.html` | `POST /auth/signup/company`, `GET /resources/sectors-b2b`, `/categories-b2c`, `/gouvernorats` |
| `auth_inscription-utilisateur.html` | `POST /auth/signup/user` |
| `auth_inscription-otp.html` | `POST /auth/signup/verify-otp`, `POST /auth/signup/resend-otp` |
| `auth_validation-email.html` | `POST /auth/email/resend-validation` |
| `auth_validation-success.html` | none |
| `auth_connexion.html` | `POST /auth/login` |
| `auth_mot-de-passe-oublie.html` | `POST /auth/password/forgot` |
| `auth_modifier-mot-de-passe.html` | `POST /auth/password/reset` |

### Dashboard (Owner)
| Maquette | Endpoints |
|---|---|
| `dashboard_index.html` | `GET /me`, `GET /me/notifications?unreadOnly=true&limit=3` |
| `dashboard_account.html` | `GET /me`, `PUT /me/account/live`, `POST /me/account/request-changes`, `POST /uploads` |
| `dashboard_settings.html` | `PUT /me/security/password`, `DELETE /me/account` |
| `dashboard_brandup.html` | `GET /me/profiles/brandup`, `PUT /me/profiles/brandup`, `POST /me/profiles/brandup/submit`, `DELETE /me/profiles/brandup/pending-data` |
| `dashboard_traceup.html` | `GET /me/profiles/traceup`, `POST /me/profiles/traceup/videos`, `PUT /me/profiles/traceup/videos/:id`, `DELETE /me/profiles/traceup/videos/:id` |
| `dashboard_linkup.html` | `GET /me/profiles/linkup`, `PUT /me/profiles/linkup` |
| `dashboard_boost.html` | `GET /me/boost`, `POST /me/boost/checkout` |
| `dashboard_sponsoring.html` | `GET /me/sponsoring`, `POST /me/sponsoring/checkout`, `GET /me/sponsoring/:id/stats` |
| `dashboard_rse.html` | `GET /me/rse`, `POST /me/rse/receipts`, `GET /me/rse/associations`, `POST /uploads` |
| `dashboard_billing.html` | `GET /me/transactions`, `GET /me/transactions/:id/invoice` |
| `dashboard_notifications.html` | `GET /me/notifications`, `PUT /me/notifications/:id/read`, `PUT /me/notifications/read-all`, `DELETE /me/notifications/:id` |

### Public Search & Profiles
| Maquette | Endpoints |
|---|---|
| `public_brandup.html` | `GET /search/brandup`, `GET /resources/sectors-b2b`, `/categories-b2c`, `/gouvernorats` |
| `public_traceup.html` | `GET /search/traceup`, `GET /resources/video-sources` |
| `public_linkup.html` | `GET /search/linkup` |
| `public_brandup_<slug>.html` | `GET /public/brandup/:slug`, `POST /public/profiles/brandup/:slug/track` |
| `public_traceup_<slug>.html` | `GET /public/traceup/:slug`, `POST /public/profiles/traceup/:slug/track` |
| `public_linkup_<slug>.html` | `GET /public/linkup/:slug`, `POST /public/profiles/linkup/:slug/track` |
| `public_<type>_popup_<slug>.html` | `GET /search/popup/:type/:slug` |

### Admin
| Maquette | Endpoints |
|---|---|
| `admin_dashboard.html` | `GET /admin/dashboard` |
| `admin_entreprises.html` | `GET /admin/companies` |
| `admin_entreprise-detail.html` | `GET /admin/companies/:id`, `POST /admin/companies/:id/approve`, `/reject`, `/suspend`, `/reactivate`, `/pending-updates/approve`, `/pending-updates/reject` |
| `admin_validation-comptes.html` | `GET /admin/companies?status=pending`, `GET /admin/companies?withPendingUpdates=true` |
| `admin_validation-profils.html` | `GET /admin/profiles?kind=new`, `GET /admin/profiles?kind=modif` |
| `admin_brandup-detail.html` | `GET /admin/profiles/:id`, `POST /admin/profiles/:id/approve`, `/reject`, `/modifs/approve`, `/modifs/reject` |
| `admin_traceup-detail.html` | idem |
| `admin_linkup-detail.html` | idem |
| `admin_validation-rse.html` | `GET /admin/rse/receipts?status=pending`, `POST /admin/rse/receipts/:id/approve`, `/reject` |
| `admin_transactions.html` | `GET /admin/transactions`, `GET /admin/transactions/export` |

---

## Appendix D — Implementation Notes

### D.1 — i18n response normalization
The seed stores text content as `{ fr, ar, en }` objects. The API **must normalize** these to a single string in the response:
- Default: return the FR string (`obj.fr`).
- If the client sends `?lang=ar` or `?lang=en` and that locale is non-empty, return that one.
- If the requested locale is empty, fall back to FR.

Apply this to: `displayName`, `pitch`, `about`, `services[].name`, `links[].label`, `channelName`, `channelDescription`, video `title`/`description`, `contactCard.title`, `contactCard.company`, `contactCard.bio`, sector `name`, gouvernorat `name`, association `name`, rejection reasons, notification `title`/`body`.

### D.2 — Pricing calculation
**Never store TTC** in the database. Always store `priceHT` and `vatRate` (currently `0.19`). Compute TTC at read-time:
```
vatAmount = round(priceHT * vatRate, 2)
priceTTC  = priceHT + vatAmount
```
This way, if VAT changes, historical transactions are correctly snapshotted via `vatRate`.

### D.3 — Profile visibility computation
**Never store** `profile.visible` as a column. Compute at read-time:
```ts
function isVisible(profile, company) {
  return company.status === "active"
      && profile.status === "active"
      && profile.isPublic === true
      && profile.pendingData == null;
}
```
This makes suspension/reactivation reversible without dirty writes.

### D.4 — TraceUP video thumbnail caching
On `POST /me/profiles/traceup/videos`:
- **YouTube**: build thumbnail URL directly: `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`. No API call needed.
- **Dailymotion**: call `GET https://www.dailymotion.com/services/oembed?url={URL}` server-side.
- **Vimeo**: call `GET https://vimeo.com/api/oembed.json?url={URL}` server-side.

Cache the resolved `thumbnailUrl` in the DB. Do **not** refetch on every page load.

### D.5 — Invoice generation
Invoices are generated on-demand (lazy). When `GET /me/transactions/:id/invoice` is first called for a transaction:
1. Render a PDF (suggested: `@react-pdf/renderer` or `puppeteer`) with company info + transaction details.
2. Upload to storage, save the URL on the transaction row.
3. Subsequent calls return the cached URL.

Invoice numbering format: `INV-{YYYY}-{seq04}` where `seq` is a per-year monotonic counter.

### D.6 — Account vs Profile lifecycle
The two lifecycles are **independent** but cascade:
- A `suspended` company hides all its profiles (compute visibility, do not mutate `profile.status`).
- A `pending` profile hides itself only.
- An `incomplete` company status doesn't exist (companies go straight from signup to `pending`).

### D.7 — Idempotency on payment endpoints
`POST /me/boost/checkout` and `POST /me/sponsoring/checkout` should accept an optional `Idempotency-Key` header. If a request with the same key arrives within 24h, return the original response instead of charging twice.

### D.8 — Soft deletion
All DELETE endpoints are soft-deletes (set `deletedAt` and exclude from default queries). Hard deletion requires a separate admin action.

---

## Appendix E — Open Questions for the Backend Team

1. **Payment processor**: confirm the gateway (Konnect / Paymee / Flouci / custom) and adjust the `POST /*/checkout` flow accordingly (3DS redirect URL, webhook for async confirmations).
2. **Email service**: SendGrid / Mailgun / SES — affects OTP delivery latency targets.
3. **Image CDN**: do we resize on upload (e.g. Cloudflare Images / AWS Lambda) or store originals only?
4. **Geo-search**: LinkUP cards have GPS coordinates — do we plan a `?near=lat,lng&radius=km` filter in V1.1?
5. **Audit log retention**: how long do we keep `auditTrail` entries on admin actions (compliance vs storage cost)?
6. **Rate limiting**: per-IP for public search endpoints, per-user for owner endpoints. Suggested limits?
7. **Webhooks for external sponsoring**: if a 3rd party (e.g. ad network) needs to be notified when a campaign goes live, should we expose `POST /webhooks/subscribe`?

---

*Document version: 1.0 — May 12, 2026*
*Generated from the canonical mockups + `marketup_seed_data.js` + `SEED_ARCHITECTURE.md` + project transfer files.*
*Owner: AGGREGAX SUARL — Ahmed Mrabet.*
