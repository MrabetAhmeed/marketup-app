# Deploiement — Infomaniak (conteneur RAM-limite)

> Procedure officielle. Mise a jour : aout 2026.

---

## Procedure de deploiement

1. **`git pull`** — operation legere, OK en SSH
2. **Si `package.json` / `package-lock.json` ont change** : `npm ci` (via le Builder, pas en SSH interactif)
3. **Build** : via le **BUILDER du dashboard Infomaniak** (commandes `npm ci && npm run build`) — **JAMAIS en session SSH interactive**
4. **Restart** du service via le dashboard

### Pourquoi pas en SSH ?

L'ancienne methode (install/build en session SSH) a cause 5 incidents documentes :
- Sessions SSH tuees en cours de `npm ci` / `npm run build`
- `node_modules` laisse dans un etat incoherent (`.bin/` absent)
- Fichiers corrompus provoquant un SIGBUS au build

**Cause de fond :** le conteneur Infomaniak (stockage CephFS reseau + limites de session) ne supporte pas les operations longues en SSH interactif.

**Si une operation longue est necessaire en SSH** (ex: `rm -rf node_modules`) : utiliser `nohup` ou `tmux`. Ne jamais lancer en interactif — risque de kill apres 15-25 min sur CephFS.

---

## Parametres memoire (obligatoires)

Le conteneur dispose de **~1.5 Go RAM**. Sans ces garde-fous, `next build` SIGABRT (OOM).

| Parametre | Valeur | Ou |
|---|---|---|
| `experimental.cpus` | `1` | `next.config.mjs` — limite les workers de static generation a 1 thread |
| `NODE_OPTIONS` | `--max-old-space-size=1536` | variable d'environnement serveur (build + start) |

**Rationale :** Next.js lance par defaut autant de workers que de CPU logiques. Sur un conteneur mutualise avec peu de RAM, chaque worker consomme ~300-500 Mo → OOM. `cpus: 1` force un seul worker. `--max-old-space-size=1536` plafonne le heap V8 sous la limite conteneur.

**Impact local :** le build est legerement plus lent (~+30 %) car mono-worker. Le runtime (`next start`, `next dev`) est **inchange**.

---

## MongoDB URI

La chaine `MONGODB_URI` doit etre en forme **SANS `+srv`** (resolution SRV peu fiable selon les reseaux). Utiliser la forme directe `mongodb://` avec les hosts explicites. Ce point s'applique aussi en production.

---

## Pas de CI/CD automatise en V1

Deploiement manuel via le dashboard Infomaniak. Le Builder fait office de "CI" minimaliste (il execute les commandes configurees et bloque si le build echoue).

---

## Lancer l'application contre un autre environnement

`npm run dev` charge `.env.local` via le mecanisme standard de Next.js. Pour pointer sur `.env.preprod` (ou tout autre fichier) sans toucher a `.env.local` :

```bash
npm run dev:preprod
```

Le script wrapper (`scripts/dev-with-env.mjs`) :
1. Lit et parse le fichier d'env (gere les URI avec `=` dans les valeurs, les commentaires `#`, les guillemets).
2. Injecte les variables dans `process.env`.
3. Force `NODE_ENV=development` — necessaire car `next dev` refuse de compiler le CSS si `NODE_ENV=production`.
4. Affiche la base ciblee au demarrage pour verification visuelle.
5. Lance `next dev` avec `stdio: "inherit"` (logs, HMR et Ctrl+C fonctionnent normalement).

Au demarrage, le wrapper affiche :

```
=== dev-with-env ===
  Env file : .env.preprod
  Database : marketup_preprod
  Host     : ac-xxxxx-shard-00-00.abc.mongodb.net:27017
  NODE_ENV : development (forced)
====================
```

**Verification :** si `Database` et `Host` ne correspondent pas a la base preprod attendue, l'app pointe encore sur la mauvaise base. Le mot de passe et l'URI complete ne sont jamais affiches.

Pour cibler un autre fichier d'env ponctuellement :

```bash
node scripts/dev-with-env.mjs .env.staging
```

---

## Backup quotidien (BACKUP-1)

### Architecture

- **Sauvegarde** : copie driver Node pur, collection par collection, de la base prod vers un cluster Atlas separe.
- **Cible** : cluster `backup` (variable `BACKUP_MONGODB_URI`, forme longue sans `+srv`, **sans** nom de base).
- **Nom de base** : `backup_YYYYMMDD` (date UTC du jour).
- **Retention** : 7 jours glissants. Les bases `backup_XXXXXXXX` plus anciennes sont supprimees automatiquement.
- **Purge des orphelins** : apres le backup, suppression hard des inscriptions abandonnees (2 paliers).
- **Sequentiel strict** : si le backup echoue, la purge n'est PAS executee.

### Fuseau horaire

Toutes les dates de backup sont en **UTC**. Le planificateur doit etre programme a **2h UTC** (= 3h Tunis) pour executer le backup pendant les heures creuses.

### Variables d'environnement

| Variable | Format | Obligatoire | Note |
|---|---|---|---|
| `BACKUP_MONGODB_URI` | `mongodb://user:pass@host:27017,...?ssl=true&...` | Oui (pour backup) | Forme longue, **sans nom de base** |
| `BACKUP_CRON_SECRET` | String longue aleatoire | Oui (pour route) | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SIGNUP_TEMP_MAX_AGE_DAYS` | Entier >= 0 | Non (defaut: 7) | Age minimum (jours) des fichiers signup-temp avant purge. Mettre a `0` pour purge immediate lors d'un test ponctuel, puis supprimer la variable. |

Si `BACKUP_MONGODB_URI` est vide, le job echoue explicitement (jamais de succes silencieux).

### Declenchement

**Route API** : `GET /api/v1/cron/backup?secret=<BACKUP_CRON_SECRET>`

- Reponse 202 immediate (fire-and-forget), execution en arriere-plan.
- Codes : 202 started, 409 deja en cours, 401 secret invalide, 500 config manquante.
- Le secret est accepte via en-tete `Authorization: Bearer <secret>` ou query param `?secret=<secret>`.

**CLI** (pour smoke ou si le planificateur n'est pas disponible) :

```bash
# Avec .env.local (dev)
npm run backup

# Avec un autre fichier d'env (preprod, prod)
npx tsx --env-file=.env.preprod scripts/backup.ts
```

### Planificateur Infomaniak

1. Ajouter une tache planifiee de type "Appel d'URL" dans le dashboard.
2. URL : `https://vivasky.media/api/v1/cron/backup?secret=<BACKUP_CRON_SECRET>`
3. Heure : **02:00 UTC** (verifier le fuseau du planificateur).
4. **Verifier le premier backup le lendemain** dans Atlas (base `backup_YYYYMMDD` + document `current` dans `marketup_backup_meta.runs`).

### Trace et meta

Le cluster de backup contient une base **`marketup_backup_meta`**, collection `runs`, document `_id: "current"`. Ce document contient :
- `running` / `runningStartedAt` : flag anti-concurrence (timeout 2h).
- `lastRun` : resultat complet du dernier job (date, duree, comptages, purge, erreur).

Consultable directement dans Atlas > `marketup-backup` > `marketup_backup_meta` > `runs`.

---

## Fiche de restauration d'urgence

> A suivre sous pression, sans reflechir.

### Pre-requis

- Acces SSH au conteneur (pour lancer le script).
- `BACKUP_MONGODB_URI` et `MONGODB_URI` configures dans le fichier d'env cible.
- `RESTORE_ALLOWED=1` en variable shell.

### Procedure

```bash
# 1. Se connecter en SSH au conteneur
ssh ...

# 2. Verifier les backups disponibles (dry-run)
RESTORE_ALLOWED=1 npx tsx --env-file=.env.local scripts/restore.ts

# 3. Choisir le backup, taper le nom exact (ex: backup_20260828)
#    Le script affiche les collections et comptages, puis s'arrete (dry-run).

# 4. Executer la restauration
RESTORE_ALLOWED=1 npx tsx --env-file=.env.local scripts/restore.ts --execute

# 5. Taper le nom exact de la base cible pour confirmer.
```

### Apres la restauration

1. **Vider les cookies** `next-auth.*` dans le navigateur (ou fenetre privee) — un JWT stale provoque des 401.
2. **Verifier** que l'application charge correctement.
3. **Verifier** les compteurs de facturation dans la collection `counters` (recalcules automatiquement).
4. **Attention** : `syncIndexes()` supprime les index absents des schemas Mongoose. Si un index a ete cree manuellement dans Atlas, il aura disparu.

### Important

- La **restauration test doit etre planifiee mensuellement** et tracee (la comparaison des comptages ne detecte pas un document corrompu — seule une restauration reelle valide la chaine).
- Le backup doit etre **re-smoke apres la bascule vers la base de production** (changement d'URI, de cluster et de droits).
- Un orphelin deja soft-deleted echappe a la purge des inscriptions (cas marginal, non traite — a ne pas laisser silencieux).

---

## En-tetes HTTP de securite (HEADERS-1)

Configures dans `next.config.mjs` section `headers()`, appliques a toutes les routes (`/:path*`).

| En-tete | Valeur | Role |
|---|---|---|
| `Strict-Transport-Security` | `max-age=300` | Force le navigateur a utiliser HTTPS pendant la duree indiquee |
| `X-Frame-Options` | `DENY` | Interdit l'affichage du site dans un iframe (protection clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Empeche le navigateur de deviner le type MIME d'un fichier |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite l'URL transmise aux sites tiers a l'origine seule |

### HSTS — procedure d'allongement

**Cet en-tete est memorise par le navigateur du visiteur.** Une valeur trop longue ne peut pas etre annulee cote serveur. Le visiteur devra attendre l'expiration. C'est le seul reglage de ce projet qui a un effet persistant cote client.

**Progression :**

| Palier | Duree | Quand passer |
|---|---|---|
| `300` (5 min) | Premier deploiement | Valeur actuelle |
| `3600` (1 h) | Apres 24h sans incident HTTPS en production | |
| `86400` (1 jour) | Apres 1 semaine sans incident | |
| `31536000` (1 an) | Apres 1 mois sans incident — valeur definitive | |

**Avant chaque palier, verifier :**

1. Le certificat TLS est valide et se renouvelle automatiquement (Infomaniak gere le renouvellement Let's Encrypt)
2. Toutes les pages repondent en HTTPS : page publique, dashboard, admin, route `/cgu_cgv.html`
3. Aucune ressource mixte (HTTP) n'apparait dans la console navigateur (onglet Console + Network)
4. Les sous-domaines (`static.vivasky.media`, `lifeup.vivasky.media`, `test.vivasky.media`) ne sont **PAS inclus** — pas de `includeSubDomains`, car ils sont hors de notre controle
5. Pas de `preload` — l'inscription dans les listes de preload des navigateurs est irreversible a court terme

**Pour changer :** modifier la constante `HSTS_MAX_AGE` dans `next.config.mjs`, rebuild, deployer.

### Verification des en-tetes

Apres chaque deploiement, verifier la presence des 4 en-tetes :

```bash
curl -I https://vivasky.media/
```

Les 4 en-tetes doivent apparaitre dans la reponse. Verifier aussi sur une page protegee et sur la route CGU :

```bash
curl -I https://vivasky.media/brandup
curl -I https://vivasky.media/cgu_cgv.html
```

### Ce qui reste au backlog

- **Content-Security-Policy** : politique complete de securite du contenu. Complexe a configurer avec Next.js (scripts inline, nonces). Backlog V1.1 (SEC-6).
- **Permissions-Policy** : restreindre l'acces camera/micro/geolocation. Backlog V1.1 (SEC-7).

---

## Seed de production (PP-17)

### Premier deploiement — procedure dans l'ordre

1. Creer la base `marketup_prod` dans Atlas (cluster, utilisateur, whitelist IP).
2. Configurer `MONGODB_URI` dans le gestionnaire d'environnement Infomaniak (forme longue sans `+srv`).
3. Executer le seed de production :
   ```bash
   npm run db:seed-prod
   ```
   Le script demande le mot de passe admin en saisie masquee si `ADMIN_INITIAL_PASSWORD` n'est pas dans l'environnement.
4. Le script demande confirmation, affiche le nom de la base cible, puis cree les referentiels + l'admin.
5. **Vider les cookies** `next-auth.*` (ou fenetre privee).
6. Se connecter avec `manager@vivasky.media` et le mot de passe choisi.

### Commande selon le contexte

| Contexte | Commande |
|---|---|
| Poste Ahmed, test contre preprod | `npx tsx --env-file=.env.preprod scripts/seed-prod.ts` |
| Serveur de test (Infomaniak) | `npm run db:seed-prod` (variables Infomaniak, base de developpement) |
| Production (Infomaniak) | `npm run db:seed-prod` (variables Infomaniak, base `marketup_prod`) |

> **Attention : base partagee entre le poste local et le serveur de test.**
> Le serveur de test (`test.vivasky.media`) pointe sur la **meme base de developpement** que le poste local. Un `db:seed` ou `db:reset` lance en local reinitialise donc aussi ce que le client voit sur `test.vivasky.media`. C'est le comportement voulu — la base de dev n'est pas protegee — mais il faut le savoir pour ne pas etre surpris.

### Variables d'environnement du seed de production

| Variable | Obligatoire | Note |
|---|---|---|
| `MONGODB_URI` | Oui | URI de la base cible |
| `ADMIN_INITIAL_PASSWORD` | Non | Si absent et stdin est interactif, le script demande une saisie masquee. Si absent et stdin non interactif, le script echoue. |

### Mot de passe : ne pas exposer dans l'historique du terminal

**Ne jamais taper** `ADMIN_INITIAL_PASSWORD="..." npx tsx ...` en ligne de commande — le mot de passe resterait dans l'historique du shell.

Methodes sures :
- **Saisie interactive** : lancer `npm run db:seed-prod` sans definir la variable. Le script demande le mot de passe en saisie masquee.
- **Variable d'environnement deja definie** : dans le gestionnaire Infomaniak, la variable est injectee sans passer par l'historique.

**Si le mot de passe a deja ete tape dans l'historique** — purger :

```bash
# Bash
history -d $(history | grep ADMIN_INITIAL_PASSWORD | awk '{print $1}') && history -w

# Zsh
fc -W  # sauvegarde l'historique
sed -i '/ADMIN_INITIAL_PASSWORD/d' ~/.zsh_history
fc -R  # recharge
```

### Gardes de securite

Le seed de production refuse de s'executer si :
- Le mot de passe est absent (en env comme en saisie) ou trop court (< 10 caracteres)
- stdin n'est pas interactif et `ADMIN_INITIAL_PASSWORD` est absent
- La base contient deja des entreprises, profils ou transactions (protection contre l'ecrasement)

Le seed de production est **idempotent** sur les referentiels : une seconde execution ne cree pas de doublons. Elle met a jour les valeurs existantes. Comportements specifiques en seconde execution :

- **Referentiels** (gouvernorats, secteurs, association) : mis a jour via upsert, "0 new" affiche.
- **Admin** : le mot de passe est **re-hashe et ecrase** a chaque execution, meme si identique. Message "password updated".
- **Compteur de facturation** : utilise `$setOnInsert` — si le compteur existe deja, sa valeur `seq` est **preservee**. Le compteur n'est jamais remis a zero. Seule la garde B1 (refus si donnees metier presentes) empeche une execution sur une base ou le compteur aurait avance.

### Protocole de smoke

Comment tester le seed de production sans risque :

1. **Sur le poste local, contre la base preprod :**
   ```bash
   npx tsx --env-file=.env.preprod scripts/seed-prod.ts
   ```
   Le script demande le mot de passe en saisie masquee, puis confirme la base cible.

2. **Verifier dans Atlas** : 24 gouvernorats, 50 secteurs, 1 association, 1 admin, 1 counter.

3. **Verifier les protections :**

| Test | Comment | Resultat attendu |
|---|---|---|
| B1 — base peuplee | Creer une company manuellement, relancer | Refus "already contains business data" |
| B2 — idempotence | Lancer deux fois sur la meme base vide | Seconde execution : "0 new" partout |
| B3 — confirmation | Lancer normalement | Prompt interactif avec nom de base |
| B4 — password faible | Saisir un mot de passe < 10 car. | Refus "too weak" |
| B4 — stdin non interactif | `echo "" \| npm run db:seed-prod` | Refus "no interactive terminal" |
| C2 — garde nom seed | `MONGODB_URI=...marketup_prod... ALLOW_DESTRUCTIVE_SEED=true npm run db:seed` | Refus "protected list" |
| C2 — garde nom reset | Idem avec `db:reset` | Refus "protected list" |
| Garde 1 — env absent | `npm run db:seed` sans `ALLOW_DESTRUCTIVE_SEED` | Refus "not set to true" |

### Changement du mot de passe administrateur

**Deux methodes disponibles :**

**1. Via `db:seed-prod` (methode recommandee, avant l'ouverture uniquement) :**

Le seed de production met a jour le mot de passe admin a chaque execution (upsert : "password updated"). C'est le **seul** moyen scripte de changer ce mot de passe.

**Attention :** cette methode n'est disponible que **tant que la base ne contient aucune donnee metier** (0 companies, 0 profils, 0 transactions). Des qu'une entreprise s'inscrit, la garde B1 bloque le script. Relancer le seed avec un mot de passe different le **change silencieusement** — aucune confirmation supplementaire n'est demandee. Verifier le mot de passe avant de valider.

**2. Procedure manuelle dans Atlas (apres l'ouverture) :**

1. Generer un hash bcrypt (12 rounds) du nouveau mot de passe :
   ```bash
   node -e "require('bcryptjs').hash('NouveauMotDePasse', 12).then(h => console.log(h))"
   ```
2. Dans Atlas, collection `adminusers`, modifier le document `email: "manager@vivasky.media"` :
   - Remplacer le champ `passwordHash` par la valeur generee.
3. Vider les cookies `next-auth.*` et se reconnecter.

---

## Protection des scripts destructifs

### Deux gardes cumulatives

Les scripts `db:seed` (seed de demonstration) et `db:reset` (reinitialisation) **suppriment toutes les collections**. Ils sont proteges par deux gardes independantes et cumulatives :

| Garde | Mecanisme | Message de refus |
|---|---|---|
| **Garde 1 : opt-in environnement** | `ALLOW_DESTRUCTIVE_SEED=true` doit etre present | "ALLOW_DESTRUCTIVE_SEED is not set" |
| **Garde 2 : nom de base protege** | Le nom extrait de `MONGODB_URI` ne doit pas etre dans la liste protegee | "database X is in the protected list" |

**Bases protegees :** `marketup_prod`, `preprod`.

Les deux gardes sont **cumulatives** : meme si `ALLOW_DESTRUCTIVE_SEED=true`, le script refuse de toucher a une base protegee. Meme si la base n'est pas protegee, le script refuse sans la variable d'opt-in.

### Cas le plus dangereux

Si quelqu'un execute le script depuis sa machine locale avec le fichier d'environnement de production :
- **Garde 1** bloque : `ALLOW_DESTRUCTIVE_SEED` n'a aucune raison de figurer dans un `.env` de production.
- **Garde 2** bloque : le nom `marketup_prod` est dans la liste protegee.

Les deux gardes declenchent, le script s'arrete avant toute connexion a la base.

### Ajouter une base a la liste protegee

Modifier la constante `PROTECTED_DATABASES` en haut de `scripts/seed.ts` et `scripts/reset.ts`.

---

## Pages legales — routes proxy configurables (LEGAL-1)

Cinq URL publiques servent les documents legaux heberges sur `static.vivasky.media`. Chaque route recupere le fichier distant, le proxie au visiteur, et affiche une page de repli en cas d'indisponibilite.

### URL publiques

| URL | Variable d'environnement | Valeur par defaut |
|---|---|---|
| `/cgu_cgv.html` | *(aucune — figee pour le prestataire de paiement)* | `https://static.vivasky.media/cgu_cgv.html` |
| `/mentions-legales` | `MENTIONS_LEGALES_SOURCE_URL` | `https://static.vivasky.media/cgu_cgv.html#mentions-legales` |
| `/cgu` | `CGU_SOURCE_URL` | `https://static.vivasky.media/cgu_cgv.html#cgu` |
| `/cgv` | `CGV_SOURCE_URL` | `https://static.vivasky.media/cgu_cgv.html#cgv` |
| `/confidentialite` | `CONFIDENTIALITE_SOURCE_URL` | `https://static.vivasky.media/cgu_cgv.html#confidentialite` |

### Fragment automatique

Si l'URL de configuration contient un fragment (`#section`), le proxy :
1. Retire le fragment avant la requete HTTP sortante (les fragments ne transitent pas sur le reseau).
2. Injecte un script de defilement dans le HTML recu pour positionner le navigateur sur la section.
3. Journalise un avertissement si l'identifiant est absent du document (la page s'affiche normalement en haut).

### ATTENTION — guillemets obligatoires dans les fichiers .env

`dotenv` traite le caractere `#` comme un commentaire en ligne. **Sans guillemets, le fragment est silencieusement supprime** et le defilement ne fonctionne pas.

```bash
# FAUX — le fragment #cgu est supprime silencieusement :
CGU_SOURCE_URL=https://static.vivasky.media/cgu_cgv.html#cgu

# CORRECT — les guillemets preservent le fragment :
CGU_SOURCE_URL="https://static.vivasky.media/cgu_cgv.html#cgu"
```

Les valeurs par defaut (codees dans `env.ts`) ne sont pas affectees par ce probleme — elles contiennent les fragments. Ce piege ne se manifeste que lorsqu'on surcharge une variable dans `.env.local` ou `.env.prod`.

### Basculer d'un fichier unique a des fichiers separes

Quand le client livre des fichiers separes (par ex. `cgu.html`, `cgv.html`) :

1. Modifier les variables d'environnement :
   ```
   CGU_SOURCE_URL=https://static.vivasky.media/cgu.html
   CGV_SOURCE_URL=https://static.vivasky.media/cgv.html
   ```
   (sans fragment — pas besoin de guillemets)

2. Rebuild et redemarrer. **Aucune modification de code necessaire.**

### Basculer de fichiers separes a un fichier unique

Remettre les URL avec `#fragment` pointant vers le fichier combine. **Guillemets obligatoires.** Rebuild et redemarrer.

---

## Modifications manuelles en base : ce qui est sur et ce qui ne l'est pas

> Guide pour Ahmed, pour les operations directes dans Atlas.

### Associations (collection `associations`)

| Operation | Sur ? | Detail |
|---|---|---|
| Ajouter une association | Oui | Respecter le modele ci-dessous. Le `slug` doit etre unique. |
| Modifier le nom, la description, le domaine | Oui | Effet immediat : tous les recus RSE afficheront le nouveau nom (pas d'historique par recu). |
| Mettre `active: false` | Oui | L'association disparait du dropdown de declaration de don. Les recus existants restent intacts et affichent le nom. |
| Supprimer un document | **DANGEREUX** si des recus RSE y font reference. Les recus afficheront "Association inconnue" ou "Inconnue". Utiliser `active: false` a la place. |

**Modele d'un document Association valide** (pour saisie manuelle dans Atlas) :

```json
{
  "slug": "nom-court-unique",
  "name": {
    "fr": "Nom complet en francais",
    "ar": "",
    "en": ""
  },
  "logoUrl": null,
  "description": {
    "fr": "Description de l'association.",
    "ar": "",
    "en": ""
  },
  "domain": {
    "fr": "Domaine d'action",
    "ar": "",
    "en": ""
  },
  "website": "https://example.org",
  "causes": ["cause1", "cause2"],
  "accreditationDocumentUrl": null,
  "accreditedSince": null,
  "active": true
}
```

Champs obligatoires : `slug` (unique), `name.fr`. Tout le reste a des valeurs par defaut.

### Gouvernorats (collection `gouvernorats`)

| Operation | Sur ? | Detail |
|---|---|---|
| Ajouter un gouvernorat | Oui | Respecter : `slug` (unique), `name.fr` (requis), `order` (pour le tri). |
| Modifier le nom | Oui | Effet immediat sur les recherches et le dropdown. |
| Supprimer un gouvernorat | **DANGEREUX** | Les entreprises rattachees via `liveData.gouvernorat` (slug) afficheront un nom vide. Ne jamais supprimer. |

### Secteurs (collection `sectors`)

| Operation | Sur ? | Detail |
|---|---|---|
| Ajouter un secteur | Oui | Respecter : `slug` (unique), `kind` ("B2B" ou "B2C"), `name.fr`, `group`, `groupOrder`, `order`. |
| Modifier le nom ou la description | Oui | Effet immediat sur les moteurs de recherche. |
| Mettre `active: false` | Oui | Le secteur disparait des dropdowns. Les entreprises deja rattachees ne sont pas affectees (leur `sectorId` est un slug). |
| Supprimer un secteur | **DANGEREUX** | Les entreprises rattachees afficheront un secteur vide. Ne jamais supprimer. |

### Admin users (collection `adminusers`)

| Operation | Sur ? | Detail |
|---|---|---|
| Modifier `passwordHash` | Oui | Voir procedure ci-dessus (generer un hash bcrypt 12 rounds). |
| Supprimer le document admin | **INTERDIT** | L'admin est reference dans `validatedBy`, `auditTrail.by` de nombreux documents. Le supprimer casserait les lookups historiques. |

### Regle generale

**Ne jamais supprimer un document reference par d'autres collections.** Utiliser `active: false` ou un flag equivalent. MongoDB n'a pas de contraintes de cle etrangere — la coherence est entierement applicative.
