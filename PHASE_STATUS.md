# MARKET-UP — Phase Status

Last updated: 2026-05-16

## Current state

- Phase 2 COMPLETE (tag: phase-2-complete)
- Phase 3 IN PROGRESS — C5 committed, C6 next
- 37 commits total (Phase 0 → Phase 3 C5)
- 34 tests green
- 12 API routes (11 auth/resources + GET /me)
- 9 dashboard pages live (overview + account + settings + 3 editors + rse + boost + sponsoring) + 2 stubs remaining (billing + notifications)
- Storage adapter foundation committed (local filesystem, R2 stub for V1.1)

## Phase 3 progress

| Commit | Scope | Status |
|---|---|---|
| C1 | Layout shell + /me service + sidebar + topbar | DONE |
| C2 | Overview page (dashboard_index.html) + stale-session fix | DONE |
| C3 | Account + Settings pages | DONE |
| C4 | 3 Profile editor pages (BrandUP/TraceUP/LinkUP) | DONE |
| C5 | RSE page + Boost/Sponsoring placeholders | DONE |
| C6 | Billing + Notifications + tests | NEXT |

## C5 deliverables

- getRseDataForUser() service (fetches receipts + associations + stats)
- RsePageData + RseReceiptForUser types
- RseBadgeHero: gold accent card (validated/none states)
- RseStats: 3 stat cards (total validated, receipt count, last donation)
- RseReceiptsList: filterable list (all/validated/pending) + footer recap
- RseDonationModal: 5 fields (association/amount/date/file/notes)
- PDF download button on validated cards (stubbed toast)
- FeatureComingSoonPage shared component (boost/sponsoring kinds)
- Boost + Sponsoring placeholder pages with kind-specific copy
- 4 new stub messages (RSE_DONATION, BOOST, SPONSORING, RECEIPT_DOWNLOAD)
- Loading skeletons for all 3 routes

## C4 deliverables

- getProfileForEditor() service + ProfileEditorData types
- ProfileStatusBlock, ProfileActionBar (6-state), ProfileEmptyState
- BrandUpEditor: 9-slot gallery (HERO + reorder + delete + add modal)
- TraceUpEditor: 4-tab videos + AddVideoModal (regex validation)
- LinkUpEditor: 5 platforms + auto links + QR placeholder
- 6 stub messages (CREATE, VIDEO_ADD, REACTIVATE, GALLERY_*)

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
- 16 notifications (3 unread for TechnoFab)
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
4. reference/mockups/dashboard_notifications.html (C6 source of truth)
5. reference/mockups/dashboard_billing.html (C6 source of truth)

## C6 scope (next session)

- Notifications page: full notification list with read/unread, pagination
- Billing page: placeholder (FeatureComingSoonPage pattern) or transaction list
- Phase 3 end-of-phase tests (if time permits)
- PHASE_STATUS update + phase-3-complete tag
