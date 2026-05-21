# PROJECT TRANSFERT v3 — MARKET-UP

> État au 21 mai 2026 — Phase 6 complete + production build verified

## Phases complètes

- ✅ Phase 0 (setup)
- ✅ Phase 1 (models + seed)
- ✅ Phase 2 (auth flow)
- ✅ Phase 3 (dashboard skeleton)
- ✅ Phase 4 (mutations — profils CRUD, uploads, videos)
- ✅ Phase 6 COMPLETE :
  - Sprint 6.1 : user RSE workflow + signup PDF document
  - Sprint 6.2A : admin login + layout + validation profils
  - Sprint 6.2B : admin validation comptes + RSE + notifications
  - Sprint 6.2C : user-driven correction + suspend/reactivate + 5-layer gating + build fixes + PDF persist fix

## État technique

- npm run build : **PASS** (51 pages, 0 errors)
- Tests : 34/34 green (20 ESM unit + 14 auth suite skipped — MongoMemoryReplSet infra)
- Tag : `phase-6-complete`
- Deploy-ready for OVH VPS

## Prochaines phases

- 🔵 Phase 5 : 3 pages publiques + search (brandup/traceup/linkup [slug])
- 🔵 Deploy VPS OVH (équipe en parallèle)
- 🎯 Démo cible : 21-22 mai 2026

## Décisions UX clés Phase 6

1. Status canon : pending / active / rejected / suspended / incomplete / deleted
2. "suspended" partout (DB + URL + service), UI label "Désactiver"
3. Cascade visibility : `isProfileVisible()` checks `company.status === "active"`
4. Gating user rejected : Option A (whitelist /account/edit + sidebar/topbar mask)
5. Workflow rejected : login OK → /account/edit → re-submit → force logout → re-login bloqué pending
6. Workflow pending/suspended : login bloqué (auth.service)
7. Réutiliser endpoint public signup-document pour PDF re-upload
8. Cloudinary PDF delivery activé manuellement (settings panel)
9. 5 couches défense status : JWT redirect, layout SSR, page guards, sidebar mask, topbar mask
10. `guardActiveCompany()` helper centralise rejected/suspended/pending guards
11. Schemas account-resubmit acceptent paths relatifs + URLs absolues
12. `identityDocumentUrl` modifiable UNIQUEMENT via POST /resubmit (immutable retiré du model)

## Conventions deploy

- Toutes routes API utilisant `headers()`/`getToken()` ont `export const dynamic = "force-dynamic"`
- Pages avec `useSearchParams()` sont wrappées dans `<Suspense>`
- Cloudinary PDF delivery enabled requis pour production
- `STORAGE_ADAPTER=cloudinary` dans `.env.local`

## V1.1 backlog

- Resend domain verification (email free tier limits)
- Auth'd dedicated endpoint for rejected PDF re-upload
- Migration signup-temp/ → companies/{id}/legal-docs/
- Email user on suspend/reactivate
- Real-time JWT refresh on admin status change
- Admin page for "rejected" companies list
