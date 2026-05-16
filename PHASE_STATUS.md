# MARKET-UP — Phase Status

Last updated: 2026-05-16

## Current state

- Phase 2 COMPLETE (tag: phase-2-complete)
- Phase 3 IN PROGRESS — C4 committed, C5 next
- 35 commits total (Phase 0 → Phase 3 C4)
- 34 tests green
- 12 API routes (11 auth/resources + GET /me)
- 6 dashboard pages live (overview + account + settings + 3 editors) + 5 stubs remaining
- Storage adapter foundation committed (local filesystem, R2 stub for V1.1)

## Phase 3 progress

| Commit | Scope | Status |
|---|---|---|
| C1 | Layout shell + /me service + sidebar + topbar | DONE |
| C2 | Overview page (dashboard_index.html) + stale-session fix | DONE |
| C3 | Account + Settings pages | DONE |
| C4 | 3 Profile editor pages (BrandUP/TraceUP/LinkUP) | DONE |
| C5 | Boost + Sponsoring + RSE pages | NEXT |
| C6 | Billing + Notifications + tests | Pending |

## C4 deliverables

- getProfileForEditor() service (Option B: separate from getMe)
- ProfileEditorData types + type guards (BrandUp/TraceUp/LinkUp variants)
- ProfileStatusBlock: 3 variants (pending amber, rejected red, disabled gray)
- ProfileActionBar: 6-state matrix (isDirty + status-driven CTAs)
- ProfileEmptyState: null profile with create CTA per kind
- BrandUpEditor: pitch + about + 9-slot gallery with HERO badge
  - Gallery: static titles, trash overlay, ↑↓ reorder, AddGalleryImageModal
  - GalleryDeleteConfirm modal
  - Boost/Sponsoring cards (state-driven blocking)
- TraceUpEditor: 4-tab video list + AddVideoModal (5 fields, regex validation)
  - Per §6.10: videos editable even in pending state
  - Red/green URL feedback per platform
- LinkUpEditor: auto links + required (read-only) + 5 platform optional + QR placeholder
- 6 new stub messages (CREATE, VIDEO_ADD, REACTIVATE, GALLERY_*)
- Seed updated: TechnoFab gallery populated with 5 images
- Loading skeletons for all 3 routes

## C3 deliverables

- AccountForm: 8 sections with FieldBadge (4 variants)
- SettingsForm: password + DeleteAccountModal (dual-unlock)
- react-hook-form dirty tracking + AccountActionBar
- .field-label / .field-input / .field-help CSS utilities

## C2 deliverables

- SectionHeader, EmptyState, OverviewStats/Profiles/Rse/QuickActions
- MeResponse rse block, .card/.card--hover/.icon-fill CSS
- Graceful stale-session handling

## C1 deliverables

- GET /api/v1/me, DashboardSidebar/Topbar, StatusPill/StatusDot/MoneyAmount
- 11 page stubs + error boundary, 6 shadcn primitives

## Atlas database state

- 10 seeded companies (TechnoFab canon as c-001)
- 30 seeded profiles (TechnoFab BrandUP has 5 gallery images)
- 6 boosts, 2 sponsorings, 19 transactions, 8 RSE receipts
- 16 notifications (3 unread for TechnoFab)

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
4. reference/mockups/dashboard_rse.html (C5 source of truth)
5. reference/mockups/dashboard_boost.html (C5 source of truth)
6. reference/mockups/dashboard_sponsoring.html (C5 source of truth)

## C5 scope (next session)

- RSE page: receipt list + submission form + badge status display
- Boost page: active boost card + purchase flow (stubbed payment)
- Sponsoring page: campaign card + purchase flow (stubbed payment)
- All payments stubbed via useFeatureSoonToast()
- Reuse MoneyAmount, StatusPill, SectionHeader from C1-C2
