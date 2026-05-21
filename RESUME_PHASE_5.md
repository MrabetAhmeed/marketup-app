# RESUME — Phase 5 (à faire après pause)

## État au commit final Sprint 6.2C

- Tag pushed : `phase-6-complete`
- npm run build : PASS
- Tests : 34/34 green
- Phase 6 complète

## Prochaine phase : Phase 5

3 pages publiques + search :
- `/brandup/[slug]` — profil institutionnel public
- `/traceup/[slug]` — profil média (vidéos)
- `/linkup/[slug]` — carte contact numérique
- `/search` — recherche globale (ou page dédiée par type)

## Helpers réutilisables

- `isProfileVisible(profile, company)` — cascade visibility déjà câblée
- Filter en query : `company.status === "active"` + `profile.status === "active"` + `profile.isPublic === true`

## Mockups référence

33 fichiers HTML dans `reference/mockups/` :
- `public_brandup_*.html` (institutionnels)
- `public_traceup_*.html` (médias)
- `public_linkup_*.html` (cartes contact)

## Patterns Phase 5

- SSR server components pour SEO
- Routes slug-based (`[slug]`)
- `generateMetadata()` pour Open Graph
- Pages auth-free (public)
- Si `useSearchParams` → wrap `<Suspense>` (canon Phase 6.2C)
- API routes utilisant `headers()` → `export const dynamic = "force-dynamic"`

## Workflow nouvelle conversation

Ouvrir nouvelle conv Claude.ai (même Project), coller :

```
Bonjour Claude, je travaille sur le projet MARKET-UP avec une équipe
Claude.ai + Claude Code. Phase 6 complète (tag phase-6-complete).
Lis PROJECT_TRANSFERT_v3.md et RESUME_PHASE_5.md dans Project Knowledge.
On attaque Phase 5 (pages publiques).
```
