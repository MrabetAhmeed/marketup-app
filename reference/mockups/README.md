# MARKET-UP — Mockups Reference

This folder contains **39 HTML mockups** that are the **source of truth** for every UX state, layout, copy, and data shape in the MARKET-UP project.

These files are **read-only**. Do not modify them.
If you find a discrepancy with the API spec, fix the spec — not the mockup.

---

## ⚠️ Critical: mockup filenames ≠ Next.js routes

**Several mockup files include a company slug in their filename** (e.g. `public_brandup_technofab-industries.html`). These are **rendered examples** showing what a page produces for the TechnoFab demo company.

**They are NOT files to recreate literally in the Next.js codebase.**

The Next.js implementation uses **dynamic routes** with `[slug]` segments. One template renders any company at runtime by fetching data from the database.

| Mockup file (example) | What it demonstrates | Next.js route |
|---|---|---|
| `public_brandup_technofab-industries.html` | A BrandUP profile page rendered for one company | `app/(public)/brandup/[slug]/page.tsx` |
| `public_brandup_popup_technofab-industries.html` | The search-result quick-preview popup | `<BrandUpPopup>` component, used inside `/brandup` search results |
| `public_traceup_technofab-industries.html` | A TraceUP channel page | `app/(public)/traceup/[slug]/page.tsx` |
| `public_traceup_popup_technofab-industries.html` | TraceUP quick-preview popup | `<TraceUpPopup>` component |
| `public_linkup_technofab-industries.html` | A LinkUP digital card page | `app/(public)/linkup/[slug]/page.tsx` |
| `public_linkup_popup_technofab-industries.html` | LinkUP quick-preview popup | `<LinkUpPopup>` component |

So: do **not** create `app/(public)/brandup/technofab-industries/page.tsx`. The slug `technofab-industries` is one value among many, resolved at request time from `params.slug`.

For the full mapping table (all 39 mockups → all Next.js routes), see `CLAUDE.md §2-bis` at the project root.

---

## Structure

| Group | Count | Purpose |
|---|---|---|
| Auth + Onboarding | 9 | Signup 3 steps, OTP, login, password reset, email validation, success |
| Public search engines | 3 | BrandUP, TraceUP, LinkUP — the three search interfaces |
| TechnoFab demo canon | 6 | The one company that appears across all narratives (profiles + popups) |
| Dashboard (owner) | 11 | All pages the logged-in business owner sees |
| Admin (super admin) | 10 | All pages the platform admin (Bassem) sees |
| **TOTAL** | **39** | |

---

## The 39 files

### Auth + Onboarding (9)
```
onboarding_onboarding.html                      Product picker (B2B vs B2C)
auth_inscription-entreprise.html                Signup step 1/3 — company info
auth_inscription-utilisateur.html               Signup step 2/3 — user info
auth_inscription-otp.html                       Signup step 3/3 — OTP verification
auth_validation-email.html                      Resend validation email
auth_validation-success.html                    Post-OTP success + timeline
auth_connexion.html                             Login
auth_mot-de-passe-oublie.html                   Password forgot
auth_modifier-mot-de-passe.html                 Password reset with strength indicator
```

### Public search engines (3)
```
public_brandup.html                             BrandUP search engine
public_traceup.html                             TraceUP search engine
public_linkup.html                              LinkUP search engine
```

### TechnoFab demo canon (6)
The one demo entity that appears across all narratives. Mandatory states:
- **BrandUP: rejected** (with a rejection reason in French)
- **TraceUP: pending** (first submission awaiting admin review)
- **LinkUP: active + boosted + active sponsoring**

```
public_brandup_technofab-industries.html        Full BrandUP profile page
public_brandup_popup_technofab-industries.html  Search popup quick-preview
public_traceup_technofab-industries.html        Full TraceUP profile (channel + videos)
public_traceup_popup_technofab-industries.html  Search popup quick-preview
public_linkup_technofab-industries.html         Full LinkUP card (contact + QR)
public_linkup_popup_technofab-industries.html   Search popup quick-preview
```

> Other companies (AutoPlus, MediaCom, GreenLife, ArchStudio, EduPro, FoodCorner, BuildTech, TextilTunis) exist in the seed (`reference/marketup_seed_data.js`) but their HTML variants were **not copied here** — they're narrative variations on the same templates. The Next.js implementation generates them dynamically.

### Dashboard — owner workspace (11)
```
dashboard_index.html                            Overview (welcome, stats, profile states)
dashboard_account.html                          Company profile (live + validation + locked zones)
dashboard_settings.html                         Security (password) + account deletion
dashboard_brandup.html                          BrandUP profile editor (state: rejected)
dashboard_traceup.html                          TraceUP editor + video CRUD (state: pending)
dashboard_linkup.html                           LinkUP editor (state: active + boosted)
dashboard_boost.html                            Boost overview (3 cards per profile)
dashboard_sponsoring.html                       Sponsoring campaigns
dashboard_rse.html                              RSE receipts list + badge state
dashboard_billing.html                          Transactions list + invoice download
dashboard_notifications.html                    All notifications, read/unread state
```

> `dashboard_shell.html` and `dashboard_sidebar.html` were **layout references** during design — they are not hydrated and have been **dropped** from this reference set.

### Admin — super admin workspace (10)
```
admin_dashboard.html                            KPIs + 3 priority queues + recent activity
admin_entreprises.html                          All companies directory (20 demo entries)
admin_entreprise-detail.html                    Single company detail + 3 profiles
admin_validation-comptes.html                   New signups + account modif requests
admin_validation-profils.html                   New profile submissions + modif requests
admin_validation-rse.html                       RSE receipt validation queue
admin_brandup-detail.html                       Review a single BrandUP profile
admin_traceup-detail.html                       Review a single TraceUP profile
admin_linkup-detail.html                        Review a single LinkUP profile
admin_transactions.html                         All transactions across companies + export
```

---

## How to use these in implementation

### When porting a feature to Next.js
1. **Open the matching mockup first.** Read the inline `<style>` and JS blocks.
2. **Identify the data it needs.** It usually calls `MARKETUP_HYDRATE.bootstrapPage((me, H) => ...)` — that body tells you which fields to fetch.
3. **Match the API endpoint.** Cross-reference `reference/API_REFERENCE_MARKETUP.md` Appendix C ("Maquette → Endpoint Traceability").
4. **Reproduce the layout** using only Tailwind classes per `.claude/skills/marketup-ui-canon/SKILL.md`.
5. **Compare side-by-side** when done. Layout, spacing, colors must match the mockup.

### When checking the canonical narrative
Open `public_brandup_technofab-industries.html` (or traceup / linkup) to see exactly how a TechnoFab profile presents publicly. The seed data must produce the same content when the Next.js page renders dynamically.

---

## What's missing on purpose

The following variations exist in the original mockup project but were intentionally excluded from this reference set:

- **Profile + popup variants per company** (AutoPlus, MediaCom, GreenLife, ArchStudio, EduPro, FoodCorner, BuildTech, TextilTunis) — they are narrative variations on the same 3 templates and would add noise without adding signal. The seed defines all their content; the templates are visually identical for any company.
- **Public landing page `/`** (vivasky.media) — explicitly out of scope per the project transfer doc; the client team owns this page.
- **Settings sub-pages** (mobile bottom-sheets, modal variants) — already inlined inside their parent mockup.

If you ever need one of the excluded variants, the file lives in the original 75-file mockup archive — ask the project owner.

---

*Last updated: May 12, 2026. Maintained by: AGGREGAX SUARL — Ahmed Mrabet.*
