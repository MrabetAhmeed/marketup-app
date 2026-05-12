# MARKET-UP — Claude Code Startup Guide

This guide is for **you (Ahmed)** — not for Claude. It walks you through setting up Claude Code on your machine, preparing the MARKET-UP repository, and running productive coding sessions.

Reading time: 15 minutes.

---

## 1. What Claude Code is (and isn't)

**Claude Code** is a terminal-based coding agent that runs on your machine. It can:
- Read & edit any file in your project
- Run shell commands (npm, git, mongo, etc.)
- Read multiple files in one operation
- Plan a task before executing
- Use **skills** (the `.md` files we just prepared) as expert references

**It is not:**
- A magic code generator (you still review every commit)
- A replacement for understanding the project (it follows what's in `CLAUDE.md`)
- Always right (always read the diff before accepting)

> The mental model: Claude Code is a **senior dev who joined yesterday** — sharp, technically strong, but new to your project. The `CLAUDE.md` + skills + `reference/` are their onboarding doc.

---

## 2. Installation

### 2.1 Prerequisites
- **Node.js 20+** installed (`node -v` to check)
- **Anthropic account** with billing set up at https://console.anthropic.com (Claude Code is metered, ~$0.005 per turn on average models — expect a few dollars per coding session)
- A terminal you're comfortable with (Terminal.app on macOS, PowerShell/Windows Terminal, or any Linux shell)

### 2.2 Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

Verify:
```bash
claude --version
```

### 2.3 First-time setup
Open any directory and run:
```bash
claude
```
On first launch it asks for your API key (paste from console.anthropic.com → API Keys). It also stores your model preference (Sonnet 4.5 is the right default for this project — fast enough, smart enough).

---

## 3. Prepare the MARKET-UP project structure

Before opening Claude Code, lay down the foundation **yourself** (not via Claude). This avoids Claude making structural decisions you'd want to override.

### 3.1 Create the repo
```bash
npx create-next-app@latest marketup-app --typescript --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm
cd marketup-app
```
Answer the prompts:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind: **Yes**
- `src/` directory: **Yes**
- App Router: **Yes**
- `@/*` import alias: **Yes**
- Turbopack: **No** (stick to webpack — fewer edge cases at first)

### 3.2 Drop in the reference files

Create the structure exactly like this:

```
marketup-app/
├── CLAUDE.md                          ← copy from claude.ai output
├── reference/                          ← READ-ONLY, never modify
│   ├── API_REFERENCE_MARKETUP.md      ⭐ API contract
│   ├── SEED_ARCHITECTURE.md           ⭐ data model + 3-tier validation pattern
│   ├── CLAUDE_v3.md                   product context
│   ├── PROJET_CLAUDE_TRANSFERT_v2.md  decision history
│   ├── BRIEF_PATCH_VIDEO_SOURCES.md   video multi-platform brief
│   ├── Listes_b2b_b2c.pdf             ⭐ B2B sectors + B2C categories (port to seed)
│   ├── marketup_seed_data.js          ⭐ demo seed data
│   ├── admin_data_bridge.js           helper for admin mockups
│   ├── dashboard_hydrate_utils.js     helper for dashboard mockups
│   ├── admin_notifications_dropdown.js helper for admin mockups
│   └── mockups/                       ← 39 HTML files + shared assets
│       ├── shared/                      ← logos + onboarding images (referenced by HTMLs)
│       │   ├── logos/
│       │   │   ├── logos-brandup.png
│       │   │   ├── logos-traceup.png
│       │   │   └── logos-linkup.png
│       │   └── onboarding-images/
│       │       ├── onboarding-images-b2b_img.jpg
│       │       └── onboarding-images-b2c_img.jpg
│       ├── onboarding_onboarding.html
│       ├── auth_inscription-entreprise.html
│       ├── ... (the 9 auth files)
│       ├── public_brandup.html
│       ├── public_traceup.html
│       ├── public_linkup.html
│       ├── ... (the 3 public search engines)
│       ├── public_brandup_technofab-industries.html
│       ├── ... (the 6 TechnoFab demo profiles + popups)
│       ├── dashboard_index.html
│       ├── ... (the 11 dashboard files)
│       └── admin_dashboard.html
│       └── ... (the 10 admin files)
└── .claude/
    └── skills/
        ├── marketup-data-models/
        │   └── SKILL.md                ← from claude.ai output
        ├── marketup-api-routes/
        │   └── SKILL.md                ← from claude.ai output
        └── marketup-ui-canon/
            └── SKILL.md                ← from claude.ai output
```

Drop the files where they belong. The `reference/mockups/` folder is where you copy:
- the 39 HTML files (33 masters + 6 TechnoFab variants) from your current project,
- the `shared/` subfolder (containing `logos/` and `onboarding-images/`) — keep its structure exactly as it is, because the HTML mockups reference it via relative paths.

Note: the same `shared/` content will later be copied into `public/shared/` by Claude Code during Phase 0 setup (`npm run sync-shared` from CLAUDE.md §4-bis).

### 3.3 Tell git to leave `reference/` alone

`reference/` is documentation, not source code. Add a `.gitattributes` if you're tracking it:

```
reference/** linguist-documentation
```

If you don't want it bloating commits, add to `.gitignore`:
```
# Reference docs are tracked separately, not committed to feature branches
# (You can keep them in main if you want, just don't let them be touched in feature work)
```

I recommend **keeping them committed** in `main` — every future contributor benefits.

### 3.4 Initial commit
```bash
git init
git add .
git commit -m "chore: initial Next.js skeleton + MARKET-UP reference docs"
git remote add origin <your repo>
git push -u origin main
```

---

## 4. Your first Claude Code session

### 4.1 Launch from the project root
```bash
cd marketup-app
claude
```

You'll get a prompt. Claude has already auto-read `CLAUDE.md` at this point.

### 4.2 The opening message (copy-paste this)

```
Goal: Phase 0 — Foundation.

Please:
1. Read CLAUDE.md fully.
2. Read reference/API_REFERENCE_MARKETUP.md sections "Base Configuration" and "Authentication".
3. Read reference/SEED_ARCHITECTURE.md sections 1-4.
4. Open the skills under .claude/skills/marketup-data-models/SKILL.md and .claude/skills/marketup-api-routes/SKILL.md and tell me which patterns you'll apply.
5. Propose a plan for Phase 0 from CLAUDE.md §9: project setup + env vars + lib/db.ts + lib/env.ts + lib/i18n.ts + NextAuth scaffold + middleware.ts + error handling.
6. **Include the `npm run sync-shared` step from CLAUDE.md §4-bis** — copy `reference/mockups/shared/` into `public/shared/` so logos and onboarding illustrations are served by Next.js at runtime. Add `sync-shared` / `prebuild` / `predev` scripts to `package.json`.

Do not write any code yet. Show me the plan first.
```

### 4.3 Review the plan
Claude will respond with a plan. **Read it carefully.** Look for:
- Does it match the project structure in `CLAUDE.md §4`?
- Does it use only allowed dependencies (`CLAUDE.md §3`)?
- Does it touch `reference/`? (It shouldn't.)
- Does it skip the 3-tier validation pattern? (It must implement it.)

### 4.4 Approve and let it run
If the plan is good, reply:
```
Plan approved. Implement it. After implementation, run `npm run lint`, `npm run typecheck`, and show me the diff before I commit.
```

If the plan is wrong, push back:
```
Step 3 introduces Prisma — CLAUDE.md §3 says Mongoose only. Please revise.
```

### 4.5 Review the diff
When Claude says "done", **always**:
```bash
git status
git diff
```
Don't rely solely on Claude's summary. Skim every file:
- Are imports using `@/`?
- Are there `console.log` lines? Remove them.
- Is there any forbidden CSS pattern (CSS Modules, styled-components)?
- Did it modify `reference/`? Revert if so.

### 4.6 Commit
```bash
git add .
git commit -m "feat(phase-0): project setup + db + env + auth scaffold"
```

---

## 5. Working in feature-sized sessions

The unit of work in Claude Code is **one feature per session**. Mixing features in one chat causes the context to drift.

### 5.1 The lifecycle of a feature

```
1. New branch        →   git checkout -b feat/signup-flow
2. New Claude session →  /clear (or restart claude)
3. Set goal           →  "Goal: implement Phase 2 — auth flow. ..."
4. Plan               →  Claude proposes a plan
5. Approve & impl     →  Claude writes the code
6. Lint + typecheck   →  npm run lint && npm run typecheck
7. Manual smoke test  →  npm run dev, open http://localhost:3000, click through
8. Commit              →  git commit -m "feat(auth): ..."
9. PR + merge          →  Standard git workflow
```

### 5.2 Reasonable feature sizes for this project

| Session goal | Approx. time | What you commit |
|---|---|---|
| "Implement /api/v1/me/profiles/brandup GET + PUT" | 30–60 min | 1 service + 1 route + 1 Zod schema + a test or two |
| "Build the (dashboard)/dashboard/brandup page from mockup" | 60–90 min | 1 page + 2–3 components + RHF form |
| "Implement admin company validation queue UI" | 90 min | 1 page + 1 service + 1 data hook |
| "Add Pusher real-time events to profile approve/reject" | 30 min | Small additions to existing services |

If a session goes >2h or Claude's plan grows beyond 10 steps, **split it**.

### 5.3 Slash commands worth knowing

Inside Claude Code:
- **`/clear`** — wipes context. Use between unrelated features. **Use this religiously.**
- **`/cost`** — shows current session cost
- **`/help`** — list of commands
- **`/exit`** — quit the session

---

## 6. Patterns that work well (rules of thumb)

### 6.1 Always start with "Read X, then plan"
Never `"Implement feature Y"` as the first message. Always:
```
Read CLAUDE.md, reference/API_REFERENCE_MARKETUP.md section Z, and the mockup reference/mockups/<file>.html. Then propose a plan.
```

This costs 1 turn but saves 10 by avoiding rework.

### 6.2 Reference mockups by filename, not by description
Bad: *"build the admin transactions page"*
Good: *"port `reference/mockups/admin_transactions.html` to a Next.js page at `app/(admin)/admin/transactions/page.tsx` using the patterns in `.claude/skills/marketup-ui-canon/SKILL.md`. The data comes from `GET /api/v1/admin/transactions` (already implemented). Read the mockup first, then propose a plan."*

### 6.3 When stuck, ask Claude to read more
If Claude proposes the wrong shape:
```
Re-read reference/SEED_ARCHITECTURE.md §4.4.1 and confirm whether TraceUP videos use pendingData.
```

### 6.4 Don't fight Claude on facts that are in the docs
If you're unsure whether Claude is right or wrong, point to the doc:
```
What does API_REFERENCE_MARKETUP.md say about idempotency on /me/boost/checkout?
```
Claude will quote it back at you, and the question answers itself.

### 6.5 Commit frequently
Don't let Claude accumulate 20 file changes before you commit. Every working state = one commit. If something breaks at change 19, you don't want to bisect through `git diff HEAD` 4000 lines.

---

## 7. Anti-patterns (avoid)

| ❌ Don't | ✅ Instead |
|---|---|
| "Build the whole admin section in one session" | One page per session |
| Accept code without reading the diff | `git diff` every time |
| Let Claude pick a UI library | Tell it: shadcn/ui only |
| Skip the plan step | Always plan first |
| Mix two features in one chat | `/clear` between features |
| Edit `reference/` | It's read-only; if a doc is wrong, fix it in `CLAUDE.md` instead |
| Move on with red typecheck errors | Block: fix or revert |
| Trust the seed dates | Use relative offsets when seeding the DB |

---

## 8. Quick troubleshooting

### Claude is hallucinating fields that don't exist in the seed
→ Ask: *"Read `reference/marketup_seed_data.js` and quote the actual structure of the company `liveData` field."*

### Claude wrote CSS Modules / styled-components / Material UI
→ Reject the diff. Reply: *"`CLAUDE.md §3` forbids this. Rewrite using Tailwind classes only."*

### Claude wrote `data.pitch.fr` instead of `pickLocale(data.pitch, lang)`
→ *"This leaks i18n. Use `pickLocale` from `@/lib/i18n` and normalize in the service before returning."*

### Claude wrote money as `1250 DT`
→ *"Use the `MoneyAmount` component. Thousand separator is a non-breaking space: `1 250 DT`."*

### Claude wrote `font-extrabold` or `rounded-2xl`
→ *"Forbidden by `.claude/skills/marketup-ui-canon/SKILL.md` §15. Use `font-bold` and `rounded-lg`."*

### Claude added a `_visible` field to the Profile schema
→ *"Visibility is computed at read-time per `CLAUDE.md §6.2`. Remove the column; add a helper to `lib/visibility.ts` instead."*

### Logos or onboarding illustrations are 404 in the browser
→ The `public/shared/` folder is missing. Run `npm run sync-shared` (or manually `cp -r reference/mockups/shared public/shared`). Then refresh. See `CLAUDE.md §4-bis`.

### Build fails after Claude's changes
→ Don't ask Claude to fix it blindly. `git diff HEAD~1`, find what broke, then ask: *"This file was working at commit X and broke at commit Y. Compare and fix."*

---

## 9. Recommended pace for the project

| Week | Phases | Output |
|---|---|---|
| Week 1 | Phase 0 + Phase 1 | DB models + auth scaffold + seed script working |
| Week 2 | Phase 2 + Phase 3 | Signup/login flow + dashboard skeleton |
| Week 3 | Phase 4 (part 1) | BrandUP CRUD + page |
| Week 4 | Phase 4 (part 2) | TraceUP CRUD + page + video upload flow |
| Week 5 | Phase 4 (part 3) + Phase 5 (part 1) | LinkUP CRUD + public search engines |
| Week 6 | Phase 5 (part 2) | Public profile pages |
| Week 7 | Phase 6 | Admin workspace |
| Week 8 | Phase 7 + 8 | Boost + Sponsoring + RSE |
| Week 9 | Phase 9 + 10 | Notifications + invoices |
| Week 10 | Phase 11 | E2E tests + polish + bug bash |

This assumes one developer (you) with Claude Code, ~5h/day. With a second developer it can compress to 6 weeks.

---

## 10. Tools to install alongside Claude Code

- **MongoDB Compass** — visual DB inspector while developing
- **Postman / Bruno / HTTPie** — manual API testing before E2E tests exist
- **Tailwind CSS IntelliSense** (VS Code) — autocomplete for Tailwind classes
- **ESLint + Prettier** extensions for your editor — show errors inline
- **GitLens** (VS Code) — see Claude's last commit context next to each line
- **Vitest UI** — visual test runner once you start writing tests

---

## 11. When to take Claude out of the loop

Some things are **not for Claude**:

- **Architectural decisions** (DB schema changes, picking a payment gateway, choosing an email provider) — these are yours.
- **Visual design tweaks** — read a mockup yourself, then describe the change precisely.
- **Production deployment** — Vercel/Railway/AWS setup is too project-specific. Do it manually, then teach Claude via `CLAUDE.md` updates.
- **Customer conversations** — Claude doesn't know your client.

The 80/20 rule: Claude generates 80% of the code, you make 80% of the decisions.

---

## 12. Bonus — CSS extraction from mockups (your earlier question)

You asked whether to extract CSS from the 39 HTML mockups here in claude.ai or in Claude Code.

**Answer: Claude Code.** Open a session, then:
```
Goal: audit the 39 HTML mockups in reference/mockups/ and produce a single Tailwind-equivalent CSS reference.

Step 1: list all unique inline CSS rules across the 39 files. Group by purpose (layout, colors, typography, components).
Step 2: for each unique rule, propose the equivalent Tailwind class (or note "needs custom" if no equivalent exists).
Step 3: write the output to docs/CSS_TO_TAILWIND_MAPPING.md.

Do not edit the mockups themselves — they are read-only. Output only the new docs file.
```

Claude Code can `grep` across all 39 files in one command — something painful to do in claude.ai. Expect this exercise to take ~30 minutes and produce a 200-line mapping doc.

You don't need this until you start porting pages (Phase 4+). When you do, having the mapping precomputed means each page port becomes mechanical.

---

## 13. Final checklist before your first session

- [ ] Node 20+ installed
- [ ] `claude` CLI installed (`claude --version` works)
- [ ] Anthropic API key configured
- [ ] `marketup-app/` created via `create-next-app`
- [ ] `CLAUDE.md` at repo root
- [ ] `reference/` folder populated with all docs + 39 mockups
- [ ] `reference/mockups/shared/` folder copied (logos + onboarding-images)
- [ ] You know that `public/shared/` will be created by Claude Code in Phase 0 (do NOT pre-create it)
- [ ] `.claude/skills/` folder with the 3 SKILL.md files
- [ ] Initial commit done, repo pushed to GitHub
- [ ] You've read this guide once

You're ready. Open `marketup-app/` in your terminal, run `claude`, and use the opening prompt from §4.2.

Good luck. 🚀

---

*Maintained by: AGGREGAX SUARL — Ahmed Mrabet · Updated May 12, 2026*
