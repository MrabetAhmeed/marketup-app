# MARKET-UP — Phase Status

Last updated: 2026-05-16

## Current state

- Phase 3 COMPLETE (tag: phase-3-complete)
- 39 commits total (Phase 0 → Phase 3 C6)
- 34 tests green
- 12 API routes (11 auth/resources + GET /me)
- 11 dashboard pages live (0 stubs remaining)
- Storage adapter foundation committed (local filesystem, R2 stub for V1.1)
- All mockups ported 1-to-1 with browser-tested fidelity

## Phase 3 summary — COMPLETE

| Commit | Scope | Status |
|---|---|---|
| C1 | Layout shell + /me service + sidebar + topbar | DONE |
| C2 | Overview page + stale-session graceful handling | DONE |
| C3 | Account + Settings pages | DONE |
| C4 | 3 Profile editor pages (BrandUP/TraceUP/LinkUP) | DONE |
| C5 | RSE page + Boost/Sponsoring placeholders | DONE |
| C6 | Notifications page + Billing placeholder | DONE |

## C6 deliverables

- getNotificationsForUser() service (filter + pagination + unread count)
- NotificationsPageClient: 7 filter pills + client-side pagination (10/page)
- NotificationItemCard: read/unread visual states + hover actions
- "Mark all as read" CTA (stubbed)
- formatRelativeTime() helper (French: "Il y a 2 heures", "Hier", etc.)
- FeatureComingSoonPage extended with "billing" kind
- Seed extended: TechnoFab now has 15 notifications (3 unread + 12 read)
- 4 new stub messages (MARK_READ, MARK_ALL_READ, DELETE_NOTIFICATION, BILLING)

## C5 deliverables

- getRseDataForUser() service + RseBadgeHero + RseStats + RseReceiptsList
- RseDonationModal (5 fields) + PDF download button (stubbed)
- FeatureComingSoonPage (boost/sponsoring placeholders)

## C4 deliverables

- getProfileForEditor() service + ProfileEditorData types
- ProfileStatusBlock, ProfileActionBar (6-state), ProfileEmptyState
- BrandUpEditor: 9-slot gallery (HERO + reorder + delete + add modal)
- TraceUpEditor: 4-tab videos + AddVideoModal (regex validation)
- LinkUpEditor: 5 platforms + auto links + QR placeholder

## C3 deliverables

- AccountForm: 8 sections with FieldBadge (4 variants)
- SettingsForm: password + DeleteAccountModal (dual-unlock)
- react-hook-form dirty tracking + AccountActionBar

## C2 deliverables

- SectionHeader, EmptyState, OverviewStats/Profiles/Rse/QuickActions
- MeResponse rse block, graceful stale-session handling

## C1 deliverables

- GET /api/v1/me, DashboardSidebar/Topbar, StatusPill/StatusDot/MoneyAmount
- 11 page stubs + error boundary, 6 shadcn primitives

## Atlas database state

- 10 seeded companies (TechnoFab canon as c-001)
- 30 seeded profiles (TechnoFab BrandUP has 5 gallery images)
- 6 boosts, 2 sponsorings, 19 transactions, 8 RSE receipts
- 25 notifications (15 for TechnoFab: 3 unread + 12 read)
- 5 associations (Al Ahed, Tunisie Verte, Croissant Rouge, SOS Villages, Aveugles)

## Required .env.local vars

- MONGODB_URI (Atlas connection string)
- NEXTAUTH_URL (http://localhost:3000)
- NEXTAUTH_SECRET (32-byte base64)
- RESEND_API_KEY (re_...)
- EMAIL_FROM (onboarding@resend.dev for sandbox dev)
- STORAGE_ADAPTER=local
- UPLOAD_MAX_SIZE_MB=5
- R2_* (empty, V1.1)
- PUSHER_* (empty, Phase 9)

## Key files to read on resume

1. CLAUDE.md (project canon)
2. PHASE_STATUS.md (this file)
3. .claude/skills/marketup-ui-canon/SKILL.md (UI tokens)
4. reference/API_REFERENCE_MARKETUP.md (Phase 4 REST contract)
5. reference/SEED_ARCHITECTURE.md (3-tier validation pattern)

## What's next — Phase 4

Phase 4 = Profile editing (real mutations):
- PUT endpoints for profile data (3-tier pattern: live/validation/locked)
- File upload wiring (storage adapter → /api/v1/uploads)
- Form submissions that persist to DB
- Admin notification on profile submission
- pendingData flow for validation-gated fields

Estimated: 5 days (per CLAUDE.md §9)
