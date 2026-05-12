---
name: marketup-api-routes
description: Patterns for implementing API routes under src/app/api/v1/ in the MARKET-UP Next.js project. Covers route handler structure, Zod validation, auth guards, error mapping, pagination, idempotency, file uploads, and standard response shapes. Use when creating or modifying any file under src/app/api/v1/ — required reading before writing a new route. Also covers service-layer conventions in src/services/.
---

# MARKET-UP — API Routes Skill

This skill is the operational guide for every file under `src/app/api/v1/`. The contract for what each endpoint must do lives in `reference/API_REFERENCE_MARKETUP.md` — this file is **how** to implement them.

## 1. Layered architecture

```
Request ──► Route handler (app/api/v1/.../route.ts)
              │
              ├─ requireOwner() / requireAdmin()       (auth guard)
              ├─ Schema.parse(body)                    (Zod validation)
              ├─ service.doSomething(input)            (business logic)
              │     │
              │     ├─ Model.findOne(...)              (DB read)
              │     ├─ Model.create(...)               (DB write)
              │     └─ throw new BusinessRuleError()   (rule violation)
              │
              └─ jsonOk(result)
```

Three rules:

1. **Route handlers are thin.** No business logic. Just guard → validate → call service → respond.
2. **Services own business rules.** They throw typed errors. They never touch `Request` or `Response`.
3. **Models are dumb.** No instance methods that hide writes. Use Mongoose schemas as plain data definitions.

## 2. Route handler skeleton (copy-paste)

```ts
// src/app/api/v1/me/profiles/[type]/route.ts
import type { NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { ProfileEditSchema } from "@/schemas/profile.schema";
import { ProfileTypeSchema } from "@/schemas/profile.schema";
import { getMyProfile, updateMyProfile } from "@/services/profile.service";

interface RouteParams {
  params: { type: string };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireOwner();
    const type = ProfileTypeSchema.parse(params.type);   // narrows to "brandup" | "traceup" | "linkup"
    const profile = await getMyProfile(session.user.companyId, type);
    return jsonOk(profile);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireOwner();
    const type = ProfileTypeSchema.parse(params.type);
    const body = await req.json();
    const data = ProfileEditSchema(type).parse(body);   // type-specific Zod schema
    const updated = await updateMyProfile(session.user.companyId, type, data, session.user.id);
    return jsonOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
```

## 3. Auth guards (`src/lib/auth-guards.ts`)

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { AuthError } from "./api-error";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new AuthError("NOT_AUTHENTICATED", "Not signed in", 401);
  return session;
}

export async function requireOwner() {
  const session = await requireSession();
  if (session.user.role !== "OWNER") {
    throw new AuthError("FORBIDDEN", "Owner role required", 403);
  }
  if (!session.user.companyId) {
    throw new AuthError("NO_COMPANY", "No company associated", 403);
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "SUPER_ADMIN") {
    throw new AuthError("FORBIDDEN", "Admin role required", 403);
  }
  return session;
}
```

Public endpoints (`/search/*`, `/public/*`, `/resources/*`) do not call any guard.

## 4. Error handling (`src/lib/api-error.ts` and `src/lib/api-response.ts`)

```ts
// src/lib/api-error.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super("VALIDATION_FAILED", "Invalid request body", 400, { fields });
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}
export class AuthError extends AppError {
  // status passed by caller (401 or 403)
}
export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 422, details);
  }
}
export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 409, details);
  }
}
```

```ts
// src/lib/api-response.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./api-error";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const fields = err.flatten().fieldErrors;
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Invalid request body", fields } },
      { status: 400 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } },
      { status: err.status },
    );
  }
  console.error("[api] unexpected error", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Server error" } },
    { status: 500 },
  );
}
```

## 5. Zod schemas

Located in `src/schemas/`, one file per entity. **Shared between client (RHF resolver) and server (route handler).**

```ts
// src/schemas/profile.schema.ts
import { z } from "zod";

export const ProfileTypeSchema = z.enum(["brandup", "traceup", "linkup"]);
export type ProfileType = z.infer<typeof ProfileTypeSchema>;

export const BrandUpEditSchema = z.object({
  pitch: z.string().min(1, "Le pitch est obligatoire").max(280),
  about: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).default("#0078D4"),
  services: z.array(z.object({ name: z.string().min(1) })).max(20),
  links: z.array(z.object({
    label: z.string().min(1),
    url: z.string().url(),
    icon: z.string().optional(),
  })).max(10),
  note: z.string().max(500).optional(),
});

export const TraceUpEditSchema = z.object({
  channelName: z.string().min(1).max(60),
  channelDescription: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export const LinkUpEditSchema = z.object({
  contactCard: z.object({
    fullName: z.string().min(1).max(80),
    title: z.string().min(1).max(80),
    bio: z.string().max(500).optional(),
    email: z.string().email(),
    phone: z.string().regex(/^\+\d[\d\s\-]{6,}$/),
    whatsapp: z.string().regex(/^\+\d[\d\s\-]{6,}$/).optional(),
    website: z.string().url().optional().or(z.literal("")),
    address: z.string().max(300).optional(),
  }),
  socials: z.array(z.object({
    platform: z.enum(["linkedin", "facebook", "instagram", "twitter", "youtube", "tiktok"]),
    url: z.string().url(),
  })).max(8).optional(),
  note: z.string().max(500).optional(),
});

export function ProfileEditSchema(type: ProfileType) {
  if (type === "brandup") return BrandUpEditSchema;
  if (type === "traceup") return TraceUpEditSchema;
  return LinkUpEditSchema;
}
```

## 6. Service-layer pattern

```ts
// src/services/profile.service.ts
import { connectDb } from "@/lib/db";
import { Company, Profile } from "@/models";
import { NotFoundError, BusinessRuleError } from "@/lib/api-error";
import { computeProfileVisibility } from "@/lib/visibility";
import { buildPendingDataDiff } from "@/lib/pending-data";
import type { ProfileType } from "@/schemas/profile.schema";

export async function getMyProfile(companyId: string, type: ProfileType) {
  await connectDb();
  const profile = await Profile.findOne({ companyId, kind: type });
  if (!profile) throw new NotFoundError("Profile");
  const company = await Company.findById(companyId).select("status");
  if (!company) throw new NotFoundError("Company");

  return serializeProfile(profile, company);
}

export async function updateMyProfile(
  companyId: string,
  type: ProfileType,
  input: Record<string, unknown>,
  byUserId: string,
) {
  await connectDb();
  const profile = await Profile.findOne({ companyId, kind: type });
  if (!profile) throw new NotFoundError("Profile");

  if (profile.status === "pending") {
    throw new BusinessRuleError(
      "PROFILE_UNDER_REVIEW",
      "Le profil est en cours de validation. Aucune modification n'est possible.",
    );
  }

  // 3-tier validation pattern: incomplete writes to .data; active/rejected writes to .pendingData
  if (profile.status === "incomplete" || profile.status === "disabled") {
    Object.assign(profile.data, input);
  } else {
    profile.pendingData = buildPendingDataDiff(profile.data, input, byUserId);
  }

  profile.auditTrail.push({
    at: new Date(),
    by: byUserId,
    byRole: "OWNER",
    action: profile.status === "incomplete" ? "data_filled" : "modifs_submitted",
  });

  await profile.save();

  const company = await Company.findById(companyId).select("status");
  return serializeProfile(profile, company!);
}

function serializeProfile(profile: any, company: any) {
  return {
    type: profile.kind,
    status: profile.status,
    submittedAt: profile.submittedAt ?? null,
    publishedAt: profile.publishedAt ?? null,
    lastValidatedAt: profile.lastValidatedAt ?? null,
    rejectionReason: profile.rejectionReason ?? null,
    rejectedAt: profile.rejectedAt ?? null,
    isPublic: profile.isPublic,
    visible: computeProfileVisibility(profile, company),
    data: profile.data,                            // TODO: pickLocale per field
    pendingData: profile.pendingData,
    stats: profile.stats,
  };
}
```

**Key principles:**
- Throw — don't return error tuples.
- The route handler doesn't know about Mongoose. The service does.
- One service function per use case. Reuse internal helpers, not by chaining services.

## 7. Standard response shapes

### Single resource
```json
{ /* the resource */ }
```

### Paginated list (used by every `GET /list`)
```ts
// src/lib/pagination.ts
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function paginate<T>(
  model: any,
  query: object,
  { page = 1, limit = 20, sort = "-createdAt" }: { page?: number; limit?: number; sort?: string } = {},
): Promise<PaginatedResult<T>> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;
  const [items, total] = await Promise.all([
    model.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
    model.countDocuments(query),
  ]);
  return {
    items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(Math.ceil(total / safeLimit), 1),
  };
}
```

### Empty body
- `DELETE`: return `204 No Content`.
- Side-effect mutations that have no useful payload: also `204`.

## 8. Query param parsing helpers

```ts
// src/lib/query-params.ts
import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  q: z.string().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export function parseSearchParams<T extends z.ZodTypeAny>(req: { url: string }, schema: T): z.infer<T> {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { obj[k] = v; });
  return schema.parse(obj);
}
```

## 9. Idempotency on payment endpoints

```ts
// src/lib/idempotency.ts
import crypto from "node:crypto";
import { IdempotencyKey } from "@/models";   // simple { key, scopeId, response, expiresAt } collection

export async function withIdempotency<T>(
  scopeId: string,        // userId or companyId
  key: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (!key) return fn();
  const cached = await IdempotencyKey.findOne({ key, scopeId, expiresAt: { $gt: new Date() } });
  if (cached) return cached.response as T;

  const result = await fn();
  await IdempotencyKey.create({
    key,
    scopeId,
    response: result,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  });
  return result;
}
```

Use in checkout route:
```ts
const idemKey = req.headers.get("idempotency-key");
const result = await withIdempotency(session.user.companyId, idemKey, () =>
  createBoost(session.user.companyId, body.profileType, body.paymentMethod)
);
```

## 10. File upload pattern

```ts
// src/app/api/v1/uploads/route.ts
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth-guards";
import { jsonOk, handleApiError } from "@/lib/api-response";
import { uploadFile, type UploadPurpose } from "@/services/upload.service";
import { ValidationError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const form = await req.formData();
    const file = form.get("file");
    const purpose = form.get("purpose") as UploadPurpose | null;

    if (!(file instanceof File)) throw new ValidationError({ file: "File missing" });
    if (!purpose) throw new ValidationError({ purpose: "Purpose required" });

    const saved = await uploadFile({ file, purpose, ownerUserId: session.user.id });
    return jsonOk(saved, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
```

The service applies the constraints from `API_REFERENCE_MARKETUP §11`:

```ts
const CONSTRAINTS: Record<UploadPurpose, { maxBytes: number; mimes: string[]; minDims?: [number, number] }> = {
  company_logo: { maxBytes: 2 * 1024 * 1024, mimes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"], minDims: [512, 512] },
  company_identity_document: { maxBytes: 5 * 1024 * 1024, mimes: ["application/pdf", "image/png", "image/jpeg"] },
  brandup_gallery_image: { maxBytes: 3 * 1024 * 1024, mimes: ["image/png", "image/jpeg", "image/webp"], minDims: [800, 600] },
  // ... rest from the spec
};
```

## 11. Real-time event emission

Services that mutate state emit a Pusher event after successful save:

```ts
// src/services/profile.service.ts
import { pusher } from "@/lib/pusher";

export async function approveProfileSubmission(profileId: string, adminId: string) {
  // ... DB updates ...
  await pusher.trigger(`marketup:company:${companyId}`, "profile.approved", {
    profileType: profile.kind,
    publishedAt: profile.publishedAt,
  });
  await pusher.trigger("marketup:admin", "admin.queue_changed", { queue: "profiles", delta: -1 });
}
```

## 12. Public endpoints — caching

`/api/v1/search/*`, `/api/v1/public/*`, `/api/v1/resources/*` set caching headers:

```ts
return new NextResponse(JSON.stringify(payload), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
});
```

`/resources/*` (sectors, gouvernorats) can be cached 24h:
```ts
"Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
```

## 13. Webhooks (payment gateway)

Located at `src/app/api/v1/webhooks/payment/route.ts`. Three rules:
1. Verify the signature **first** before any processing (gateway-specific HMAC).
2. Acknowledge fast: respond `200 { received: true }` within ~3 seconds. Heavy work goes to a queue/cron.
3. Idempotent: same event ID arriving twice must not double-process.

```ts
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-payment-signature");
  const body = await req.text();
  if (!verifyPaymentSignature(body, signature)) {
    return jsonError("INVALID_SIGNATURE", "Bad signature", 401);
  }
  const event = JSON.parse(body);
  await handlePaymentEvent(event);   // service is idempotent on event.id
  return jsonOk({ received: true });
}
```

## 14. Testing strategy

- **Service layer:** unit tests with Vitest + in-memory MongoDB (`mongodb-memory-server`). Each business rule has at least one test.
- **Route handlers:** integration tests that hit `app/api/v1/...` with `next/test-utils`. Cover the happy path + 401/403/400/404 for each route.
- **E2E:** Playwright. Cover the 3 critical flows: signup → login → approve, profile edit → admin reject, boost checkout → invoice.

## 15. Common pitfalls (avoid)

| Mistake | Fix |
|---|---|
| Trusting `body.userId` | Always read from `session.user.id`. |
| Returning Mongoose docs directly | Always `serialize()` to strip Mongo internals (`_id` → `id`, drop `__v`, etc.). |
| Using `find()` without `.lean()` on read-only queries | Use `.lean()` everywhere except when you need to call `.save()`. |
| Hard-coding error messages in services | Use error codes (machine) + i18n-ready messages (human). |
| Catching errors in services | Let them bubble. Catch only at route handler boundary. |
| `await Profile.findById(id).save()` without `await` on save | `.save()` is async — never fire-and-forget. |
| `Promise.all` over arrays of writes inside transactions | Use Mongoose sessions/transactions explicitly. |
| Forgetting `await connectDb()` at top of service | First line of every service function. |
