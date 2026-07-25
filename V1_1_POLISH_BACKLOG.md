# V1.1 Polish Backlog

Items deferred from V1 implementation. Each entry includes context,
implementation notes, and estimated effort.

---

## Reset password page — pre-validate token on load

Currently /reset?token=xxx shows the password form even with an invalid
or expired token. The user enters a new password, submits, and only then
sees RESET_TOKEN_INVALID / RESET_TOKEN_EXPIRED. Better UX: validate the
token on page load and show the error immediately.

Implementation:
- Add GET /api/v1/auth/password/validate-token?token=xxx
- Returns 200 if valid, 410 if expired, 400 if invalid
- /reset page does a useEffect fetch on mount, shows loading state
- If invalid → show error state immediately (don't render form)

Estimated effort: 1 hour (new endpoint + Zod + page state update).

Discovered during Phase 2 browser testing (Test 6).

---

## Phase 3 dependency — /dashboard route

During Phase 2 browser testing (Test 1), logging in with an active
company (seed user ahmed@technofab.tn) redirects to /dashboard which
returns 404. This is expected — /dashboard is in Phase 3 scope.

When Phase 3 starts, the dashboard skeleton will resolve this. Until
then, users with status="active" companies will see a 404 after login.

Not a bug, just a phase dependency to track.

---

## CGU hardening — z.literal(true) instead of HTML-only required

Currently CGU acceptance is enforced via HTML `required` attribute on
the checkbox. Can be bypassed by:
- Disabling JS in browser dev tools
- Submitting directly to the API

For V1.1, harden with Zod:
  cguAccepted: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les CGU." })
  })

And update signupUser service to generate acceptedTermsAt = new Date()
only when cguAccepted === true.

Estimated effort: 15 minutes.

---

## jsonError refactor for login route 429 response

login/route.ts currently uses:
  return jsonOk({ error: { code: "RATE_LIMITED", ... } }, 429);

Functionally correct (returns 429 with error body) but stylistically
inconsistent. Refactor to:
  return jsonError("RATE_LIMITED", "Trop de tentatives...", 429);

Estimated effort: 5 minutes.

---

## Forgot route — swallow Zod errors in outer catch

forgot/route.ts outer catch uses handleApiError which leaks Zod
validation errors as 400 ("email is required", etc). Not an
email-enumeration leak (result doesn't depend on account existence)
but exposes the API contract.

For V1.1 zero-info-leak compliance:
  } catch (err) {
    console.error("[forgot] outer error swallowed:", err);
    return jsonOk({ message: STANDARD_MESSAGE });
  }

Estimated effort: 10 minutes.

---

## Mobile bottom sheets — 3 items deferred from C4

Onboarding page mobile dropdowns currently use standard dropdown
behavior instead of slide-up bottom sheet pattern shown in mockup.

Items:
- Country dropdown mobile header ("Choisir un pays" + close button)
- App launcher mobile header ("Produits MARKET-UP" + close button)
- Mobile backdrop overlay (#mobileBackdrop) for both dropdowns

Estimated effort: 2-3 hours (CSS animations + state management).

Discovered during C4 audit. Page remains functional on mobile but
without the canonical UX polish.

---

## Cleanup orphan signups — dev tooling script

During development, testing signup creates "stuck" Users
(emailVerifiedAt=null, < 7 days old). Currently only fixable via manual
MongoDB Compass deletion.

For dev experience, add:
  scripts/cleanup-orphan-signups.ts

A script that:
- Connects to MongoDB
- Finds all Users where emailVerifiedAt=null
- Lists them with createdAt + accountEmail
- Asks for confirmation
- Cascade-deletes the User + their Company

Usage: npm run cleanup:orphans

Estimated effort: 30 minutes.

Note: production cleanup (cron for >7d orphans) tracked separately
for Phase 10.

---

## Storage — Path traversal defense in depth

Origin: Audit b2975ff finding B8.

Current state: LocalStorageAdapter uses options.companyId directly in
key construction. If a malicious companyId like "../../etc" reaches
the adapter, the resolved path would escape the uploads directory.

Risk: LOW. Real protection happens at the API route layer — companyId
is always read from session.user.companyId (verified ObjectId from
JWT), never from request body.

V1.1 hardening (~10 min):
- Add a guard in LocalStorageAdapter.upload() (and other methods
  consuming key):
    if (!/^[a-f0-9]{24}$/.test(options.companyId)) {
      throw new StorageError("Invalid companyId format");
    }
- This is belt-and-suspenders. The API route layer is the primary
  defense, but this prevents any future caller mistake from leaking
  paths.

Commit when implemented:
  fix(storage): defense-in-depth ObjectId validation in LocalAdapter

---

## Storage — Random suffix for collision-resistant keys

Origin: Audit b2975ff finding B3a.

Current state: Keys use YYYY-MM-DD date format. Two uploads of the
same filename on the same day would generate identical keys,
overwriting the first.

Risk: LOW for logo/banner (1 per company), MODERATE for gallery
uploads where users may upload multiple images per session.

V1.1 fix (~5 min):
- Switch from YYYY-MM-DD to a more granular timestamp:
    const ts = Date.now().toString(36); // base36 for shorter string
    const key = `companies/${id}/${cat}/${ts}-${slug}.${ext}`;
- Or use nanoid(8) for 8-char random suffix.

Phase 4 dependency: Implement BEFORE building gallery upload (gallery
needs collision resistance more than single-image fields).

Commit when implemented:
  fix(storage): time-precision + random suffix for collision resistance

---

## Remove unused shadcn deps

shadcn/ui installed deps not used in our app:
- lucide-react (we use Material Symbols)
- next-themes (no dark mode toggle yet)
- @base-ui/react (replaced by our custom components)
- sonner (replaced by our custom Toast)

Run: npm uninstall lucide-react next-themes @base-ui/react sonner
Verify: npm run lint + typecheck stay clean

Estimated effort: 5 minutes (but verify carefully).


### Compteur HARD message
- Actuellement : "Modifications à resoumettre · revalidation admin requise"
- Cible : "X modifications à resoumettre · revalidation admin requise"
- Cohérence avec compteur SOFT qui affiche déjà le nombre
- Fichier : ProfileActionBar.tsx (branches active + rejected + incomplete)

### Tests Vitest manquants Sprint 2
- profile-soft.service: dispatch by kind
- profile-soft.service: cross-tenant guard
- profile-soft.service: gallery reorder with markModified
- profile-soft.schema: strict mode + nested socials validation


### Logo/Banner/Gallery validation-gated cascade
- Currently V1 démo: upload direct (Sprint 4 Option C decision)
- Target V1.1: switch to HARD validation-gated
- Logo/Banner: store in company.pendingUpdates, admin approval required
- Gallery: store new items + deletes in profile.pendingData, admin approval
- Requires Phase 6 admin validation UI (already in scope)
- Files impacted: account/logo route, account/banner route, profiles/gallery routes
- Canon §6.1 to be updated accordingly


---

## Sprint 2 — Profile SOFT mutations

### Tests Vitest manquants
- profile-soft.service: dispatch by kind
- profile-soft.service: cross-tenant guard
- profile-soft.service: gallery reorder with markModified
- profile-soft.schema: strict mode + nested socials validation

Estimated effort: 1-2 hours.

(Note: already mentioned but moving here under proper sprint heading)

### Socials field counter granularity
- Currently: any modification to socials array counts as 1 in dirty counter
  (Option α from C.3 test)
- Discussed alternative β: count each modified URL individually
- Decision V1: Option α (validated by Ahmed)
- V1.1 reconsider if user feedback requests it

---

## Sprint 3 — Profile HARD submit

### Compteur HARD message
- Actuellement : "Modifications à resoumettre · revalidation admin requise"
- Cible : "X modifications à resoumettre · revalidation admin requise"
- Cohérence avec compteur SOFT qui affiche déjà le nombre
- Fichier : ProfileActionBar.tsx (branches active + rejected + incomplete)

Estimated effort: 15 minutes.

### Tests Vitest manquants
- profile-hard.service: submit dispatch + cross-tenant guard
- profile-hard.service: 422 ALREADY_PENDING / PROFILE_DISABLED
- profile-hard.service: pendingData.fields[] structure
- profile-hard.service: rejection cleared on re-submit
- email.service: sendProfileSubmittedEmail (mock Resend)

Estimated effort: 2 hours.

### Email user notifications post-validation
- Currently: only admin gets email when profile submitted
- Phase 6 will add: admin validates/rejects → email user
- "Votre profil X a été validé et est maintenant public"
- "Votre profil X a été refusé. Raison : ..."

Estimated effort: 1 hour (template + send wiring in admin validation flow).

---

## Sprint 4 — Media uploads

### Logo/Banner/Gallery validation-gated cascade
- Currently V1 démo: upload direct (Sprint 4 Option C decision)
- Target V1.1: switch to HARD validation-gated
- Logo/Banner: store in company.pendingUpdates, admin approval required
- Gallery: store new items + deletes in profile.pendingData, admin approval
- Requires Phase 6 admin validation UI (already in scope)
- Files impacted: account/logo route, account/banner route, profiles/gallery routes
- Canon §6.1 to be updated accordingly

Estimated effort: 3-4 hours (across endpoints + admin UI extension).

### Cloudinary orphan cleanup cron
- Currently: when user adds gallery image then cancels, image stays on Cloudinary
- Same risk on logo/banner if user uploads then changes mind
- Solution: daily cron that lists Cloudinary public_ids in marketup/ folder
  and compares with referenced URLs in DB (companies + profiles)
- Delete unreferenced public_ids
- Estimated saving: ~5-10% storage post-démo if users experiment with uploads

Estimated effort: 2 hours (script + cron setup).

### Signup company PDF document upload
- Currently stubbed in signup-entreprise page with {/* DISABLED for V1 */} comment
- Wire to Cloudinary preset marketup_documents
- Endpoint: POST /api/v1/auth/upload-document (or integrate in signup flow)
- Field stored: company.legalDocumentUrl
- Admin reviews PDF during company validation (Phase 6)

Estimated effort: 30-45 minutes.

### Video moderation a posteriori
- Currently: video add = CRUD direct (no admin validation, canon §6.10)
- Risk: user adds inappropriate YouTube/Vimeo/Dailymotion video
- V1.1 solution: admin can DELETE user videos from admin panel
- Notification user: "Cette vidéo a été retirée pour non-conformité"
- Reason field required for admin (audit trail)

Estimated effort: 2 hours (admin UI + delete with reason flow + email).

### oEmbed title auto-fill (optional)
- Currently: user types title manually, oEmbed only fetches thumbnail
- V1.1 option: pre-fill title with oEmbed response, user can edit
- Adds polish but not blocking

Estimated effort: 30 minutes.

### Storage migration to R2 (future)
- Currently Cloudinary (25 GB free, 25 credits/month)
- When approaching limits: migrate to Cloudflare R2
- Both behind StorageAdapter interface (already abstracted)
- Migration = rewrite adapter + bulk transfer existing files
- One-time effort

Estimated effort: 4-6 hours (adapter + migration script + cutover).


### V1.1 — Resend domain verification
- Vérifier un domaine (vivasky.media ou autre) sur resend.com/domains
- Mettre à jour FROM_EMAIL dans .env (passe de onboarding@resend.dev à no-reply@vivasky.media)
- Les emails passent à tous les destinataires
- Effort : 10 min config + 10-30 min propagation DNS

## ✅ RÉSOLU PP-12.6 — Picker carte LinkUP

Nominatim entièrement retiré. Position GPS posée par l'owner via marker
Leaflet draggable dans le dashboard LinkUP (édition live instantanée).
GPS obligatoire pour soumettre un profil LinkUP (guard MISSING_GPS 422).

### Items V1.1 restants (issus de ce bloc) :
- Reverse geocoding au drop du pin (afficher l'adresse trouvée — optionnel UX)
- Bouton Maps sur BrandUP/TraceUP (donnée déjà exposée dans PublicCompanyBase)

## V1.1 — UX

### ✅ RÉSOLU en V1 par PP-11.5 — Exception visibilité pendant pending/rejected
Étendu aux 3 profils (pas seulement LinkUP). Un profil avec publishedAt
renseigné (déjà validé au moins 1 fois) reste visible publiquement avec
ses données validées (data) même pendant status pending ou rejected.
Voir CLAUDE.md §6.2 (matrice 4 cas avec publishedAt).

## V1.1 — Polish UI/UX

### Visibilité & status
- ~~Exception visibilité LinkUP pendant pending~~ → ✅ RÉSOLU PP-11.5 (tous profils)
- Badge StatusPill prend isPublic en compte ("Masqué" si active + !isPublic)

### Admin
- ~~Hub admin unifié /admin/validation/comptes avec onglets~~ ✅ RÉSOLU PP-12 (July 6 2026)
  Page hub /admin/validation avec 4 onglets, 4e compteur companyUpdates, sidebar simplifiée
- Anomalie seed : BuildTech (c-004) et ArchStudio (c-006) ont status "pending" + pendingUpdates — incohérent avec le design PP-7 (pendingUpdates réservé aux actives). Sans impact fonctionnel (filtre active les exclut du hub). À corriger dans un nettoyage seed V1.1.

### SEO & URLs
- ~~Slug management γ : regénération auto + redirect 301 quand displayName change~~ ✅ RÉSOLU PP-12 (July 6 2026)
  Slug régénéré dans approvePendingUpdates, slugHistory[] sur Company, redirect 308/301,
  anti-collision via ensureUniqueSlug $or, retour interne supporté
- ~~Conservation historique slugs (table companySlugHistory)~~ ✅ RÉSOLU PP-12
  Implémenté comme Company.slugHistory[] (array) + index multikey, pas collection séparée

### Localisation
- ~~Cluster localisation en hard change (gouvernorat + ville + adresse)~~ ✅ RÉSOLU PP-12.5 (July 12 2026)
  Ville et adresse rejoignent gouvernorat dans pendingUpdates. Pattern granulaire 3 fields séparés.
  Account.service.ts + schema + AccountForm + 7 nouveaux tests (120/120 green) + audit 19/19.
  Seed MediaCom étendu à 3 fields déménagement complet.
- **Option V1.1 — groupement conditionnel cluster localisation** : afficher les 3 champs
  (gouvernorat + ville + adresse) comme un seul "bloc localisation" dans la diff admin et
  dans le formulaire owner (soumission/approbation groupée). À évaluer si friction terrain
  après pré-prod (owners modifiant souvent les 3 en même temps).
- ~~Picker carte Leaflet~~ → ✅ RÉSOLU PP-12.6
- ~~Retry pattern Nominatim~~ → ❌ OBSOLÈTE (Nominatim retiré PP-12.6)
- ~~Cache résultats Nominatim~~ → ❌ OBSOLÈTE (Nominatim retiré PP-12.6)

### Email rejet — mention visibilité continue
Ajouter une ligne conditionnelle dans le template email de rejet profil
(si publishedAt renseigné) : "votre profil reste visible avec les données
validées précédemment". Chaîne à modifier : admin-profile.service.ts
(passer publishedAt aux params) → sender.ts (signature
sendProfileRejectedEmail) → templates/profile-rejected.ts (paramètre
+ ligne conditionnelle HTML). Reporté de PP-11.5 — cosmétique. Vérifier
profile-validated.ts au passage.

### Code quality
- Warning Mongoose { new: true } → returnDocument: "after" (1 occurrence)
- ~~3 lints pré-existants (profile-editor, public-search unused vars)~~ → ✅ RÉSOLU PP-11.5 (5 lints fixés : 3 documentés + 2 découverts dans profile-hard.service.test.ts)
- Retry pattern TransientTransactionError MongoDB Atlas

### Sécurité sessions
- ~~S8 : owner suspendu garde ses accès API via JWT stateless~~ → ✅ RÉSOLU PP-13 (July 23 2026)
  jwt() callback vérifie company.status sur chaque requête authentifiée. suspended/deleted → session tuée.
- ~~S2 : messages login distinguent email inconnu vs mauvais mdp~~ → ✅ FAUX POSITIF (confirmé audit PP-13)
  Les 3 branches retournent "Email ou mot de passe incorrect." — anti-enumeration conforme.
- Cache TTL court sur le check session jwt() — 2 queries par page load protégée.
  Option V1.1 : cache in-memory TTL 30s sur { passwordChangedAt, company.status } par userId.
  Réduirait les hits DB de ~90% sur les navigations rapides. Non implémenté en V1.

### Recherche & rendu
- Requêtes "à proximité" via index 2dsphere

## V1.1 — UI badges StatusPill cohérence

### Problème détecté
**Source** : smoke PP-9 (28 juin), bug pré-existant depuis Phase 5.
**Pages affectées** : /dashboard/brandup, /dashboard/traceup, /dashboard/linkup

Le badge StatusPill en haut de chaque page profile affiche le `status` 
(Actif/En attente/Refusé/etc.) MAIS ne reflète PAS l'état `isPublic`.

### Conséquence UX
Quand l'owner désactive son profile (toggle isPublic=false) :
- Badge reste "Actif" (vert)
- Mais le profile est invisible publiquement (404)
- Confusion : "Pourquoi mon profile est-il caché alors qu'il est Actif ?"

### Spec V1.1
Hiérarchie des badges (par priorité) :

| status | isPublic | Badge affiché |
|--------|----------|---------------|
| draft | (any) | "Brouillon" (gris) |
| pending | (any) | "En attente" (jaune) |
| rejected | (any) | "Refusé" (rouge) |
| active | true | "Actif" (vert) |
| **active** | **false** | **"Masqué" (gris ou orange clair)** ← NOUVEAU |

### Implémentation
- Composant : StatusPill (chercher le bon nom dans le code)
- Props à ajouter : `isPublic?: boolean`
- Appliquer aux 3 pages dashboard profile
- Aucune modification backend nécessaire (juste UI)

### Effort estimé
- CC : 30-45 min
- Smoke : 5 min (vérifier sur 3 profils)
- Tests Vitest : optionnels (visuel pur)

### PP-11.5 audit UX — Cycle rejected TraceUP (5 juillet)

1. **Banner rejected adapté par kind** — ProfileStatusBlock dit "cliquez
   sur Enregistrer et resoumettre" mais TraceUP n'a pas ce bouton (la
   re-soumission passe par l'ajout de vidéo, auto-transition fix α).
   Ajouter prop `kind` + texte conditionnel TraceUP : "Ajoutez une
   nouvelle vidéo conforme — la soumission sera automatique."
   Fichier : ProfileStatusBlock.tsx.

2. **Badge AJOUT socials (diff admin LinkUP)** — actuellement tout écart
   = MODIFIÉ, même (vide) → URL. Aligner sur gallery (NOUVEAU) et vidéos
   (AJOUT) : si current vide/absent et pending renseigné → AJOUT.
   Fichier : admin/validation/profiles/[profileId]/page.tsx,
   LinkUpContent() condition :355.

3. **previousStatus perdu au reject** — retirer toutes les vidéos pending
   après un cycle reject restaure "rejected" (pas "active"). Si le cas
   d'usage "abandon pur" est demandé : préserver le previousStatus
   original à travers le cycle reject. Complexité M. À évaluer après
   feedback pré-prod. Note : le retour à active via validation admin
   uniquement est un choix défendable (anti-contournement).

4. **Perte du contenu au reject** — rejectProfileByAdmin() efface
   pendingData : si l'owner avait soumis 5 vidéos et qu'une seule posait
   problème, il perd les 5 (URLs à re-saisir). À évaluer : conserver une
   copie du pendingData refusé (champ rejectedData ou historique) pour
   permettre la correction sans re-saisie. Concerne aussi BrandUP/LinkUP
   (même service reject). À croiser avec feedback client pré-prod.
   
   
   ### ✅ RÉSOLU PP-12.6 — GPS position — cycle de vie complet
Nominatim retiré. L'owner pose un pin Leaflet dans le dashboard LinkUP
(édition live instantanée). Le déménagement est résolu : l'owner
déplace son pin quand il veut, sans dépendre de l'approbation admin.

### ✅ RÉSOLU PP-14.5 — Mode "Bientôt disponible" (placeholder public)
Profile.placeholderMode (hidden | coming_soon, default hidden). Quand
isPublic=false + coming_soon + publishedAt renseigné → page minimale
(logo, nom, "Bientôt disponible") au lieu de 404. DTO strict whitelist
(aucune fuite data/socials/coordonnées). Guard publishedAt obligatoire
(pas de placeholder avant validation admin). 3 pages publiques +
3 editors (sous-choix radio sous le toggle). 20 tests, build OK.
Voir CLAUDE.md §6.15.

### Harmoniser conditions disabled toggle isPublic entre les 3 editors
**Source** : audit PP-14.5 (23 juillet 2026).
BrandUpEditor : toggle disabled en `isReadOnly || profile.status !== "active"`
(bloqué en pending + rejected + disabled).
TraceUpEditor : toggle disabled en `isPending || isDisabled` (actif en rejected).
LinkUpEditor : toggle disabled en `isReadOnly` (actif en rejected).
Trois comportements différents. Harmoniser si friction terrain constatée.
Estimé : 15 min.

## Tracking & Analytics

### ✅ LIVRÉ PP-15a — Tracking vues + clics sortants
Collection ProfileStatsMonthly, beacon client, endpoint POST /api/v1/public/track.
200 tests green. Voir CLAUDE.md §6.17.

### PRIORITÉ HAUTE — ProfileHero : tel/whatsapp/email cliquables + tracking clics
Les coordonnées dans ProfileHero (phone, whatsapp, email) sont des `<div>` non
cliquables. Sur mobile, un produit "carte de contact" avec des coordonnées non
cliquables est un défaut UX critique. Rendre cliquables (`<a href="tel:">`,
`<a href="mailto:">`, etc.) et ajouter le tracking clics. Vague 1 post-prod.
Fichiers : ProfileHero.tsx + wiring sendBeacon.
Estimé : 1h.

### Breakdown clics par type (whatsapp/tel/socials/maps)
Actuellement : compteur agrégé clicks. V1.1 : stocker le type de clic
(whatsapp, phone, facebook, etc.) pour analytics granulaires dashboard.
Champ optionnel `target` dans le payload track + stockage par type.
Estimé : 2h.

### Cleanup champ views30d déprécié
Profile.stats.views30d conservé au schéma en PP-15a pour zéro migration.
Retirer du schéma Mongoose + cleanup seed data.
Estimé : 15 min.

### Tracking → lecture par boost/sponsoring dynamiques
Boost.viewsAdded / clicksAdded (boost.model.ts:13-14) existent mais ne
sont jamais incrémentés. Quand le checkout boost sera implémenté, lire
ProfileStatsMonthly pour calculer les vues/clics pendant la période boost.
Estimé : 2h (dépend du sprint boost dynamique).

### Tracker clic PDF reçu RSE (optionnel)
RseSection.tsx:69 a un `<a href={receiptDocumentUrl} target="_blank">`.
Actuellement exclu du tracking (téléchargement de reçu ≠ intention de contact).
Si utile pour analytics RSE, ajouter sendBeacon onClick.
Estimé : 15 min.

## Corbeille admin

### ✅ LIVRÉ PP-15b — Vue Supprimés + fiche consultable + restauration
Onglet "Supprimées" dans /admin/entreprises, fiche detail read-only,
restoreCompanyByAdmin cascade inverse 9 models, match exact timestamp,
E1 pending guard, StatusPill deleted. 210 tests green.

### Purge RGPD J+30 → guard restauration impossible post-purge
Quand la purge physique Cloudinary/S3 sera implémentée (item existant),
ajouter un guard dans restoreCompanyByAdmin : si deletedAt + 30j < now,
refuser la restauration (les fichiers physiques n'existent plus).
Estimé : 15 min.

### Delete par admin (hard flow admin-initiated)
Actuellement seul l'owner peut supprimer son compte. L'admin ne peut que
suspendre. Si besoin : ajouter un endpoint admin DELETE company avec la
même cascade PP-14 mais byRole SUPER_ADMIN + raison obligatoire.
Estimé : 1h.