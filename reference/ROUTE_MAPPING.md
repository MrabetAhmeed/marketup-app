# Mockup filenames → Next.js routes (reference)

> Extracted from CLAUDE.md §2-bis for context reduction. All routes are implemented.

**The HTML filenames in `reference/mockups/` are documentation references, NOT routes to be recreated literally in the Next.js codebase.**

Several mockup files include a company slug in their filename (e.g. `public_brandup_technofab-industries.html`) — these are **rendered examples** showing what the page produces for that specific company. The Next.js implementation uses **dynamic routes** (`[slug]`) and renders the same template for any company at runtime.

## Filename → Next.js route mapping

| Mockup file | Purpose | Next.js route |
|---|---|---|
| `onboarding_onboarding.html` | Product picker | `app/(public)/onboarding/page.tsx` |
| `auth_inscription-entreprise.html` | Signup step 1 | `app/(auth)/signup/company/page.tsx` |
| `auth_inscription-utilisateur.html` | Signup step 2 | `app/(auth)/signup/user/page.tsx` |
| `auth_inscription-otp.html` | Signup step 3 | `app/(auth)/signup/verify/page.tsx` |
| `auth_validation-email.html` | Resend OTP | `app/(auth)/validation-email/page.tsx` |
| `auth_validation-success.html` | Post-OTP success | `app/(auth)/signup/success/page.tsx` |
| `auth_connexion.html` | Login | `app/(auth)/login/page.tsx` |
| `auth_mot-de-passe-oublie.html` | Forgot password | `app/(auth)/forgot/page.tsx` |
| `auth_modifier-mot-de-passe.html` | Reset password | `app/(auth)/reset/page.tsx` |
| `public_brandup.html` | **BrandUP search engine** | `app/(public)/brandup/page.tsx` |
| `public_traceup.html` | **TraceUP search engine** | `app/(public)/traceup/page.tsx` |
| `public_linkup.html` | **LinkUP search engine** | `app/(public)/linkup/page.tsx` |
| `public_brandup_technofab-industries.html` | Example of a BrandUP **profile page** (any company) | `app/(public)/brandup/[slug]/page.tsx` |
| `public_brandup_popup_technofab-industries.html` | Example of a BrandUP **popup quick-preview** (any company) | `<BrandUpPopup>` component used by `/brandup` search results |
| `public_traceup_technofab-industries.html` | Example of a TraceUP profile page | `app/(public)/traceup/[slug]/page.tsx` |
| `public_traceup_popup_technofab-industries.html` | Example of a TraceUP popup | `<TraceUpPopup>` component |
| `public_linkup_technofab-industries.html` | Example of a LinkUP card | `app/(public)/linkup/[slug]/page.tsx` |
| `public_linkup_popup_technofab-industries.html` | Example of a LinkUP popup | `<LinkUpPopup>` component |
| `dashboard_index.html` | Owner overview | `app/(dashboard)/dashboard/page.tsx` |
| `dashboard_account.html` | Owner account | `app/(dashboard)/dashboard/account/page.tsx` |
| `dashboard_settings.html` | Owner settings | `app/(dashboard)/dashboard/settings/page.tsx` |
| `dashboard_brandup.html` | Owner BrandUP editor | `app/(dashboard)/dashboard/brandup/page.tsx` |
| `dashboard_traceup.html` | Owner TraceUP editor | `app/(dashboard)/dashboard/traceup/page.tsx` |
| `dashboard_linkup.html` | Owner LinkUP editor | `app/(dashboard)/dashboard/linkup/page.tsx` |
| `dashboard_boost.html` | Owner boost overview | `app/(dashboard)/dashboard/boost/page.tsx` |
| `dashboard_sponsoring.html` | Owner sponsoring | `app/(dashboard)/dashboard/sponsoring/page.tsx` |
| `dashboard_rse.html` | Owner RSE | `app/(dashboard)/dashboard/rse/page.tsx` |
| `dashboard_billing.html` | Owner billing | `app/(dashboard)/dashboard/billing/page.tsx` |
| `dashboard_notifications.html` | Owner notifications | `app/(dashboard)/dashboard/notifications/page.tsx` |
| `admin_dashboard.html` | Admin overview | `app/(admin)/admin/page.tsx` |
| `admin_entreprises.html` | Admin company directory | `app/(admin)/admin/companies/page.tsx` |
| `admin_entreprise-detail.html` | Admin single-company view | `app/(admin)/admin/companies/[id]/page.tsx` |
| `admin_validation-comptes.html` | Account validation queue | `app/(admin)/admin/validation/accounts/page.tsx` |
| `admin_validation-profils.html` | Profile validation queue | `app/(admin)/admin/validation/profiles/page.tsx` |
| `admin_validation-rse.html` | RSE validation queue | `app/(admin)/admin/validation/rse/page.tsx` |
| `admin_brandup-detail.html` | Single BrandUP review | `app/(admin)/admin/profiles/[id]/page.tsx` (kind=brandup) |
| `admin_traceup-detail.html` | Single TraceUP review | `app/(admin)/admin/profiles/[id]/page.tsx` (kind=traceup) |
| `admin_linkup-detail.html` | Single LinkUP review | `app/(admin)/admin/profiles/[id]/page.tsx` (kind=linkup) |
| `admin_transactions.html` | All transactions | `app/(admin)/admin/transactions/page.tsx` |

## Three rules that follow from this mapping

1. **Never create a file named after a company slug** in the Next.js code. There is no `app/(public)/brandup/technofab-industries/page.tsx`. The route is `app/(public)/brandup/[slug]/page.tsx`, and `technofab-industries` is one of many possible slug values (resolved from the seed at runtime).
2. **The 6 TechnoFab mockup files** (`public_<type>(_popup)?_technofab-industries.html`) demonstrate **only one** narrative — they exist so you can see "what BrandUP looks like when status=rejected", "what TraceUP looks like when status=pending", "what LinkUP looks like when active+boosted". Reproduce the **template logic** (how to render any status), not the **specific content** (the TechnoFab pitch text).
3. **For the three admin profile-detail pages** (`admin_brandup-detail.html`, `admin_traceup-detail.html`, `admin_linkup-detail.html`), the Next.js implementation has **one** dynamic route (`admin/profiles/[id]/page.tsx`) that branches on `profile.kind` and renders the appropriate template — not three separate routes.

## Data sources for slug-based routes

When implementing `app/(public)/brandup/[slug]/page.tsx`:
- The slug comes from `params.slug` (e.g. `technofab-industries`).
- The service `getPublicProfileBySlug(slug, "brandup")` does `Company.findOne({ slug })` → `Profile.findOne({ companyId, kind: "brandup" })`.
- If `!isProfileVisible(profile, company)` → return `notFound()` (Next.js 404).
- Otherwise render the same template that the TechnoFab mockup demonstrates, with the dynamic data.
