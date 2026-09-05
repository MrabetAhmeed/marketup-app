# V1.1 Backlog consolide

Consolide le 5 septembre 2026 — fusion du backlog original (37 items) avec les items reportes des chantiers BACKUP-1, STORAGE-1, ROBUSTESSE-1 et de l'audit pre-production.

Items traites retires : R25 (purge orphelins signup — livre BACKUP-1), R33 (Cloudinary orphan cleanup — livre BACKUP-1).

---

## SECURITE ET DURCISSEMENT

### SEC-1 — Rate limit IP sur 3 routes publiques non protegees
**Priorite : bloquant V1.1**
Ajouter un rate limit IP (mecanisme existant `createRateLimit`) sur `POST /auth/signup/user`, `POST /auth/signup/verify-otp` et `POST /auth/password/reset`. Le lockout modele (`otpAttempts >= 5`) protege deja la force brute OTP ; le rate limit IP couvre l'enumeration et le DoS. Chantier SECU-1a prepare et audite, pret a implementer.
Origine : audit pre-production B5.

### SEC-2 — npm audit fix (correctifs non cassants)
**Priorite : bloquant V1.1**
`npm audit` signale 24 vulnerabilites. Les fix non-breaking (brace-expansion, browserslist, nanoid, qs, postcss-selector-parser, js-yaml, body-parser, vite, esbuild, fast-uri, ip-address, hono) se resolvent par `npm audit fix` sans rupture.
Origine : audit pre-production A1.

### SEC-3 — En-tetes HTTP de securite (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
**Priorite : bloquant V1.1**
`next.config.mjs` ne contient aucune section `headers()`. Ajouter les en-tetes essentiels : `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
Origine : audit pre-production B1.

### SEC-4 — Migration next-auth vers Auth.js v5
**Priorite : souhaitable**
NextAuth v4 (4.24.14) est en fin de vie. CVE critique sur la normalisation d'email (GHSA-7rqj) permet un bypass via homoglyphe Unicode. Migration vers Auth.js v5 = chantier majeur avec ruptures.
Origine : audit pre-production A1-d.

### SEC-5 — Migration Next.js 16
**Priorite : souhaitable**
Next.js 14.2.35 accumule 16 CVE high (DoS, SSRF, cache poisoning). La migration vers Next 16 est un chantier majeur avec ruptures (App Router changes, postcss, etc.).
Origine : audit pre-production A1-d.

### SEC-6 — Content-Security-Policy complet
**Priorite : souhaitable**
CSP header complet. Complexe avec Next.js (inline scripts, nonces).
Origine : audit pre-production B1-c.

### SEC-7 — Permissions-Policy
**Priorite : opportuniste**
Restreindre l'acces camera/micro/geolocation via Permissions-Policy header.
Origine : audit pre-production B1-b.

### SEC-8 — Rate limit sur la recherche publique
**Priorite : opportuniste**
Les 3 routes `/search/*` n'ont aucun rate limit. Permet le scraping de masse. Faible priorite tant que le volume est bas.
Origine : audit pre-production B5-d.

### SEC-9 — Migration du rate limiting vers stockage partage
**Priorite : opportuniste**
Le rate limiting est in-memory (`Map`), reset au restart, mono-instance. Migrer vers Redis quand le trafic le justifiera.
Origine : audit pre-production B5-e.

### SEC-10 — Fermer l'ouverture reseau sur les clusters Atlas
**Priorite : souhaitable**
Les clusters Atlas dev, preprod et backup sont en acces reseau ouvert (`0.0.0.0/0`). Restreindre aux IPs du serveur Infomaniak et des postes de dev.
Origine : audit pre-production D3.

### SEC-11 — Retirer les domaines d'images de demo de remotePatterns
**Priorite : opportuniste**
`api.dicebear.com` et `picsum.photos` dans `next.config.mjs` sont des residus du seed. Confirme : aucun code applicatif ne les utilise. Les retirer reduit la surface d'attaque.
Origine : audit pre-production D3-1.

### SEC-R6 — Forgot route : catch exterieur leake ZodError
**Priorite : souhaitable**
`forgot/route.ts` : le catch exterieur utilise `handleApiError` qui retourne 400 sur ZodError. Pas un leak d'enumeration mais expose le contrat API. Fix : swallow + retour 200 standard.
Origine : backlog original R6. Effort : 10 min.

### SEC-R8 — CGU hardening z.literal(true)
**Priorite : souhaitable**
Acceptation CGU = HTML required + `acceptedTermsAt` programmatique. Aucune validation server-side Zod. Fix : ajouter `cguAccepted: z.literal(true)` dans `SignupUserSchema`.
Origine : backlog original R8. Effort : 15 min.

### SEC-R21 — Storage path traversal defense-in-depth
**Priorite : opportuniste**
Aucun guard ObjectId dans `src/lib/storage/`. Risque LOW (companyId vient de la session). Fix : valider le format ObjectId avant de construire le path.
Origine : backlog original R21. Effort : 10 min.

---

## ERGONOMIE ET ROBUSTESSE

### ERG-1 — Pages admin de validation : 404 propre sur identifiant inconnu
**Priorite : bloquant V1.1**
Les 3 pages admin (`comptes/[companyId]`, `profiles/[profileId]`, `rse/[receiptId]`) laissent remonter `NotFoundError` et `BusinessRuleError` en erreur serveur. Intercepter avec try/catch + `notFound()`. Cas particulier RSE : `NOT_PENDING` = recu deja traite, afficher un etat dedie (pas un 404).
Origine : ROBUSTESSE-1 signalement + audit pre-production C. Effort : 30 min.

### ERG-2 — loading.tsx absents dans public, auth et admin
**Priorite : souhaitable**
Les pages publiques `[slug]` font un fetch serveur `force-dynamic`. Si la DB est lente, ecran blanc. Les pages auth et admin n'ont pas de skeleton non plus (sauf `admin/transactions`).
Origine : ROBUSTESSE-1 E1/E2/E3.

### ERG-3 — Metadonnees absentes sur la page session-expired
**Priorite : opportuniste**
Pas de `<title>` defini sur `src/app/session-expired/page.tsx`. Page transitoire, impact negligeable.
Origine : ROBUSTESSE-1 E4.

### ERG-R1 — ProfileHero : coordonnees non cliquables
**Priorite : bloquant V1.1**
Tel, WhatsApp, email sont des `<div>` non cliquables. Sur mobile, defaut UX critique pour un produit "carte de contact". Fix : `<a href="tel:">`, `<a href="https://wa.me/">`, `<a href="mailto:">`.
Origine : backlog original R1. Effort : 1h.

### ERG-R2 — Admin video TraceUP : lien cliquable vers la source
**Priorite : souhaitable**
L'admin voit la miniature mais ne peut pas visionner la video (pas de lien vers YouTube/Vimeo/Dailymotion).
Origine : backlog original R2. Effort : 15 min.

### ERG-R3 — StatusPill : kind "Masque" pour active + !isPublic
**Priorite : souhaitable**
Le badge reste "Actif" quand l'owner desactive son profil. Ajouter kind "hidden" avec la bonne hierarchie.
Origine : backlog original R3. Effort : 30 min.

### ERG-R4 — Banner rejected adapte par kind (TraceUP)
**Priorite : souhaitable**
Le message "cliquez sur Enregistrer et resoumettre" ne correspond pas au workflow TraceUP (re-soumission auto via ajout video).
Origine : backlog original R4. Effort : 15 min.

### ERG-R5 — Compteur HARD numerique
**Priorite : souhaitable**
`ProfileActionBar` affiche "Modifications a resoumettre" sans compteur, alors que le compteur SOFT le fait.
Origine : backlog original R5. Effort : 15 min.

### ERG-R10 — Harmoniser conditions disabled toggle isPublic
**Priorite : souhaitable**
3 comportements differents entre BrandUpEditor, TraceUpEditor, LinkUpEditor pour le toggle isPublic.
Origine : backlog original R10. Effort : 15 min.

### ERG-R12 — Email rejet : mention visibilite continue
**Priorite : souhaitable**
L'email de rejet ne mentionne pas que le profil reste visible avec les donnees validees (le dashboard le fait).
Origine : backlog original R12. Effort : 30 min.

### ERG-R13 — oEmbed title auto-fill
**Priorite : souhaitable**
L'owner doit taper le titre manuellement alors que la reponse oEmbed contient `title`.
Origine : backlog original R13. Effort : 30 min.

### ERG-R16 — Badge AJOUT socials diff admin LinkUP
**Priorite : opportuniste**
Tout ecart social = "MODIFIE" meme pour un ajout (vide -> URL). Devrait etre "AJOUT".
Origine : backlog original R16. Effort : 30 min.

### ERG-R17 — previousStatus perdu au reject TraceUP
**Priorite : opportuniste**
Retirer toutes les videos pending apres un cycle reject restaure "rejected" pas "active". Design decision a evaluer apres feedback pre-prod.
Origine : backlog original R17.

### ERG-R18 — Perte pendingData au reject
**Priorite : opportuniste**
`rejectProfileByAdmin()` efface pendingData. L'owner perd toutes ses modifications (URLs a re-saisir). Option : conserver rejectedData pour correction.
Origine : backlog original R18.

### ERG-R19 — Groupement conditionnel cluster localisation
**Priorite : opportuniste**
Grouper gouvernorat + ville + adresse en bloc dans la diff admin et le formulaire owner.
Origine : backlog original R19. Effort : 30 min.

### ERG-R22 — Reverse geocoding au drop du pin
**Priorite : opportuniste**
`MapPicker.tsx` pose le pin mais n'affiche pas l'adresse trouvee. Optionnel UX.
Origine : backlog original R22. Effort : 1h.

### ERG-R23 — Bouton Maps sur BrandUP/TraceUP public
**Priorite : opportuniste**
`ServicesGrid` est uniquement dans `LinkUpPublic.tsx`. BrandUp et TraceUp n'exposent pas les liens sociaux ni le lien Maps.
Origine : backlog original R23. Effort : 30 min.

### ERG-R24 — Mobile bottom sheets onboarding
**Priorite : opportuniste**
Dropdowns onboarding = standard dropdown. Le mockup montre un slide-up bottom sheet sur mobile.
Origine : backlog original R24. Effort : 2-3h.

---

## PERFORMANCE

### PERF-1 — Double appel base dans les pages de profil public
**Priorite : souhaitable**
`generateMetadata` et le rendu appellent chacun `getPublicProfileBySlug` — deux requetes DB identiques par page view. Next.js deduplique `fetch()` mais pas les appels directs aux services. Fix : wrapper `cache()`.
Origine : ROBUSTESSE-1 E5.

### PERF-2 — Assertions non-null dans les pages de profil
**Priorite : opportuniste**
`data!` utilise 3 fois par page `[slug]`. Le flow est correct mais fragile. Un early return apres `notFound()` eliminerait le besoin.
Origine : ROBUSTESSE-1 E6.

### PERF-R27 — Cache TTL court check session jwt()
**Priorite : souhaitable**
2 queries DB par page load protegee (`passwordChangedAt` + `company.status`). Cache in-memory TTL 30s reduirait ~90% des hits.
Origine : backlog original R27. Effort : 1h.

### PERF-R28 — Retry TransientTransactionError MongoDB Atlas
**Priorite : opportuniste**
Pas de retry pattern sur les transactions Mongoose. Atlas peut retourner `TransientTransactionError` en cas de conflit.
Origine : backlog original R28. Effort : 1h.

### PERF-C2 — Recherche in-memory ne scale pas
**Priorite : opportuniste**
`public-search.service.ts` charge toutes les companies puis filtre en JS. Fonctionne en V1 (<1000 companies). Migrer vers `$text` index ou `$regex` MongoDB si croissance.
Origine : backlog original C2. Effort : 2-3h.

---

## STOCKAGE

### STO-1 — Deplacer le document legal hors de signup-temp a la fin de l'inscription
**Priorite : souhaitable**
Le document legal reste dans le prefix `signup-temp/` apres l'inscription. Il devrait etre deplace vers le prefix definitif de l'entreprise.
Origine : STORAGE-1.

### STO-2 — Invalidation du cache CDN a la suppression d'un document confidentiel
**Priorite : souhaitable**
Quand un document confidentiel est supprime de Cloudinary, le CDN peut continuer a le servir depuis son cache.
Origine : STORAGE-1.

### STO-3 — Stocker le public_id plutot que l'URL signee dans identityDocumentUrl
**Priorite : souhaitable**
L'URL complete est stockee en base. Si le CDN ou le cloud name change, toutes les URLs sont invalides. Stocker le `public_id` et reconstruire l'URL a la lecture.
Origine : STORAGE-1.

### STO-4 — Catalogue des associations RSE : fige au seed
**Priorite : souhaitable**
L'admin ne peut ni ajouter ni modifier une association depuis l'interface. Le catalogue est entierement fige au seed. Si une nouvelle association doit etre ajoutee, il faut modifier le seed et inserer en base manuellement.
Origine : audit PP-17.

### STO-R20 — Storage collision resistance
**Priorite : opportuniste**
`cloudinary.ts` : key = `YYYY-MM-DD-slug` sans random suffix. Deux uploads du meme fichier le meme jour ecrasent le premier. Fix : ajouter un suffix aleatoire.
Origine : backlog original R20. Effort : 5 min.

### STO-R37 — Storage migration R2
**Priorite : opportuniste**
Cloudinary actif (25 GB free). `r2-adapter.ts` existe non cable. Migration quand les limites approchent.
Origine : backlog original R37. Effort : 4-6h.

---

## EXPLOITATION

### OPS-1 — Restauration de test mensuelle
**Priorite : souhaitable**
La restauration de test doit etre planifiee mensuellement et tracee. La comparaison des comptages ne detecte pas un document corrompu — seule une restauration reelle valide la chaine.
Origine : BACKUP-1.

### OPS-2 — Re-smoke du backup apres bascule sur la base de production
**Priorite : bloquant V1.1**
Le backup doit etre re-teste apres le changement d'URI, de cluster et de droits pour la base de production.
Origine : BACKUP-1.

### OPS-3 — Alerte en cas d'echecs repetes de la purge signup-temp
**Priorite : souhaitable**
Aujourd'hui un simple avertissement console. Devrait declencher une notification admin apres N echecs consecutifs.
Origine : STORAGE-1.

### OPS-4 — Proposer le passage Atlas M10 au client en V1.2
**Priorite : opportuniste**
Backups natifs Atlas, restauration a la minute (PITR), ressources dediees. A evaluer quand le trafic le justifie.
Origine : audit PP-17.

### OPS-5 — Migrer les tests hors d'Atlas
**Priorite : souhaitable**
Les tests utilisent `mongodb-memory-server` mais certains tests d'integration touchent Atlas. La contention sur le cluster partage cause des flaky tests.
Origine : audit pre-production.

### OPS-6 — .env.example incomplet
**Priorite : bloquant V1.1**
3 variables manquantes : `BACKUP_MONGODB_URI`, `BACKUP_CRON_SECRET`, `SIGNUP_TEMP_MAX_AGE_DAYS`. Un nouveau deploiement n'a aucun fichier de reference complet.
Origine : audit pre-production D3-4. Effort : 5 min.

### OPS-7 — Section securite des dependances dans DEPLOY.md
**Priorite : souhaitable**
Documenter la regle : ne jamais mettre a jour une dependance publiee depuis moins de 7 jours, consulter les avis de securite avant toute montee de version, privilegier `npm ci`.
Origine : audit pre-production C1 (min-release-age non supporte par npm).

---

## EVOLUTIONS

### EVO-1 — Espace Parametres medias dans l'admin (ADD-1)
**Priorite : souhaitable**
2 images d'onboarding + 3 bannieres par defaut, editables depuis l'interface admin. Aujourd'hui fichiers statiques dans `public/`. Effort estime : ~3 jours.
Origine : audit pre-production.

### EVO-2 — Changement du mot de passe administrateur
**Priorite : bloquant V1.1**
L'administrateur ne peut pas changer son mot de passe — ni depuis l'interface (aucune page `/admin/settings`), ni par email (forgot password ne cherche que dans `UserModel`), ni par script. Le seul moyen est un `updateOne` en base. Deux options : route API + page admin settings (~1h30) ou script CLI minimal (~30 min).
Origine : audit PP-17 C3.

### EVO-R26 — Breakdown clics par type
**Priorite : opportuniste**
Compteur clicks agrege. Stocker le type de clic (whatsapp, phone, facebook) pour analytics granulaires dashboard.
Origine : backlog original R26. Effort : 2h.

### EVO-R29 — Requetes "a proximite" geo-search
**Priorite : opportuniste**
Index 2dsphere existe mais aucune query `$geoNear` dans le code. A cabler si search geo V1.1.
Origine : backlog original R29. Effort : 2h.

### EVO-R31 — Delete par admin (hard flow admin-initiated)
**Priorite : souhaitable**
Actuellement seul l'owner peut supprimer. L'admin ne peut que suspendre. Ajouter endpoint admin DELETE company (cascade PP-14 + raison obligatoire).
Origine : backlog original R31. Effort : 1h.

### EVO-R36 — Boost viewsAdded/clicksAdded cablage
**Priorite : opportuniste**
Champs existent mais jamais incrementes. Depend du sprint boost dynamique.
Origine : backlog original R36. Effort : 2h.

---

## NETTOYAGE

### CLN-R7 — Login route jsonError refactor
**Priorite : opportuniste**
`login/route.ts:14` utilise `jsonOk({ error: ... }, 429)` au lieu de `jsonError(...)`. Fonctionnellement correct mais stylistiquement incoherent.
Origine : backlog original R7. Effort : 5 min.

### CLN-R11 — Remove unused shadcn deps
**Priorite : souhaitable**
`package.json` contient 4 deps inutilisees : `lucide-react`, `next-themes`, `@base-ui/react`, `sonner`. Fix : `npm uninstall` + verify build.
Origine : backlog original R11. Effort : 5 min.

### CLN-R14 — Cleanup champ views30d deprecie
**Priorite : opportuniste**
`profile.model.ts:75` : views30d conserve pour zero migration PP-15a. 8 usages dans tests + services.
Origine : backlog original R14. Effort : 15 min.

### CLN-R15 — Mongoose { new: true } warning
**Priorite : opportuniste**
`account.service.ts:165` utilise `{ new: true }` au lieu de `returnDocument: "after"`. 1 occurrence.
Origine : backlog original R15. Effort : 5 min.

### CLN-C1 — ServicesGrid ternaire mort
**Priorite : opportuniste**
`ServicesGrid.tsx:99` : `const Tag = s.external ? "a" : "a"` — ternaire qui retourne toujours "a".
Origine : backlog original C1. Effort : 1 min.

### CLN-R34 — Anomalie seed BuildTech/ArchStudio
**Priorite : opportuniste**
c-004 et c-006 ont status "pending" + pendingUpdates — incoherent. Sans impact fonctionnel mais confus pour le debug.
Origine : backlog original R34. Effort : 15 min.

---

## TESTS

### TST-R30 — Tests Vitest profile-soft
**Priorite : souhaitable**
4 cas manquants : dispatch by kind, cross-tenant guard, gallery reorder markModified, strict mode + nested socials validation.
Origine : backlog original R30. Effort : 1-2h.

### TST-R32 — Purge RGPD J+30 guard restauration
**Priorite : opportuniste**
`restoreCompanyByAdmin` n'a pas de guard temporel. Quand la purge physique sera implementee, refuser la restauration si `deletedAt + 30j < now`.
Origine : backlog original R32. Effort : 15 min.

### TST-R35 — Tracker clic PDF recu RSE (optionnel)
**Priorite : opportuniste**
`RseSection.tsx:69` a un `<a>` vers le PDF sans tracking.
Origine : backlog original R35. Effort : 15 min.
