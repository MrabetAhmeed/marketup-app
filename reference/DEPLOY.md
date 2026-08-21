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
