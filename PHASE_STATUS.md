# MARKET-UP — Phase Status

Last updated: 2026-05-15

## Current state

- Phase 2 COMPLETE (tag: phase-2-complete)
- Phase 3 IN PROGRESS — C1 committed, C2 next
- 29 commits total (Phase 0 → Phase 3 C1)
- 34 tests green
- 12 API routes (11 auth/resources + GET /me)
- 11 dashboard pages (stubs) + sidebar + topbar operational

## Phase 3 progress

| Commit | Scope | Status |
|---|---|---|
| C1 | Layout shell + /me service + sidebar + topbar | DONE |
| C2 | Overview page (dashboard_index.html) | NEXT |
| C3 | Account + Settings pages | Pending |
| C4 | 3 Profile editor skeletons | Pending |
| C5 | Boost + Sponsoring + RSE pages | Pending |
| C6 | Billing + Notifications + tests | Pending |

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
3. Plan file: .claude/plans/silly-snacking-galaxy.md (Phase 3 full plan)
4. .claude/skills/marketup-ui-canon/SKILL.md (UI tokens)
5. reference/mockups/dashboard_index.html (C2 source of truth)

## C2 scope (next session)

- SectionHeader, EmptyState shared components
- OverviewStats (4 stat cards grid)
- OverviewProfiles (3 profile summary cards with status pills + CTAs)
- OverviewRse (RSE badge card, gold accent)
- OverviewQuickActions (4 quick action cards)
- loading.tsx skeleton for overview
