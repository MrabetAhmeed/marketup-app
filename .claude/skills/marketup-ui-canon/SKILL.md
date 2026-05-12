---
name: marketup-ui-canon
description: Design tokens, component conventions, and the Fluent flat aesthetic for the MARKET-UP frontend. Use when building any React component under src/components/, when designing a new page under src/app/, or when porting a maquette from reference/mockups/. Required reading before adding new UI primitives, before introducing colors/typography/spacing not already in the project, and when implementing the three brand zones (BrandUP blue, TraceUP purple+gold, LinkUP black+gold) or the admin purple workspace.
---

# MARKET-UP — UI Canon Skill

This skill is the visual contract. It maps the **Fluent flat** aesthetic established in the 33 HTML mockups to a Tailwind + shadcn/ui Next.js implementation.

> **Source of truth:** any HTML file under `reference/mockups/`. When this file and a mockup disagree, the mockup wins.

## 1. Design philosophy — non-negotiable

- **Fluent flat**, not Material 3. No `font-extrabold`, no `rounded-2xl`/`rounded-3xl`, no coloured shadows, no gradient hero backgrounds, no glassmorphism.
- **Calm hierarchy.** Headings use weight 600–700, body uses 400–500. The difference is the weight, not the size, the colour, *and* the weight at once.
- **Borders before shadows.** A 1px border in `#E0E0E0` is the default container delimiter. Use shadows only on cards on hover and on modals.
- **DT is the only currency.** Never `€`, never `$`. Format: `1 250 DT` (non-breaking space as thousand separator).
- **French is the default UI language.** All copy, labels, error messages start in `fr`. `ar` and `en` are progressive enhancements.

## 2. Color tokens (Tailwind config)

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // ─── Brand primary (BrandUP blue, the default app accent) ─────
        primary: {
          DEFAULT: "#0078D4",
          hover:   "#106EBE",
          dark:    "#005A9E",
          light:   "#EFF6FC",
        },

        // ─── Brand accents per product ────────────────────────────────
        traceup: {
          DEFAULT: "#8764B8",         // purple (logo only)
        },
        linkup: {
          black: "#000000",
          gold:  "#C5A059",            // gold (logo only)
        },

        // ─── Admin workspace accent ───────────────────────────────────
        admin: {
          DEFAULT: "#5C2D91",
          hover:   "#4A2375",
          dark:    "#3D1F60",
          light:   "#F3EFFA",
          tint:    "#EBE2F5",
        },

        // ─── Neutral palette (Fluent flat) ────────────────────────────
        // Use these as bg-*, text-*, border-*. Avoid arbitrary hex elsewhere.
        ink: {
          primary:   "#242424",        // body text (never #000000)
          secondary: "#616161",        // secondary text
          tertiary:  "#8A8886",        // placeholder, hints
        },
        surface: {
          DEFAULT:    "#FFFFFF",
          subtle:     "#FAFAFA",       // table row hover, side panels
          muted:      "#F5F5F5",       // page background
          strong:     "#EFEDED",       // disabled fields
          border:     "#E0E0E0",
        },

        // ─── Semantic status palette (status pills) ───────────────────
        status: {
          draft:    { fg: "#475569", bg: "#F1F5F9", border: "#CBD5E1", dot: "#64748B" },
          pending:  { fg: "#92400E", bg: "#FFFBEB", border: "#FDE68A", dot: "#D97706" },
          active:   { fg: "#107C10", bg: "#F0FDF4", border: "#B7EBC0", dot: "#107C10" },
          rejected: { fg: "#B91C1C", bg: "#FEF2F2", border: "#FCA5A5", dot: "#DC2626" },
          disabled: { fg: "#616161", bg: "#F5F5F5", border: "#E0E0E0", dot: "#8A8886" },
          gold:     { fg: "#8A6A1F", bg: "#FEFCE8", border: "#E8C96A", dot: "#C5A059" },
        },
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", "sans-serif"],
        body:    ["Inter", "sans-serif"],
      },
      borderRadius: {
        // Stay on the Fluent flat scale
        DEFAULT: "4px",
        lg:      "8px",
        xl:      "12px",
        // DO NOT add 2xl / 3xl
      },
      boxShadow: {
        // Fluent flat — never coloured
        card:        "0 2px 4px rgba(0,0,0,0.08)",
        "card-hover":"0 4px 16px rgba(0,0,0,0.12)",
        modal:       "0 8px 32px rgba(0,0,0,0.16)",
      },
    },
  },
};
```

> **Forbidden classes**: `font-extrabold`, `rounded-2xl`, `rounded-3xl`, `shadow-blue-*`, any `bg-gradient-to-*` on hero sections, `backdrop-blur-*` on layout backgrounds.

## 3. Border radius — the rule

| Element | Class | Radius |
|---|---|---|
| Input, select, tag, badge, status pill | `rounded` | 4px |
| Button | `rounded-lg` | 8px |
| Card, panel, table container | `rounded-lg` | 8px |
| Modal, dropdown, popover | `rounded-xl` | 12px |
| Avatar (round) | `rounded-full` | — |

Anything outside this scale (16px, 24px, etc.) is wrong — push back on the designer.

## 4. Typography

- **Headings** (h1–h4): `font-heading` (Plus Jakarta Sans), `font-semibold` (600) or `font-bold` (700). **Never `font-extrabold` (800).**
- **Body**: `font-body` (Inter), `font-normal` (400) or `font-medium` (500).
- **Numeric (KPIs, prices)**: `font-heading` + `font-bold` + slightly tracking-tight if very large.
- Body sizes: `text-[12px]` for hints, `text-[13px]` for table cells, `text-[14px]` for body, `text-[15px]` / `text-[16px]` for emphasized body.
- Heading sizes: `text-[18px]` / `text-[20px]` / `text-[24px]` / `text-[28px]` — keep the count small.

## 5. Spacing

- Page padding: `p-4 md:p-8`.
- Card internal padding: `p-4` (compact) or `p-6` (default).
- Section gap: `space-y-6`.
- Form field gap (vertical): `space-y-4`.
- Button group gap (horizontal): `gap-2` or `gap-3`.

Tailwind classes only. No magic margins. If you need a non-standard value, surface it.

## 6. Component primitives (shadcn/ui)

Install only when needed:

```bash
npx shadcn@latest add button input label select textarea \
  dialog dropdown-menu sheet popover toast \
  tabs table separator card avatar checkbox
```

Customize each primitive once in `src/components/ui/` to match the tokens above. **Do not** introduce a second UI library.

## 7. Canonical components to build first

These appear across every dashboard / admin page. Build them in `src/components/shared/` and use them everywhere.

### `<StatusPill kind="active|pending|rejected|draft|disabled|gold">`

```tsx
const KIND_TO_CLASSES = {
  active:   "bg-status-active-bg text-status-active-fg border-status-active-border",
  pending:  "bg-status-pending-bg text-status-pending-fg border-status-pending-border",
  rejected: "bg-status-rejected-bg text-status-rejected-fg border-status-rejected-border",
  draft:    "bg-status-draft-bg text-status-draft-fg border-status-draft-border",
  disabled: "bg-status-disabled-bg text-status-disabled-fg border-status-disabled-border",
  gold:     "bg-status-gold-bg text-status-gold-fg border-status-gold-border",
};

const KIND_TO_LABEL = {
  active: "Actif", pending: "En attente", rejected: "Refusé",
  draft: "Brouillon", disabled: "Désactivé", gold: "Attesté",
};

export function StatusPill({ kind, children }: { kind: keyof typeof KIND_TO_CLASSES; children?: ReactNode }) {
  const cls = KIND_TO_CLASSES[kind];
  const label = children ?? KIND_TO_LABEL[kind];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded", cls)}>
      <span className={`w-1.5 h-1.5 rounded-full bg-status-${kind}-dot`} />
      {label}
    </span>
  );
}
```

### `<Breadcrumb section={…} label={…} />` (dashboard topbar)

Per CLAUDE_v3 / transfer file convention:
```
Dashboard › Section › Label
```
Section is muted, Label is `text-ink-secondary font-medium`. Hidden on mobile (`hidden md:flex`).

### `<DashboardSidebar />` + `<DashboardTopbar />`

Layout primitives for `app/(dashboard)/layout.tsx`. Width 240px sidebar (fixed), 56px topbar (sticky, no shadow — Fluent flat).

### `<AdminSidebar />` + `<AdminTopbar />`

Same shapes as dashboard, but `accent-admin` (purple `#5C2D91`).

### `<MoneyAmount value={1250} />`

Renders `1 250 DT`. Non-breaking space separator. `font-bold` on the number, `text-sm text-ink-secondary` on the unit.

```tsx
export function MoneyAmount({ value, currency = "DT" }: { value: number; currency?: string }) {
  const formatted = new Intl.NumberFormat("fr-TN", { useGrouping: true })
    .format(value)
    .replace(/\u00A0/g, "\u202F");                          // narrow no-break space
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-bold">{formatted}</span>
      <span className="text-sm text-ink-secondary">{currency}</span>
    </span>
  );
}
```

### `<Pagination total={..} page={..} onPageChange={..} />`

Three columns: info left ("12 sur 142") · controls center · page-size right. Reuses across Boost, Sponsoring, RSE, Notifications, Billing.

### `<ConfirmModal title body confirmLabel onConfirm />`

Backdrop `bg-black/50`, content `max-w-[560px] rounded-xl shadow-modal`, mobile-bottom-sheet on small screens.

### `<Toast>` (via shadcn `toast`)

Bottom-center fixed, `bg-ink-primary text-white px-4 py-2 rounded`, 1800ms duration, fade-in/out.

### `<FieldBadge kind="locked|validation|live|verified">`

For account form fields. Visual cue indicating the validation tier (3-tier pattern).

```tsx
const FIELD_BADGE = {
  locked:     { bg: "bg-surface-muted",    text: "text-ink-secondary", icon: "lock" },
  validation: { bg: "bg-status-pending-bg",text: "text-status-pending-fg", icon: "info" },
  live:       { bg: "bg-status-active-bg", text: "text-status-active-fg", icon: "check" },
  verified:   { bg: "bg-status-gold-bg",   text: "text-status-gold-fg",   icon: "verified" },
};
```

## 8. Layout shells (the most important pages)

### Dashboard shell

```
┌────────────────────────────────────────────────────────────┐
│ [Sidebar 240px]  [Topbar 56px]                              │
│ ───────────────  ─────────────────────────────────────────  │
│  LOGO MARKET-UP  Breadcrumb · Title · Subtitle    🔔 [AM]   │
│                  ───────────────────────────────────────────│
│  ENTREPRISE                                                 │
│    Vue d'ens.                                               │
│    Compte                  Main content (max-w-[1280px])    │
│  MES PROFILS                                                │
│    BrandUP●                                                 │
│    TraceUP●                                                 │
│    LinkUP●                                                  │
│  ...                                                        │
└────────────────────────────────────────────────────────────┘
```

`md:ml-60` on the main content. `bg-surface-muted` (`#F5F5F5`) on the body. `max-w-[1280px] mx-auto` on inner content.

### Admin shell

Same shape, `accent-admin` (purple), and the logo subtitle reads "ADMIN" in `text-admin uppercase`.

### Auth shell

Two-column on desktop (`lg:grid lg:grid-cols-2`):
- Left panel: solid `bg-primary-dark` (`#005A9E`), white headline "La plateforme digitale des entreprises.", AGGREGAX footer. Hidden on mobile.
- Right panel: the form, max-width 480px, centered.

> **Never** put `color: #242424` in a global `h1, h2, h3 { ... }` rule — the auth hero headlines must stay white. (Past pitfall documented in transfer v2.)

### Public search shell

A header with the moteur canonical (BrandUP/TraceUP/LinkUP), a filter rail (sector, gouvernorat, type), results grid below. Mobile bottom-sheet for filters.

## 9. Server vs Client components

Default to **Server Components**. Wrap interactivity in **Client islands**.

```tsx
// app/(dashboard)/dashboard/brandup/page.tsx — server
import { getMyProfile } from "@/services/profile.service";
import { getServerSession } from "next-auth";
import { BrandUpEditor } from "@/components/features/profiles/BrandUpEditor";  // client

export default async function Page() {
  const session = await getServerSession(authOptions);
  const profile = await getMyProfile(session!.user.companyId, "brandup");
  return <BrandUpEditor initial={profile} />;
}
```

```tsx
// components/features/profiles/BrandUpEditor.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BrandUpEditSchema } from "@/schemas/profile.schema";

export function BrandUpEditor({ initial }: { initial: Profile }) {
  const form = useForm({ resolver: zodResolver(BrandUpEditSchema), defaultValues: initial.data });
  // ...
}
```

Rule of thumb: data fetching = server; useState/useEffect = client.

## 10. Forms

- **Always** React Hook Form + Zod resolver.
- Use shadcn `<Form>` / `<FormField>` / `<FormItem>` primitives (they integrate with RHF cleanly).
- Field-level errors: `<FormMessage />` (shadcn).
- Submit button disabled while `formState.isSubmitting`. Show spinner + label `"Enregistrement…"`.
- After success: `toast.success(...)` and either redirect or refresh `router.refresh()` (server component will re-fetch).

## 11. Loading + error states

- **Loading skeletons** per route segment: `app/.../loading.tsx`. Use shadcn `Skeleton` primitive — never spinners on initial page load.
- **Error boundaries** per route segment: `app/.../error.tsx`. Show a calm card with "Une erreur est survenue" + retry button.
- **Empty states**: a 64×64 illustration / icon + 1-line headline + 1-line helper + primary CTA. Three examples shipped in the mockups (RSE list empty, no boosts, no notifications).

## 12. Icons

Use **`material-symbols-outlined`** (the mockups already use it; keep it consistent). Add the font in `app/layout.tsx`:

```tsx
<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
  rel="stylesheet"
/>
```

Render: `<span className="material-symbols-outlined">edit</span>` — sized via CSS (`style={{ fontSize: 18 }}`).

`lucide-react` is **not** used in this project — it would diverge from the mockups.

## 13. Accessibility

- Every interactive element must be keyboard-reachable. Tab order matches visual order.
- Modals trap focus and return it on close.
- Status pills include an `aria-label` describing the state ("Statut : actif").
- Form fields use `<Label htmlFor>` even when visually adjacent.
- Tables that have row-level actions use a hidden `<caption>` + ARIA.
- Colour contrast: 4.5:1 minimum for body text. The tokens above all comply.

## 14. Responsive breakpoints

Tailwind defaults:
- `sm`: 640px — phones landscape
- `md`: 768px — tablets / "desktop minimum" in this project
- `lg`: 1024px — desktop
- `xl`: 1280px — wide desktop
- `2xl`: not used

Pages are **mobile-first**. Sidebar collapses below `md`, bottom-sheet replaces dropdowns.

## 15. Forbidden patterns checklist

When reviewing PRs, refuse anything that:

- [ ] Adds a new UI library
- [ ] Uses `font-extrabold`
- [ ] Uses `rounded-2xl` or `rounded-3xl`
- [ ] Adds a coloured `shadow-*` other than the three Fluent ones (`card`, `card-hover`, `modal`)
- [ ] Adds a `bg-gradient-to-*` on a hero or layout background
- [ ] Uses `€` or `$` or any non-DT currency
- [ ] Hard-codes hex colours outside the Tailwind config tokens
- [ ] Defines global `h1, h2, h3` colour rules
- [ ] Stores `font-size: …px` inline in style attributes (use Tailwind sizes)
- [ ] Mixes Material 3 tokens (`bg-surface-container-low`, `text-on-surface`, etc.)
- [ ] Adds a CSS Module, styled-components, Emotion, or raw .css file
- [ ] Uses 1250 instead of 1\u202F250 for thousand separators in numbers

## 16. Quick reference — porting a mockup

Workflow when given an HTML mockup to port:

1. Open the HTML in `reference/mockups/`.
2. Read its `<style>` block (often inline). Identify what's the Fluent canon vs. what's mockup-specific.
3. Recreate the layout in a Next.js page using **only** Tailwind classes from the tokens above.
4. Extract the JS (especially the `MARKETUP_HYDRATE.bootstrapPage(...)` block) and translate it to a Server Component fetching data through services.
5. Wire forms and interactivity in a Client island.
6. Check the result side-by-side with the mockup — same layout, same spacing, same colours.

If you find a token in the mockup that isn't in this skill, **add it here** before using it. Don't let drift in.

---

*This canon was distilled from 33 frozen HTML mockups across Phase A (public), B2 (auth), C (owner dashboard), and D (admin).*
