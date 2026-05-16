# MARKET-UP — Phase Status

Last updated: 2026-05-16

## Current state

- Phase 2 COMPLETE (tag: phase-2-complete)
- Phase 3 IN PROGRESS — C3 committed, C4 next
- 32 commits total (Phase 0 → Phase 3 C3)
- 34 tests green
- 12 API routes (11 auth/resources + GET /me)
- 3 dashboard pages live (overview + account + settings) + 8 stubs remaining

## Phase 3 progress

| Commit | Scope | Status |
|---|---|---|
| C1 | Layout shell + /me service + sidebar + topbar | DONE |
| C2 | Overview page (dashboard_index.html) + stale-session fix | DONE |
| C3 | Account + Settings pages | DONE |
| C4 | 3 Profile editor skeletons | NEXT |
| C5 | Boost + Sponsoring + RSE pages | Pending |
| C6 | Billing + Notifications + tests | Pending |

## C3 deliverables

- AccountForm: 8 sections (header, cascade banner, identity, contact, languages, share, action bar, danger zone)
- FieldBadge: 4 variants (locked/validation/live/verified)
- LogoUploadZone + BannerUploadZone (visual zones, upload stubbed)
- LangChip multi-select (FR checked, AR/EN disabled "Bientôt")
- CopyGroup: clipboard copy + toast feedback
- react-hook-form dirty tracking (isDirty + dirtyCount + reset)
- AccountActionBar: dynamic "Compte à jour" / "X modifications en attente" states
- SettingsForm: password change (3 inputs + 4-bar strength + match indicator)
- DeleteAccountModal: dual-unlock (text "SUPPRIMER" + password)
- ChangePasswordSchema + DeleteAccountSchema (Zod)
- FEATURE_COMING_SOON_DELETE stub message
- .field-label / .field-input / .field-help CSS utilities
- Loading skeletons for both pages

## C2 deliverables

- SectionHeader, EmptyState shared components
- OverviewStats: 4 stat cards (total + per-profile, status-driven)
- OverviewProfiles: 3 cards with StatusPill, switch, status-driven CTAs
- OverviewRse: gold-accented badge card (last donation + total year)
- OverviewQuickActions: 4 quick action cards with hover effects
- MeResponse extended: root-level `rse` block (badgeStatus, lastDonation, totalDonationsYear)
- .card / .card--hover / .icon-fill CSS utilities
- Graceful stale-session: getMe() returns null → /session-expired → signOut → /login

## C1 deliverables

- GET /api/v1/me (owner session, full MeResponse)
- me.service.ts: getMe() + getNotificationPreviews()
- DashboardSidebar (5 sections, status dots, badges, mobile Sheet, signOut)
- DashboardTopbar (bell dropdown with real DB data, avatar dropdown)
- StatusPill (6 variants), StatusDot, MoneyAmount
- stub-messages.ts + useFeatureSoonToast() hook
- pricing.ts: formatMoney() + computeTTC()
- 11 page stubs + error boundary
- 6 shadcn primitives (sheet, separator, avatar, badge, switch, skeleton)

## Atlas database state

- 10 seeded companies (TechnoFab canon as c-001)
- 30 seeded profiles, 6 boosts, 2 sponsorings, 19 transactions, 8 RSE receipts
- 16 notifications (3 unread for TechnoFab)

## Required .env.local vars

- MONGODB_URI (Atlas connection string)
- NEXTAUTH_URL (http://localhost:3000)
- NEXTAUTH_SECRET (32-byte base64)
- RESEND_API_KEY (re_...)
- EMAIL_FROM (onboarding@resend.dev for sandbox dev)
- R2_* (empty, Phase 4)
- PUSHER_* (empty, Phase 9)

## Key files to read on resume

1. CLAUDE.md (project canon)
2. PHASE_STATUS.md (this file)
3. .claude/skills/marketup-ui-canon/SKILL.md (UI tokens)
4. reference/mockups/dashboard_brandup.html (C4 source of truth)
5. reference/mockups/dashboard_traceup.html (C4 source of truth)
6. reference/mockups/dashboard_linkup.html (C4 source of truth)

## C4 scope (next session)

- 3 Profile editor pages (BrandUP, TraceUP, LinkUP)
- Each profile editor shows: status header, profile data form, submission CTA
- BrandUP: gallery, description, contact info
- TraceUP: channel metadata + video list (CRUD without admin review)
- LinkUP: social links, QR customization, contact card preview
- All edits stubbed (no real PUT to API yet — Phase 4 mutations)
- Reuse FieldBadge, SectionHeader, StatusPill from C1-C3
