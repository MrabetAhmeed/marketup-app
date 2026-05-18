# BROWSER_TEST_PROTOCOL.md — Protocole de browser test standardisé

> **Document de référence pour TOUS les browser tests de mutations Phase 4+.**
> **À lire AVANT chaque browser test. À enrichir au fil des découvertes.**
> **v1.1 — 18 mai 2026 — post-Sprint 1 retex**
> **Source : retours d'expérience Phase 3 + Sprint 1 Phase 4 + cross-check Claude.ai.**

---

## 🎯 QUAND UTILISER CE PROTOCOLE

À chaque sprint qui livre **une mutation backend** (POST, PATCH, DELETE) ou qui touche à l'auth/RBAC :
- Phase 4 Sprint 1 : Account live mutations ✅ DONE
- Phase 4 Sprint 2 : Profile soft mutations
- Phase 4 Sprint 3 : Profile hard submit
- Phase 4 Sprint 4 : Logo upload
- Toute future mutation Phase 6 admin
- Toute future mutation Phase 7 boost/sponsoring

---

## 🆕 MODES DE TEST (v1.1)

### 🟢 Mode SMOKE — 5 tests, ~3 min

Tests obligatoires minimaux. Pour sprints à risque faible.

**Tests inclus** :
1. **A.1** — Auth guard 401
2. **A.2** — Injection hors scope
3. **Happy path** — 1 mutation end-to-end
4. **B.1** — Dirty fields only (Network)
5. **D.4** — Reload F5 persiste

### 🔴 Mode FULL — 19 tests, ~10-15 min

Protocole complet : A.1-A.3 + B.1-B.6 + C.1-C.4 + D.1-D.5.

### Classification des sprints

| Type de sprint | Mode requis |
|---|---|
| Placeholder / UI uniquement | SMOKE |
| Modifications CSS / layout pures | SMOKE |
| Fixes mineurs post-commit | SMOKE |
| **Mutation backend (PATCH / POST / DELETE)** | **FULL** |
| **Touche à auth / RBAC** | **FULL** |
| **Touche au paiement** | **FULL** |
| **Avant commit "release" ou tag** | **FULL** |
| **Modifie une mutation déjà testée** | **FULL** |

**Règle simple : en cas de doute → FULL.** 5 min de test en trop > régression manquée.

---

## 📋 LE PROTOCOLE EN 4 CATÉGORIES

### A. SÉCURITÉ (OBLIGATOIRE — JAMAIS skipper)

#### A.1 — Auth guard 401
**Pourquoi** : Premier vérification avant tout le reste. Si l'auth ne marche pas, le reste n'a pas d'importance.

**⚠️ Méthode (post-Sprint 1)** :
- **Utiliser fenêtre privée Chrome/Edge** (plus simple que Firefox)
- **NE PAS utiliser Edit and Resend Firefox** → réutilise les cookies de la requête originale, faux positif garanti
- Vérifier dans DevTools que le cookie `next-auth.session-token` est bien absent AVANT de tester

**Comment tester** :
```javascript
// Fenêtre privée, NE TE LOGUE PAS
// Console DevTools :
fetch('/api/v1/me/account', {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({phone: '+216 71 111 111'})
}).then(async r => {
  console.log('status:', r.status);
  console.log('body:', JSON.stringify(await r.json(), null, 2));
})
```

**Attendu** :
- `status: 401`
- `body: { error: { code: "UNAUTHORIZED", message: "Session expirée..." } }`

**Si KO** : Bug critique de fondations. Stop tout et fix.

#### A.2 — Injection de champs hors scope
**Pourquoi** : Tester que les champs sensibles (displayName, role, companyId, etc.) ne peuvent pas être modifiés via injection.

**Comment tester** :
```javascript
// Connecté, console DevTools :
fetch('/api/v1/me/account', {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    // Champs autorisés
    phone: '+216 73 222 999',
    // Champs INJECTÉS qui doivent être silently ignored
    displayName: 'HACKED COMPANY',
    role: 'SUPER_ADMIN',
    companyId: 'c-fake',
    deletedAt: null
  })
}).then(r => r.json()).then(console.log)
```

**Attendu** : 
- Status 200
- Champs autorisés mis à jour
- Champs injectés IGNORÉS (vérifier en DB ou via reload)

**Si KO** : Bug de sécurité critique. La défense en profondeur (pick explicite côté service) doit être ajoutée.

#### A.3 — Cross-tenant injection (à partir de Sprint 2)
**Pourquoi** : Tester qu'un user ne peut pas modifier les données d'une autre Company.

**Comment tester** :
```javascript
// Connecté en tant que TechnoFab (c-001)
// Tente de PATCH une autre company
fetch('/api/v1/companies/c-002/whatever', {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({phone: '+216 99 999 999'})
}).then(r => r.status).then(console.log)
```

**Attendu** : `403` Forbidden (ou 404 selon design)

---

### B. ARCHITECTURE (Comportement applicatif correct)

#### B.1 — Dirty fields uniquement dans le PATCH body
**Pourquoi** : Confirme que le PATCH est partiel (pas un PUT déguisé). Performance + sécurité.

**Comment tester** :
1. Modifie UN SEUL champ (ex: ville)
2. Ouvre Network tab DevTools
3. Clique "Enregistrer"
4. Inspecte la requête PATCH → Request Payload

**Attendu** : Body contient UNIQUEMENT `{"ville": "..."}` et rien d'autre.

#### B.2 — Champs read-only n'activent pas isDirty
**Pourquoi** : Un champ "locked" ne doit JAMAIS déclencher l'action bar.

**Comment tester** :
Vérifie visuellement que les champs suivants ne déclenchent PAS l'action bar :
- Champs avec `FieldBadge variant="locked"` (legalId, country, etc.)
- Inputs `readOnly` ou `disabled`

**Attendu** : Action bar reste à "Compte à jour" quand on essaie d'interagir avec un champ locked.

#### B.3 — router.refresh() après succès
**Pourquoi** : Invalide le cache RSC parent. Sinon données stale.

**Comment tester** :
1. Modifie un champ + Enregistrer
2. Sans recharger la page, navigue vers `/dashboard` (overview)
3. Reviens sur `/dashboard/account`

**Attendu** : Les nouvelles valeurs s'affichent partout sans avoir besoin de F5.

#### B.4 — Reset isDirty après succès
**Pourquoi** : `form.reset(updatedValues)` doit ramener isDirty à false.

**Comment tester** :
1. Modifie un champ
2. Action bar : "1 modification en attente" + boutons activés
3. Clique Enregistrer
4. Après succès, observe l'action bar

**Attendu** : Action bar revient à "Compte à jour", boutons disabled.

#### 🆕 B.5 — No-op submit (v1.1)
**Pourquoi** : Tester que le bouton Enregistrer est bien disabled quand `isDirty=false`, et que si on bypass via console, le serveur gère proprement.

**Comment tester** :
1. Sans modifier aucun champ, observe le bouton Enregistrer → doit être **disabled**
2. Bypass via console :
```javascript
fetch('/api/v1/me/account', {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({})  // empty body
}).then(async r => console.log(r.status, await r.json()))
```

**Attendu (canon Sprint 1)** :
- Bouton disabled visuellement ✅
- Body vide envoyé → **200 + data inchangée** (silent no-op côté service)
- PAS de 400 sur body vide (le service détecte 0 dirty fields et skip update DB)

#### 🆕 B.6 — Double-clic Enregistrer (v1.1)
**Pourquoi** : Race condition classique. Le bouton doit être disabled après le 1er clic.

**Comment tester** :
1. Modifie un champ
2. Clique Enregistrer 3 fois rapidement
3. Ouvre Network tab

**Attendu** :
- **Une seule** requête PATCH dans Network (pas 3)
- Bouton disabled après 1er clic
- Pas de double toast, champ qui clignote, etc.

---

### C. VALIDATION (Zod + UX)

#### C.1 — Zod errors inline (pas toast)
**Pourquoi** : Les erreurs de champ doivent apparaître SOUS le champ concerné, pas dans un toast global.

**Comment tester** :
1. Modifie le champ email contact avec une valeur invalide (ex: "pas-un-email")
2. Clique Enregistrer

**Attendu** :
- Message d'erreur rouge SOUS le champ email
- AUCUN toast (toast = erreur globale uniquement)
- Action bar reste sur "1 modification en attente"
- Status 400 + `{ error: { code: "VALIDATION_FAILED", fields: { ... } } }`

#### 🆕 C.2 — Edge cases (figé v1.1 — comportements canon)

**À RESPECTER strictement pour tous les sprints suivants.** Si un sprint observe un comportement différent → STOP, on aligne avant de continuer.

| Champ | Valeur test | Status | Comportement attendu |
|---|---|---|---|
| Phone / WhatsApp | `""` vide envoyé | 400 | Erreur inline (regex ne match pas) |
| Phone / WhatsApp | `"abcdef"` lettres | 400 | Erreur inline "Numéro invalide..." |
| Phone / WhatsApp | `"+21"` trop court | 400 | Erreur inline |
| Phone / WhatsApp | `"20123456"` sans `+` | 400 | Erreur inline |
| Phone / WhatsApp | `"+21620123abc456"` lettres mixées | 400 | Erreur inline (refine reject) |
| Phone / WhatsApp | `"+216 20 123 456"` espaces | 200 | Normalisé `"+21620123456"` |
| Phone / WhatsApp | `"+216-20-123-456"` tirets | 200 | Normalisé `"+21620123456"` |
| Phone / WhatsApp | `"+216(20)123456"` parens | 200 | Normalisé `"+21620123456"` |
| Email | `"x@y"` format invalide | 400 | Erreur inline "Email invalide" |
| Champs hors scope | `displayName`, `role`, `companyId`, `deletedAt` | 200 | Silently dropped |
| Champ optional non envoyé | (pas dans body) | 200 | Pas touché |

**Pour les futures validations à figer** (email vide / required, address max length, etc.) → tester au premier sprint qui les implémente, puis figer dans cette table.

#### C.3 — Multi-fields modifiés simultanément
**Pourquoi** : Tester que plusieurs dirty fields sont bien envoyés ensemble.

**Comment tester** :
1. Modifie 3 champs (phone + ville + address)
2. Action bar : "3 modifications en attente"
3. Clique Enregistrer

**Attendu** :
- Network body contient les 3 champs (et SEULEMENT les 3)
- Tous mis à jour en DB
- Reload : les 3 valeurs persistent

#### C.4 — Toggle dirty (re-mettre valeur d'origine)
**Pourquoi** : react-hook-form doit détecter quand on remet une valeur identique.

**Comment tester** :
1. Note la valeur initiale du champ phone
2. Modifie en autre chose
3. Action bar : "1 modification en attente"
4. Re-modifie en valeur initiale exactement

**Attendu** : Action bar disparaît (revient à "Compte à jour").

---

### D. UX (Expérience utilisateur)

#### D.1 — Spinner pendant requête
**Comment tester** : Modifie + Enregistrer, observe le bouton.

**Attendu** :
- Spinner sur le bouton "Enregistrer"
- Bouton disabled pendant la requête
- Bouton "Annuler" aussi disabled (race condition)

#### D.2 — Toast success
**Attendu** :
- Toast bottom-center, dark bg, ~1800ms auto-dismiss
- Message FR clair : "Modifications enregistrées" ou équivalent
- Non bloquant

#### D.3 — Annuler reset les valeurs originales
**Comment tester** :
1. Modifie un champ
2. Clique "Annuler" (avant Enregistrer)

**Attendu** :
- Champ revient à valeur initiale
- Action bar disparaît
- AUCUN appel API

#### D.4 — Reload F5 persiste les modifications
**Comment tester** : Après succès, F5 la page.

**Attendu** : Les nouvelles valeurs sont toujours là.

#### 🆕 D.5 — Erreur 500 serveur (v1.1)
**Pourquoi** : Que voit l'utilisateur si le serveur plante ? Sans gestion, écran cassé.

**Comment tester** (au moins 1 fois par phase, pas obligatoire à chaque sprint) :
- Méthode A : casser temporairement le service (commenter une ligne, `throw new Error("test")`)
- Méthode B : couper MongoDB Atlas réseau au moment du submit
- Méthode C : ajouter un middleware test qui retourne 500 sur une route ciblée

**Attendu** :
- Toast d'erreur FR clair : "Erreur, veuillez réessayer" (ou similaire)
- PAS d'écran cassé
- PAS de submit silencieux (champ reste dirty)
- Action bar reste sur "X modifications en attente" (l'utilisateur peut réessayer)

---

## 📌 SHAPE CANON APIRESPONSE (figé v1.1)

**Success (2xx)** : data directe — `object | array | primitive`. Pas de wrapper.

**Error (4xx / 5xx)** :
```json
{
  "error": {
    "code": "SHORT_UPPER_CASE_CODE",
    "message": "Message FR utilisateur",
    "fields": {  // optional, pour 400 VALIDATION_FAILED uniquement
      "fieldName": ["Message d'erreur FR du field"]
    }
  }
}
```

### Codes erreur canon

| Code | Status | Contexte |
|---|---|---|
| `UNAUTHORIZED` | 401 | Auth absente |
| `FORBIDDEN` | 403 | Auth présente mais role insuffisant |
| `VALIDATION_FAILED` | 400 | Zod ou business rule (avec `fields`) |
| `NOT_FOUND` | 404 | Ressource introuvable |
| `CONFLICT` | 409 | Duplicate (ex: email déjà utilisé) |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

---

## 🗺️ COMPORTEMENT MIDDLEWARE (figé v1.1)

| Route | Non-auth | Auth ok |
|---|---|---|
| `/api/v1/*` (sauf resources) | **401 JSON** `{ error: { code: "UNAUTHORIZED", ... } }` | passthrough |
| `/api/auth/*` | passthrough (public) | passthrough |
| `/api/v1/resources/*` | passthrough (public) | passthrough |
| `/dashboard/*` | **307 redirect** `/login?callbackUrl=...` | passthrough |
| `/admin/*` | **307 redirect** `/login?callbackUrl=...` | passthrough |
| Autres routes | passthrough | passthrough |

---

## 📝 FORMAT DE RAPPORT STANDARDISÉ

À utiliser pour TOUS les browser tests Phase 4+.

```markdown
# BROWSER TEST — [Sprint X / Phase Y] — Mode [SMOKE | FULL]

## Setup
- URL testée : /dashboard/...
- Endpoint : PATCH /api/v1/...
- Login : ahmed@technofab.tn / Demo1234!
- Browser : Chrome / Firefox / Edge (privé pour A.1)
- Date : YYYY-MM-DD

## Résultats par catégorie

### A. SÉCURITÉ
- [✅/🔴] A.1 — Auth guard 401 (body exact à valider)
- [✅/🔴] A.2 — Injection hors scope
- [✅/🔴 / N/A] A.3 — Cross-tenant injection

### B. ARCHITECTURE
- [✅/🔴] B.1 — Dirty fields only
- [✅/🔴] B.2 — Read-only n'active pas isDirty
- [✅/🔴] B.3 — router.refresh()
- [✅/🔴] B.4 — Reset isDirty
- [✅/🔴] B.5 — No-op submit (v1.1)
- [✅/🔴] B.6 — Double-clic (v1.1)

### C. VALIDATION
- [✅/🔴] C.1 — Zod errors inline
- [✅/🔴] C.2 — Edge cases (cf tableau figé)
- [✅/🔴] C.3 — Multi-fields simultanés
- [✅/🔴] C.4 — Toggle dirty

### D. UX
- [✅/🔴] D.1 — Spinner
- [✅/🔴] D.2 — Toast success
- [✅/🔴] D.3 — Annuler reset
- [✅/🔴] D.4 — Reload F5 persiste
- [✅/🔴 / SKIP] D.5 — Erreur 500 (v1.1)

## Issues found
[Liste les bugs avec : numéro test + symptôme + screenshot si pertinent]

## Comportements Zod observés (à figer si nouveau)
[Documente tout comportement Zod nouveau pour mise à jour C.2]

## Verdict
- 🟢 ALL GREEN → ready to commit
- 🟡 X issues mineures → patch puis re-test
- 🔴 Y issues critiques → debug avant tout
```

---

## 🚨 RÈGLES NON-NÉGOCIABLES

### Règle 1 — Tester A.1 (auth) à CHAQUE sprint avec mutation
Même si "ça a déjà été testé avant". Une nouvelle route = un nouveau test auth.

### Règle 2 — Tester A.2 (injection) à CHAQUE sprint avec PATCH
Pour chaque endpoint qui modifie des données, vérifier qu'un champ hors scope ne peut pas être injecté.

### Règle 3 — Format de rapport STANDARDISÉ
Toujours utiliser le format ci-dessus. Cohérence des reviews.

### Règle 4 — Tests JS en console DevTools, pas curl
Avantage : utilise les vrais cookies de session sans manipulation manuelle. Plus rapide.

**Exception v1.1** : pour A.1, utiliser fenêtre privée Chrome/Edge (pas Firefox Edit and Resend qui réutilise les cookies originaux).

### Règle 5 — Documenter les comportements Zod observés
Si un comportement nouveau est observé, l'ajouter dans C.2 (tableau figé). Plus jamais "ou" dans les attendus.

### Règle 6 (v1.1) — En cas de doute → mode FULL
5 min de test en trop > régression manquée. La classification n'est qu'un guide.

---

## 🎯 ESCALATION

Si un test échoue :

```
1. Note précisément le numéro du test + symptôme
2. Screenshot si bug visuel
3. Network tab : status code + body
4. Console errors si présentes
5. Reviens vers Claude.ai avec le rapport
6. NE PAS COMMIT avant fix + re-test
```

---

## 📊 ÉVOLUTION DU PROTOCOLE

Ce document est **vivant**. À enrichir au fil des découvertes.

### Historique des versions
- **v1.0** (Phase 4 Sprint 1 prep) — Document initial, 16 tests dans 4 catégories
- **v1.1** (18 mai 2026, post-Sprint 1) — Ajouts :
  - Modes SMOKE (5 tests) / FULL (19 tests)
  - Classification sprints
  - Tests B.5 (no-op submit), B.6 (double-clic), D.5 (erreur 500)
  - Tableau C.2 figé (comportements Zod canon)
  - Shape ApiResponse figé
  - Comportement middleware figé (401 JSON pour /api/*, redirect 307 pour pages)
  - Règle 6 : doute → FULL
  - Mise à jour A.1 : Chrome/Edge privé > Firefox Edit and Resend

### Leçons apprises Sprint 1
- **Firefox "Edit and Resend"** réutilise les cookies de la requête originale → faux positif sur A.1
- **NextAuth middleware par défaut** fait redirect 307 sur `/api/*` → besoin de middleware custom pour 401 JSON propre
- **Phone validation permissive** (`.transform()` strip silencieux) → bug `"abc123def"` stocké comme `"123"`
- **3-tier defense** fonctionne mais doit être pickée côté service explicitement (`.strip()` Zod seul ne suffit pas)
- **Audit pré-code** par CC évite 80% des re-coding (cf STOP conditions précoces)

### Ajouts à prévoir (Phase 4+)
- **Sprint 4 uploads** : taille max, types acceptés, malformed files, path traversal
- **Sprint 6 admin** : RBAC (admin can do X, user cannot)
- **Phase 5 publique** : SEO meta, OG tags, mobile responsive
- **Phase 7 boost/sponsoring** : flow paiement
- **V1.1 globale** : tests E2E Playwright (parcours complet user + admin)

---

*Fin du document — BROWSER_TEST_PROTOCOL.md v1.1*
*Maintenu : Ahmed Mrabet + Claude.ai · 18 mai 2026*
*À enrichir à chaque sprint avec les nouvelles découvertes.*
