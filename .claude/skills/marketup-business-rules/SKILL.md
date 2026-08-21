# MARKET-UP — Business Rules (§6.10–6.30)

> Extracted from CLAUDE.md. These rules are fully implemented and tested.
> Load this skill when working on any feature that touches the subjects below.

---

## 6.10 TraceUP videos

Hybrid hard/soft — additions require admin review (`pendingData`), deletions are instant (soft). Deletions blocked during pending.

## 6.11 Slug lifecycle

Regeneration on displayName change + 301 redirect via `slugHistory`. `SlugRedirectError` extends `Error` (not `AppError`).

## 6.12 Admin validation hub

Single page `/admin/validation` with 4 tabs (Inscriptions · Modifications comptes · Profils · RSE), `?tab=` deep-linkable.

## 6.13 Session invalidation

`passwordChangedAt` check in jwt() callback + S8 fix (suspended/deleted companies lose sessions). Fail-open on DB unreachable.

## 6.15 Placeholder mode

`placeholderMode` enum `"hidden" | "coming_soon"` for `isPublic: false` profiles. Requires `publishedAt` set. Placeholder DTO is a strict whitelist (no data leak).

## 6.16 Account deletion + suspension

Owner self-delete cascades across 9 models (soft-delete). Admin suspend requires reason. Slugs remain reserved forever.

## 6.17 Tracking stats (PP-15a)

Collection `ProfileStatsMonthly` (profileId + month YYYY-MM, unique index). Vues comptees par beacon client `<TrackView>` au mount reel (dedup sessionStorage, guard StrictMode). Clics sortants via `sendBeacon` sur ServicesGrid (s.external only). Endpoint `POST /api/v1/public/track` public, 204 always, bot filter UA, rate limit 60/min. `Profile.stats.viewsTotal/clicksTotal` incrementes en $inc parallele. `views30d` deprecie (conserve au schema, retire des DTO). Dashboard lit `ProfileStatsMonthly` mois courant + mois-1 pour tendance.

## 6.18 Corbeille admin (PP-15b)

Onglet "Supprimees" dans `/admin/entreprises`, fiche detail consultable read-only pour les companies deleted (`withDeleted: true`). `restoreCompanyByAdmin()` = cascade inverse symetrique (9 models, match exact `deletedAt: cascadeTimestamp`, transaction Mongoose). E1: company jamais validee (`validatedAt null`) restauree en "pending". Profils retrouvent leur status exact d'avant (la cascade PP-14 n'ecrit que `deletedAt`, jamais `status`). Endpoint `POST /admin/companies/[id]/restore`. Email dedie "company-restored". StatusPill kind "deleted".

## 6.19 Sponsoring dynamique (C2)

Workflow a etats : `pending` (demande owner) → `confirmed` (admin valide) → `active` (owner paie, from=paidAt, to=+7j) → `expired` (lazy). Terminaux : `rejected` (admin, raison obligatoire), `cancelled` (owner, pending/confirmed seulement — aucune annulation apres paiement V1). Guard anti-doublon : 1 seul sponsoring en pending|confirmed|active par (companyId, profileKind) → 409. rejected/cancelled/expired liberent le slot. Eligibilite demande : company active + profil du kind active+isPublic → sinon 422. Banniere publique : rotation aleatoire serveur parmi actifs du kind, mention "Sponsorise". Banniere defaut HTML/CSS quand aucun actif. Stats : impressions ($inc serveur au rendu SSR, fail-silent) + clics (sendBeacon sponsor_click → track endpoint, $inc fail-silent). Hub admin : onglet Sponsorings dans validation (5e tab), apercu banniere, lien cliquable, actions valider/refuser. Notifs : sponsoring_request_submitted (admin), sponsoring_validated (owner), sponsoring_rejected (owner), sponsoring_paid (admin+owner). 3 emails dedies + sendTransactionAdminEmail generique au paiement. Flag OFF : endpoints owner 403, admin accessible (lecture + valider/refuser).

## 6.20 Notification actions (FB-2)

3 endpoints owner — `PATCH /me/notifications/read-all`, `PATCH /me/notifications/[id]/read`, `DELETE /me/notifications/[id]` (soft-delete). Tous requireOwner + cross-tenant guard strict (recipientId === session userId). UI optimiste (state local) sur la page + les cards. La cloche admin est un compteur de taches pending (pas de read/delete).

## 6.21 Signup frontiere passwordHash (FB-2)

A l'inscription, un user existant non verifie est ecrase SI il n'a PAS de passwordHash (etape 1 seule — le compte n'appartient a personne). Un user AVEC passwordHash (etape 2 faite) est refuse ("Cet email est deja utilise. Connectez-vous."). Au login, un user sans passwordHash recoit INVALID_CREDENTIALS generique (anti-enumeration). Le code SIGNUP_IN_PROGRESS est supprime.

## 6.22 Forgot-password non verifie (FB-2)

`forgotPassword` envoie le lien si le user a un passwordHash, MEME si emailVerifiedAt est null. `resetPassword` pose emailVerifiedAt + cree les 3 profils via `ensureProfilesForCompany` (idempotent, E11000-safe) si le user etait non verifie. `ensureProfilesForCompany` est la fonction partagee utilisee par verifyOtp, login (lazy filet) et resetPassword.

## 6.23 Obfuscation email support (FB-2)

L'email de support (`manager@vivasky.media`) n'apparait JAMAIS en clair dans le HTML source des pages rendues. Composant `<ObfuscatedEmail />` (client, assemble user+domain au mount via JS). Constante dans `src/lib/constants/support-email.ts`. Les emails HTML (templates Nodemailer) conservent l'email en clair (pas d'obfuscation dans un email).

## 6.24 Secteurs referentiel definitif (FB-5)

50 secteurs (25 B2B en 7 poles, 25 B2C en 8 groupes). Model Sector a 3 nouveaux champs : `group` (libelle du pole), `groupOrder` (tri des poles), `description` (texte entre parentheses). Le seed remplace integralement les anciens secteurs. Le modal picker `SectorPickerModal` remplace le dropdown de selection : titres de poles NON cliquables, items numerotes avec description, recherche interne. Gouvernorats tries alphabetiquement. Les secteurs suivent l'ordre des poles du client (PAS alphabetique).

## 6.25 Recherche refonte (FB-3)

Resultats affiches au chargement (auto-fetch au mount, limit 200). Pagination client 8/page (retour page 1 a chaque recherche). Secteur integre dans la barre de recherche (a cote de la ville). Liste "Populaire" retiree. Padding haut conserve, bas reduit. Ville + gouvernorat ajoutes au haystack texte des 3 moteurs (cherchable sans placeholder). Placeholders : BrandUP "Entreprise, secteur, activite..." · TraceUP "Entreprise, secteur, titre de video..." · LinkUP "Entreprise, contact, secteur...". Banniere sponsor filtre par `appliedSectorId` (apres recherche validee, pas au changement de filtre). Hauteur banniere h-[180px] md:h-[270px].

## 6.26 Timbre fiscal (FB-6)

`FISCAL_STAMP_DT = 1` (non soumis a la TVA). `computeTTC(priceHT, vatRate, fiscalStampDT)` — 3e param optionnel (default 0, retrocompat). Transaction.fiscalStampDT (Number, default 0). Boost = 50 HT + 9,50 TVA + 1 timbre = 60,50 TTC. Sponsoring = 100 HT + 19 TVA + 1 timbre = 120 TTC. Affichage : ligne "Timbre fiscal" dans les modals de checkout, billing owner, admin transactions. Retrocompat : transactions anciennes (stamp 0) n'affichent pas la ligne. Aucun montant hardcode dans les UI — tout derive des constantes pricing.

## 6.27 Visuels et finitions (FB-8)

Cards de recherche : boosted = etoile doree en overlay (rond, coin haut-droit), RSE = texte vert "RSE attestee" (remplace le pill gold). Badge RSE public : icone ESG (`public/badges/esg-icon.svg`, fill #1A2B8C) + libelle HTML "ENGAGEMENT SOCIAL ATTESTE" bleu marine a cote (responsive). Texte RSE : "Nous contribuons activement a la vie locale...". RseSection au canon (font-bold, rounded-xl, pas de gradient). Carte : tiles CARTO Light (`basemaps.cartocdn.com/light_all`). Admin : liens sociaux cliquables dans la fiche de validation (target=_blank + open_in_new). Notification in-app au refus RSE (`rse_receipt_rejected`, kind+icon+color coherents).

## 6.28 Motif de refus pendingUpdates (FB-7b)

`rejectPendingUpdates` exige un `rejectionNote` (min 3 caracteres). Le motif est stocke dans `Company.lastPendingRejection { note, rejectedAt }` (visible au owner via MeResponse, jamais dans un DTO public) ET dans `auditTrail.details.note`. Le champ `lastPendingRejection` est efface (`null`) a la prochaine soumission de modifications par l'owner. Le refus d'inscription (compte) reste inchange (motif dans `Company.rejectedReason`).

## 6.29 Notifications/emails validation compte (FB-7b)

`approvePendingUpdates` et `rejectPendingUpdates` envoient notification in-app (`account_updates_approved` / `account_updates_rejected`) + email au owner. Les deux sont non-bloquants (try/catch). Les emails listent les labels des champs concernes. Le refus inclut le motif.

## 6.30 Document legal remplacable (FB-7b)

`Company.identityDocumentUrl` est remplacable via `pendingUpdates` (key `"identityDocumentUrl"`). Upload via `POST /api/v1/me/legal-document` (requireOwner, PDF/JPG/PNG, 2 Mo, categorie storage `identity-docs`). Coexistence : l'ancien reste dans `identityDocumentUrl`, le nouveau dans `pendingUpdates.fields[].newValue`. Approbation : le nouveau remplace l'ancien. Refus : `storage.delete(newUrl)` best-effort, l'ancien demeure.
