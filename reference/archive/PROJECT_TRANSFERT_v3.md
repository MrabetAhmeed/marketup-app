# PROJECT TRANSFERT v3 — MARKET-UP

> État au 22 mai 2026 — Démo-ready, tag `pre-demo-improvements`

## Phases complètes

- ✅ Phase 0 (setup)
- ✅ Phase 1 (models + seed)
- ✅ Phase 2 (auth flow)
- ✅ Phase 3 (dashboard skeleton)
- ✅ Phase 4 (mutations — profils CRUD, uploads, videos)
- ✅ Phase 5 COMPLETE : public pages — 3 search engines + 3 profile pages + 3 popups + Open Graph + sync Account propagation
- ✅ Phase 6 COMPLETE :
  - Sprint 6.1 : user RSE workflow + signup PDF document
  - Sprint 6.2A : admin login + layout + validation profils
  - Sprint 6.2B : admin validation comptes + RSE + notifications
  - Sprint 6.2C : user-driven correction + suspend/reactivate + 5-layer gating + build fixes + PDF persist fix
- ✅ Pre-demo improvements COMPLETE (tag `pre-demo-improvements`) :
  - Sprint 7X : profils auto-créés à signup + lazy login
  - Sprint 7A : cacher Certifications BrandUP public
  - Sprint 7B + 7B+ : enrich admin visibility + console-style navigation
  - Sprint 7C + 7C+ + 7C++ + 7C+++ : tout BrandUP hard change + tags gallery + previousStatus + currentGallery snapshot

## État technique

- npm run build : PASS (51+ pages, 0 errors)
- Tests : 34/34 green
- Tags : `phase-5-complete` (f0e04a6) + `phase-6-complete` (a2a5dc8) + `pre-demo-improvements` (0abce76)
- Deploy OVH : fait par équipe en parallèle

## Décisions architecturales clés Phase 5

1. Canon coordonnées contact (sync entre tous les profils) :
   - `company.liveData.phone, whatsapp, contactEmail, address, ville` = source de vérité
   - À lire depuis public LinkUP composants + service public-profile + dashboard editor buildLinkUp
   - PAS de fallback contactCard pour ces champs

2. Galerie BrandUP :
   - `data.gallery` (user uploads) prioritaire, mappé vers format projects
   - `data.projects` (seed) fallback si gallery vide

3. LinkUP website :
   - `data.socials[platform=website]` prioritaire
   - `data.contactCard.website` fallback

4. LinkUP contactCard usage restreint :
   - photo, fullName, title, bio, company (peut différer du displayName)
   - gpsPosition (V1.1 déplacement vers Account)
   - socials[]

5. Routes publiques : /brandup, /traceup, /linkup (root = search, [slug] = profil)
6. Popups : modals React (pas routes séparées), composants profil réutilisés sans footer
7. Search : $regex AND avec normalisation accents
8. TraceUP search EXCLUT channelName + channelDescription (V1.1 cleanup sprint)
9. Cross-links profils → vers les autres moteurs
10. Cover card search : `company.data.bannerUrl` + fallback initiales 2 lettres
11. Mockup wins pour Phase 5 public : font-extrabold + rounded-2xl/3xl autorisés
12. react-icons (nouvelle dep autorisée pour LinkUP services)
13. Cascade visibility : isProfileVisible() + pendingData null + Company.status active

## Décisions architecturales clés Phase 6

1. Status canon : pending / active / rejected / suspended / incomplete / deleted
2. "suspended" partout (DB + URL + service), UI label "Désactiver"
3. Cascade visibility helper isProfileVisible()
4. Gating user rejected : whitelist /account/edit + sidebar/topbar mask
5. Workflow rejected : login OK → /account/edit → re-submit → force logout → re-login bloqué pending
6. Workflow pending/suspended : login bloqué (auth.service)
7. Réutiliser endpoint public signup-document pour PDF re-upload
8. Cloudinary PDF delivery activé manuellement (settings panel) — CRITICAL ops note
9. 5 couches défense status : JWT redirect, layout SSR, page guards, sidebar mask, topbar mask
10. `guardActiveCompany()` helper centralise rejected/suspended/pending guards
11. `identityDocumentUrl` modifiable UNIQUEMENT via POST /resubmit (immutable retiré du model)

## Décisions architecturales Sprint 7 (pré-démo)

1. BrandUP : tous les champs hard change (pitch, about, gallery)
2. isPublic : soft change (toggle owner instantané)
3. TraceUP videos : soft change (CLAUDE.md §6.10)
4. LinkUP socials : soft change
5. pendingData schema étendu : fields[], submittedAt, previousStatus
6. currentGallery snapshot stocké dans pendingData.fields[gallery].currentValue pour diff stable
7. Tags visuels NOUVEAU/SUPPRIMÉE gallery (dashboard user + admin review)
8. Profils auto-créés via discriminator models + filet lazy login
9. Admin console navigation libre depuis /admin/entreprises
10. Cancel pending restore previousStatus (pas heuristique publishedAt)

## Conventions deploy

- Toutes routes API utilisant `headers()`/`getToken()` ont `export const dynamic = "force-dynamic"`
- Pages avec `useSearchParams()` sont wrappées dans `<Suspense>`
- Cloudinary PDF delivery enabled requis en production
- `STORAGE_ADAPTER=cloudinary` dans `.env.local` / `.env.production`

## V1.1 backlog

### Phase 5 cleanup
- Déplacer gpsPosition de data.contactCard → company.liveData (sync depuis Account)
- channelName + channelDescription TraceUP cleanup sprint (suppression définitive du model + seed + dashboard + types)
- Sponsoring model wiring banner public (actuellement statique V1)
- Tracking endpoints (POST /public/profiles/:type/:slug/track) pour boost/sponsoring stats
- $text MongoDB index migration (actuellement $regex)
- Real Open Graph images via Cloudinary transforms (actuellement dicebear initials)
- B2C TraceUP seed companies (currently 0)

### Phase 6 cleanup
- Resend domain verification (email free tier limits)
- Auth'd dedicated endpoint for rejected PDF re-upload (réutilise /public/signup-document actuellement)
- Migration signup-temp/ → companies/{id}/legal-docs/ après validation
- Email user on suspend/reactivate (actuellement silencieux)
- Real-time JWT refresh on admin status change (actuellement next-click detection)
- Admin page for "rejected" companies list

### Sprint 7 cleanup
- Validation/redimensionnement images upload
- Validation post-création profil
- Réactiver Certifications BrandUP
- Services/socials/certifications éditeurs dashboard

### Autres
- Path traversal defense in depth (ObjectId validation dans LocalAdapter)
- Random suffix pour collision-resistant keys
- Component tests + service tests
- E2E Playwright
