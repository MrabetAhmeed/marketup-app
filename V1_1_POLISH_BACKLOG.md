# V1.1 Polish Backlog

Purgé le 26 juillet 2026 — audit read-only complet (18 items livrés/obsolètes retirés).
Items restants reformulés avec preuve verbatim et priorité.

---

## Priorité haute

### R1 — ProfileHero : coordonnées non cliquables

Tel, WhatsApp, email sont des `<div>` non cliquables dans `ProfileHero.tsx:82-98`.
Sur mobile, un produit "carte de contact" avec des coordonnées non cliquables est un
défaut UX critique.

Implementation:
- `<a href="tel:...">` pour phone
- `<a href="https://wa.me/...">` pour whatsapp
- `<a href="mailto:...">` pour email
- Ajouter tracking sendBeacon onClick (comme ServicesGrid)

Fichiers: `ProfileHero.tsx`
Effort: 1h

---

### R2 — Admin vidéo TraceUP : lien cliquable vers la source

L'admin voit la miniature des vidéos pending/publiées mais ne peut pas visionner
la vidéo source (pas de `<a href>` vers YouTube/Vimeo/Dailymotion).
Confirmé: `admin/validation/profiles/[profileId]/page.tsx:266-320` — uniquement
`<img>` + texte, aucun lien sortant.

Implementation:
- Ajouter `<a href={v.url} target="_blank">` sur les cartes vidéo (pending + publiées)
- Icon "open_in_new" sur la miniature

Fichier: `admin/validation/profiles/[profileId]/page.tsx`
Effort: 15 min

---

### R3 — StatusPill : kind "Masqué" pour active + !isPublic

`StatusPill.tsx` n'a pas de prop `isPublic`. Quand l'owner désactive son profil
(toggle isPublic=false), le badge reste "Actif" vert alors que le profil est invisible.

Implementation:
- Ajouter kind "hidden" ou prop `isPublic` à StatusPill
- Hiérarchie : disabled > incomplete > pending > rejected > active+!isPublic ("Masqué") > active
- Appliquer aux 3 pages dashboard profile + OverviewProfiles

Fichier: `StatusPill.tsx` + 3 editors + `OverviewProfiles.tsx`
Effort: 30 min

---

## Priorité moyenne

### R4 — Banner rejected adapté par kind (TraceUP)

`ProfileStatusBlock.tsx:100` dit "cliquez sur Enregistrer et resoumettre" pour tous
les kinds. TraceUP n'a pas ce bouton (re-soumission = ajout vidéo auto-transition).

Implementation:
- Ajouter prop `kind` à ProfileStatusBlock
- TraceUP: "Ajoutez une nouvelle vidéo conforme — la soumission sera automatique."

Fichier: `ProfileStatusBlock.tsx` + 3 editors (passer kind)
Effort: 15 min

---

### R5 — Compteur HARD numérique

`ProfileActionBar.tsx:185` affiche "Modifications à resoumettre" sans compteur.
Le compteur SOFT affiche déjà le nombre. Incohérence.

Cible: "X modifications à resoumettre · revalidation admin requise"
Fichier: `ProfileActionBar.tsx`
Effort: 15 min

---

### R6 — Forgot route : catch extérieur leake ZodError

`forgot/route.ts:26-29` swallow interne OK. Mais le catch extérieur L35-37 utilise
`handleApiError(err)` qui retourne 400 sur ZodError (body invalide). Pas un leak
d'enumeration mais expose le contrat API.

Fix: remplacer L35-37 par swallow + retour 200 standard.
Fichier: `auth/password/forgot/route.ts`
Effort: 10 min

---

### R7 — Login route jsonError refactor

`login/route.ts:14` utilise `jsonOk({ error: ... }, 429)` au lieu de `jsonError(...)`.
Fonctionnellement correct mais stylistiquement incohérent.

Fix: `return jsonError("RATE_LIMITED", "Trop de tentatives...", 429);`
Fichier: `auth/login/route.ts`
Effort: 5 min

---

### R8 — CGU hardening z.literal(true)

Acceptation CGU = HTML required + `acceptedTermsAt` envoyé programmatiquement
(`signup/user/page.tsx:66`). Aucune validation server-side Zod.

Fix: ajouter `cguAccepted: z.literal(true)` dans `auth.schema.ts` SignupUserSchema.
Fichier: `schemas/auth.schema.ts` + `signup/user/page.tsx`
Effort: 15 min

---

### R9 — Reset password : pre-validate token on load

/reset?token=xxx affiche le formulaire meme avec token invalide/expiré. L'erreur
n'apparait qu'au submit.

Implementation:
- Endpoint GET /api/v1/auth/password/validate-token?token=xxx (200/410/400)
- Page /reset: useEffect fetch on mount, loading state, error state si invalide

Effort: 1h

---

### R10 — Harmoniser conditions disabled toggle isPublic

3 comportements differents (audit PP-14.5, 23 juillet 2026):
- BrandUpEditor: `isReadOnly || profile.status !== "active"` (bloqué en pending+rejected)
- TraceUpEditor: `isPending || isDisabled` (actif en rejected)
- LinkUpEditor: `isReadOnly` (actif en rejected)

Effort: 15 min

---

### R11 — Remove unused shadcn deps

`package.json` contient 4 deps inutilisées:
- lucide-react (L29) — on utilise Material Symbols
- next-themes (L33) — pas de dark mode
- @base-ui/react (L21) — remplacé par composants custom
- sonner (L41) — remplacé par Toast custom

Fix: `npm uninstall lucide-react next-themes @base-ui/react sonner` + verify build
Effort: 5 min

---

### R12 — Email rejet : mention visibilité continue

`sendProfileRejectedEmail` (`sender.ts:106-111`) ne reçoit pas `publishedAt`.
Le template ne mentionne pas que le profil reste visible avec les données validées.
Le dashboard (`ProfileStatusBlock.tsx:102-106`) le fait, mais l'email non.

Fix: passer `publishedAt` aux params, conditionner dans template.
Fichiers: `admin-profile.service.ts` + `sender.ts` + `templates/profile-rejected.ts`
Effort: 30 min

---

### R13 — oEmbed title auto-fill

`oembed.ts:43` lit `thumbnail_url` mais ignore `title` de la réponse oEmbed.
L'owner doit taper le titre manuellement.

Fix: retourner `{ thumbnailUrl, title }` depuis fetchVideoMetadata, pre-fill dans le formulaire.
Fichier: `lib/video/oembed.ts` + formulaire vidéo TraceUpEditor
Effort: 30 min

---

### R14 — Cleanup champ views30d déprécié

`profile.model.ts:75` : views30d conservé pour zero migration PP-15a.
8 usages dans tests + `auth.service.ts:325,420`.

Fix: retirer du schema + nettoyer seed data + tests.
Effort: 15 min

---

### R15 — Mongoose { new: true } warning

`account.service.ts:165` utilise `{ new: true }` au lieu de `returnDocument: "after"`.
1 occurrence.

Effort: 5 min

---

## Priorité basse / design decisions

### R16 — Badge AJOUT socials diff admin LinkUP

Admin validation LinkUP: tout ecart social = "MODIFIÉ" meme si (vide) -> URL.
Devrait etre "AJOUT" comme gallery et vidéos.

Fichier: `admin/validation/profiles/[profileId]/page.tsx` (LinkUpContent)
Effort: 30 min

---

### R17 — previousStatus perdu au reject TraceUP

Retirer toutes les vidéos pending après un cycle reject restaure "rejected" pas "active".
Si l'owner abandonne, il reste bloqué en rejected. Design decision: préserver le
previousStatus original à travers le cycle reject.

Complexité: M. A évaluer après feedback pré-prod.

---

### R18 — Perte pendingData au reject

rejectProfileByAdmin() efface pendingData. Si l'owner avait soumis 5 vidéos et qu'une
seule posait problème, il perd les 5 (URLs à re-saisir). Concerne aussi BrandUP/LinkUP.

Option: conserver rejectedData pour correction sans re-saisie.
Complexité: M. A évaluer après feedback pré-prod.

---

### R19 — Groupement conditionnel cluster localisation

Afficher gouvernorat + ville + adresse comme un seul "bloc localisation" dans la diff
admin et le formulaire owner (soumission/approbation groupée).
A évaluer si friction terrain (owners modifiant souvent les 3 en meme temps).

Effort: 30 min

---

### R20 — Storage collision resistance

`cloudinary.ts:93-100` : key = `YYYY-MM-DD-slug` sans random suffix. Deux uploads
du meme fichier le meme jour ecrasent le premier.

Fix: ajouter `Date.now().toString(36)` ou `nanoid(8)` dans le key.
Effort: 5 min

---

### R21 — Storage path traversal defense-in-depth

Aucun guard ObjectId dans `src/lib/storage/`. Si un companyId malformé atteint
l'adapter, le path pourrait s'échapper. Risque LOW (companyId vient de la session).

Fix: `if (!/^[a-f0-9]{24}$/.test(options.companyId)) throw`
Effort: 10 min

---

### R22 — Reverse geocoding au drop du pin

`MapPicker.tsx` pose le pin mais n'affiche pas l'adresse trouvée. Optionnel UX.
Effort: 1h

---

### R23 — Bouton Maps sur BrandUP/TraceUP public

`ServicesGrid` est uniquement dans `LinkUpPublic.tsx`. BrandUpPublic et TraceUpPublic
n'exposent pas les liens sociaux ni le lien Maps.

Effort: 30 min

---

### R24 — Mobile bottom sheets onboarding

Dropdowns onboarding = standard dropdown. Mockup montre slide-up bottom sheet pattern
sur mobile (country + app launcher).

Effort: 2-3h

---

### R25 — Cleanup orphan signups script

Dev tooling: `scripts/cleanup-orphan-signups.ts` pour supprimer les Users
emailVerifiedAt=null créés pendant les tests.

Effort: 30 min

---

### R26 — Breakdown clics par type

Compteur clicks agrégé. V1.1: stocker le type de clic (whatsapp, phone, facebook, etc.)
pour analytics granulaires dashboard. Champ `target` dans le payload track.

Effort: 2h

---

### R27 — Cache TTL court check session jwt()

2 queries DB par page load protégée (passwordChangedAt + company.status).
Cache in-memory TTL 30s par userId réduirait ~90% des hits.

Effort: 1h

---

### R28 — Retry TransientTransactionError MongoDB Atlas

Pas de retry pattern sur les transactions Mongoose. Atlas peut retourner
TransientTransactionError en cas de conflit.

Effort: 1h

---

### R29 — Requetes "a proximite" geo-search

Index 2dsphere existe (`company.model.ts:139`) mais aucune query `$geoNear` dans le
code. Recherche = regex in-memory (`public-search.service.ts`). A cabler si search geo V1.1.

Effort: 2h

---

### R30 — Tests Vitest profile-soft Sprint 2

4 cas manquants: dispatch by kind, cross-tenant guard, gallery reorder markModified,
strict mode + nested socials validation. Aucun fichier `profile-soft.service.test.ts`.

Effort: 1-2h

---

### R31 — Delete par admin (hard flow admin-initiated)

Actuellement seul l'owner peut supprimer. L'admin ne peut que suspendre.
Ajouter endpoint admin DELETE company (cascade PP-14 + raison obligatoire).

Effort: 1h

---

### R32 — Purge RGPD J+30 guard restauration

`restoreCompanyByAdmin` n'a pas de guard temporel. Quand la purge physique
Cloudinary/S3 sera implementée, refuser la restauration si deletedAt + 30j < now.

Effort: 15 min

---

### R33 — Cloudinary orphan cleanup cron

Upload puis annulation = image orpheline sur Cloudinary. Script daily qui compare
les public_ids avec les URLs en DB.

Effort: 2h

---

### R34 — Anomalie seed BuildTech/ArchStudio

c-004 et c-006 ont status "pending" + pendingUpdates — incohérent (pendingUpdates
réservé aux actives). Sans impact fonctionnel mais confus pour le debug.

Effort: 15 min

---

### R35 — Tracker clic PDF recu RSE (optionnel)

`RseSection.tsx:69` a un `<a>` vers le PDF sans tracking. Ajouter sendBeacon si
analytics RSE utile.

Effort: 15 min

---

### R36 — Boost viewsAdded/clicksAdded cablage

`boost.model.ts:13-14` : champs existent mais jamais incrementés. Depend du sprint
boost dynamique (checkout + lecture ProfileStatsMonthly pendant période boost).

Effort: 2h

---

### R37 — Storage migration R2

Cloudinary actif (25 GB free). `r2-adapter.ts` existe non cable. Migration quand
limites approchent. StorageAdapter interface deja abstraite.

Effort: 4-6h

---

### R38 — Resend domain verification

Config DevOps: vérifier domaine sur resend.com/domains, mettre a jour FROM_EMAIL
(.env), propagation DNS.

Effort: 10 min config + 30 min DNS

---

## Constat supplementaire (decouvert pendant l'audit)

### C1 — ServicesGrid ternaire mort

`ServicesGrid.tsx:99` : `const Tag = s.external ? "a" : "a"` — ternaire qui retourne
toujours "a". Cleanup trivial.

Effort: 1 min

---

### C2 — Recherche in-memory ne scale pas

`public-search.service.ts` charge toutes les companies puis filtre en JS avec
`buildAndRegex()`. Pas de `$regex` ni `$text` MongoDB. Fonctionne en V1 (<1000
companies). A migrer vers `$text` index ou `$regex` MongoDB si croissance.

Effort: 2-3h
