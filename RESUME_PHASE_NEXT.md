# RESUME — Sprint 7 (améliorations pré-démo)

## État au 22 mai 2026

### Committed et pushé:
- Sprint 7A — Cacher Certifications BrandUP public (committed d68a713)
- Sprint 7X — Auto-create 3 profiles on signup + lazy login (committed d68a713, tag sprint-7x-complete)
- Sprint 7B + 7B+ — Admin visibility enrichie (committed 452cc07, tag sprint-7b-complete)

### Dans le working tree (PAS ENCORE COMMITÉ):
- Sprint 7C — Tout BrandUP en hard change
  - Quality gates passent (typecheck + lint + tests 34/34 + build PASS)
  - PAS browser-testé par Ahmed
  - 7 fichiers modifiés (voir détails ci-dessous)

## Sprint 7C — État détaillé (code non commité)

### Changements:
1. `src/schemas/profile-hard.schema.ts` — gallery[] ajouté à BrandupHardSubmitSchema
2. `src/schemas/profile-soft.schema.ts` — galleryOrder retiré de BrandupSoftSchema
3. `src/services/profile-hard.service.ts` — gallery snapshot dans pendingData + cancelPendingSubmission()
4. `src/services/profile-soft.service.ts` — applyBrandupSoft simplifié (isPublic uniquement)
5. `src/components/features/profiles/BrandUpEditor.tsx` — workflow single submit (gallery dans hard)
6. `src/components/features/profiles/ProfileActionBar.tsx` — props singleSubmit + onCancelPending
7. `src/app/api/v1/profiles/[profileId]/pending/route.ts` — NOUVEAU endpoint DELETE

### Décisions architecturales Sprint 7C:
1. isPublic = SOFT (toggle instantané, droit owner)
2. services/socials/certifications = HORS SCOPE (pas de formulaire dashboard)
3. Approche C snapshot : gallery complète dans pendingData.fields[key="gallery"]
4. Admin merge inchangé : data.gallery = field.newValue (remplacement intégral)
5. TraceUP vidéos RESTENT soft (CLAUDE.md §6.10 inchangé)
6. Cancel pending : reset status → active (si publié) ou incomplete (si jamais publié)
7. Endpoint: DELETE /api/v1/profiles/[profileId]/pending

## Action immédiate nouvelle session

1. Browser test Sprint 7C (scénarios ci-dessous)
2. Si OK → commit + push + tag sprint-7c-complete
3. Si bugs → fix + retest

## Scénarios browser test Sprint 7C

### Workflow principal:
1. Login TechnoFab → /dashboard/brandup (status rejected)
2. Modifier pitch + ajouter image → "Enregistrer et resoumettre" actif
3. Click submit → toast "Profil soumis" → formulaire read-only
4. Vérifier DB: pendingData.fields contient pitch + about + gallery

### Annulation:
5. Click "Annuler la soumission" → toast "Soumission annulée"
6. Formulaire redevient éditable, DB: pendingData=null

### isPublic soft:
7. Toggle off → "Enregistrer visibilité" → sauvé instantanément

### Admin validation:
8. /admin/validation/profiles/[brandup-id] → gallery visible avec "MODIFIÉ"
9. Admin valide → data.gallery remplacé

### Non-régression:
10. /dashboard/traceup → 2 boutons séparés (inchangé)
11. /dashboard/linkup → 2 boutons séparés (inchangé)
12. Ajout vidéo TraceUP → toujours soft (instantané)

## Workflow pour ouvrir nouvelle session Claude Code

"Lis CLAUDE.md, PROJECT_TRANSFERT_v3.md et RESUME_PHASE_NEXT.md.
Sprint 7C est codé mais pas commité ni browser-testé.
Vérifie git status pour voir les fichiers modifiés.
On commence par le browser test Sprint 7C."
