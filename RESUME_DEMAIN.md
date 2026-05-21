# RESUME DEMAIN — Sprint 6.2C

> Dernière mise à jour : 2026-05-21
> Dernier commit : 36bab4e (wip, non testé en browser)

---

## 1. État actuel

| Check | Status |
|---|---|
| typecheck | 0 erreur |
| lint | warnings cosmétiques uniquement |
| tests | 34/34 green |
| commit | `36bab4e` pushé sur `origin/main` |
| browser test | PAS ENCORE FAIT |

### Fichiers livrés Sprint 6.2C (22 fichiers : 12 MOD + 10 NEW)

**NEW :**
- `src/app/(admin)/admin/entreprises/page.tsx` — admin company directory
- `src/app/(dashboard)/dashboard/account/edit/page.tsx` — user correction form (rejected flow)
- `src/app/api/v1/admin/companies/route.ts` — GET admin companies list
- `src/app/api/v1/admin/companies/[companyId]/suspend/route.ts` — POST suspend
- `src/app/api/v1/admin/companies/[companyId]/reactivate/route.ts` — POST reactivate
- `src/app/api/v1/me/account/resubmit/route.ts` — POST resubmit after rejection
- `src/components/features/account/CompanyEditForm.tsx` — client form for correction
- `src/lib/email/templates/company-resubmitted.ts` — email template
- `src/schemas/account-resubmit.schema.ts` — Zod schema
- `src/services/account-resubmit.service.ts` — service layer

**MOD :**
- `src/middleware.ts` — ajout header `x-current-path`
- `src/app/(dashboard)/layout.tsx` — gating strict rejected users
- `src/app/(admin)/admin/validation/comptes/[companyId]/page.tsx` — boutons suspend/reactivate
- `src/app/(admin)/admin/validation/profiles/[profileId]/page.tsx` — améliorations
- `src/app/(auth)/login/page.tsx` — messages erreur auth améliorés
- `src/components/features/admin/AdminSidebar.tsx` — lien entreprises
- `src/lib/auth-error-messages.ts` — messages erreur enrichis (suspended, etc.)
- `src/lib/email/sender.ts` — Resend skip en dev
- `src/services/admin-company.service.ts` — suspend/reactivate logic
- `src/services/admin-profile.service.ts` — améliorations
- `src/services/auth.service.ts` — check suspended at login
- `V1_1_POLISH_BACKLOG.md` — mise à jour backlog

---

## 2. Workflow de reprise

### Étape 1 — Browser test E2E

Lancer `npm run dev` puis tester ces scénarios :

**A. Flow User Rejected (TechnoFab BrandUP = rejected)**
1. Login ahmed@technofab.tn → doit arriver sur `/dashboard`
2. Si company.status === "rejected" → redirect auto vers `/dashboard/account/edit?reason=rejected`
3. Tenter `/dashboard/brandup` manuellement → redirect vers `/dashboard/account/edit?reason=rejected`
4. Sur `/dashboard/account/edit` → formulaire de correction affiché
5. Soumettre correction → POST `/api/v1/me/account/resubmit` → company passe en `pending`
6. Après resubmit → redirect vers `/dashboard` (plus bloqué car status = pending)

**B. Flow Admin Suspend/Reactivate**
1. Login bassem@vivasky.media (admin)
2. `/admin/entreprises` → liste des companies visible
3. Cliquer une company active → bouton "Suspendre" visible
4. Suspendre → company.status = "suspended"
5. Réactiver → company.status = "active"

**C. Flow Admin Validation Comptes**
1. `/admin/validation/comptes` → liste des comptes pending
2. Cliquer un compte → page détail avec approve/reject

**D. Login suspended user**
1. Suspendre une company via admin
2. Tenter login avec cet owner → message erreur "compte suspendu"

### Étape 2 — Si tout OK
```bash
git commit --amend -m "feat(phase-6-sprint-2c): user correction + admin suspend/reactivate + gating"
git push --force-with-lease origin main
```
Ou faire un nouveau commit propre selon préférence.

### Étape 3 — Tag phase 6 complete
```bash
git tag phase-6-complete
git push origin phase-6-complete
```

---

## 3. Décisions importantes Sprint 6.2C

| Décision | Choix | Raison |
|---|---|---|
| Gating user rejected | Option A — whitelist stricte | Seul `/dashboard/account/edit` accessible, tout le reste redirect |
| Header x-current-path | Injecté par middleware, lu par layout via `headers()` | Seul moyen fiable pour server components de connaître le pathname |
| Canon suspended | TechnoFab reste "rejected" dans seed, pas "suspended" | Suspended est un état admin-only post-activation |
| Resend skip en dev | `sender.ts` skip l'envoi si `NODE_ENV !== "production"` et pas de clé Resend | Évite les erreurs en dev local |
| Login blocked suspended | `auth.service.ts` vérifie company.status au login | Retourne erreur spécifique "ACCOUNT_SUSPENDED" |

---

## 4. Phase suivante : Phase 5 — Pages publiques

Selon le build order CLAUDE.md §9, la phase 5 couvre :

- `/(public)/*` — pages publiques BrandUP, TraceUP, LinkUP
- Search APIs — `GET /api/v1/search/brandup`, `/traceup`, `/linkup`
- Profile pages — `/(public)/brandup/[slug]`, `/traceup/[slug]`, `/linkup/[slug]`
- Popup components — `<BrandUpPopup>`, `<TraceUpPopup>`, `<LinkUpPopup>`

Mockups de référence :
- `public_brandup.html`, `public_traceup.html`, `public_linkup.html`
- `public_brandup_technofab-industries.html` (et variantes traceup/linkup)
- `public_*_popup_technofab-industries.html`

---

## 5. Rappel — Fichiers à ne PAS supprimer

- `RESUME_DEMAIN.md` (ce fichier) — supprimer après reprise confirmée
- `V1_1_POLISH_BACKLOG.md` — backlog polish actif
- `BROWSER_TEST_PROTOCOL.md` — protocole de test (si existant)
