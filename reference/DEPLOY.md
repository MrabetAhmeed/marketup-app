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
