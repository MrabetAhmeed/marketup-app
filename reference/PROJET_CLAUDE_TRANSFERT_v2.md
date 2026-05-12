# MARKET-UP — Fichier de Transfert Projet Claude (v2)

> **Dernière mise à jour :** 11 mai 2026 — **P2.3 (parties publiques) 100% terminée**
> **Précédente :** 20 avril 2026 — démarrage Phase D (Super Admin) · 3 fichiers livrés
> Ce fichier remplace `PROJET_CLAUDE_TRANSFERT.md` (obsolète sur la partie publique slug-driven).

---

## 👤 QUI JE SUIS

Je suis **Ahmed Mrabet**, Directeur Général de **AGGREGAX SUARL** (Tunisie).
Je développe la plateforme **MARKET-UP** (vivasky.media) pour un client tunisien.
Je suis le prestataire de développement — pas le client final.

---

## 🏗️ LE PROJET MARKET-UP

Plateforme digitale nationale pour les entreprises tunisiennes.

**3 moteurs de recherche indépendants** :
- **BrandUP** → profil institutionnel B2B/B2C → accent bleu `#0078D4`
- **TraceUP** → profil média avec vidéos (YouTube · Dailymotion · Vimeo) → accent violet `#8764B8`
- **LinkUP** → carte de contact numérique → accent noir `#000` + or `#C5A059`

**Site :** vivasky.media
**Stack cible :** Next.js 14 App Router + MongoDB + NextAuth + Tailwind + shadcn/ui
**Stack maquette actuelle :** HTML statique + JS vanilla + seed `marketup_seed_data.js` (slug-driven hydration)

---

## ✅ ÉTAT D'AVANCEMENT (Mai 2026)

### 🟢 PHASE A — Partie publique 100% terminée (slug-driven)

#### Lot 1 — 3 moteurs de recherche ✅
- `public_brandup.html` — Master moteur BrandUP (cards style entreprise + RSE badge)
- `public_traceup.html` — Master moteur TraceUP (filtre sector uniquement)
- `public_linkup.html` — Master moteur LinkUP
- **Comportement :** AND-tokenized matching (case+accent insensitive), B2B/B2C toggle via navbar uniquement, filtre sector instant après 1ère recherche

#### Lot 2 — 3 profils slug-driven ✅
- `public_brandup_<slug>.html` — **v3** : Hero + Pitch + About + **Catalogue 9 projets + lightbox carousel** + Certifications + RSE
- `public_traceup_<slug>.html` — **v4** : Hero + **Lecteur vidéo inline (iframe YouTube/Vimeo/Dailymotion)** + Tabs catégorie (Actualité/Offres/Astuces/Emplois) + Library + RSE
- `public_linkup_<slug>.html` — **v3** : Hero + **10 services conditionnels** (BrandUP/TraceUP/Site Web/WhatsApp/YouTube/Facebook/Instagram/LinkedIn/Twitter/Maps) + RSE

#### Lot 3 — 3 popups slug-driven ✅ (Option A — même contenu que profils + topbar popup)
- `public_brandup_popup_<slug>.html` — identique au profil + lien "Voir profil complet" dynamique
- `public_traceup_popup_<slug>.html` — identique au profil + lecteur inline
- `public_linkup_popup_<slug>.html` — identique au profil + CSS `.service-card` (fix)

### 📁 Fichiers présents (48 total partie publique)

| Type | Templates | Profile clones | Popup clones | Total |
|---|---|---|---|---|
| BrandUP | 1 (technofab) | 6 (mediacom, greenlife, foodcorner, archstudio, autoplus, edupro) | 6 (idem) | 13 |
| TraceUP | 1 | 5 (mediacom, foodcorner, archstudio, autoplus, edupro) | 5 (idem) | 11 |
| LinkUP | 1 | 7 (mediacom, greenlife, buildtech, foodcorner, archstudio, autoplus, textiltunis) | 7 (idem) | 15 |
| Moteurs | 3 | — | — | 3 |
| **Total HTML public** | | | | **42** |
| Seed + utils | `marketup_seed_data.js` (147 KB) + `dashboard_hydrate_utils.js` + `admin_data_bridge.js` | | | 3 |

### 🟢 PHASE B2 — Auth + Onboarding (uploadés mais pas hydratés au seed)

| Fichier | Rôle | Hydraté ? |
|---|---|---|
| `onboarding_onboarding.html` | Hub produit B2B/B2C | ⚠️ Non |
| `auth_inscription-entreprise.html` | Étape 1/3 inscription | ⚠️ Non |
| `auth_inscription-utilisateur.html` | Étape 2/3 | ⚠️ Non |
| `auth_inscription-otp.html` | Étape 3/3 OTP | ⚠️ Non |
| `auth_validation-email.html` | Renvoyer code | ⚠️ Non |
| `auth_validation-success.html` | Success post-OTP | ⚠️ Non |
| `auth_connexion.html` | Login | ⚠️ Non |
| `auth_mot-de-passe-oublie.html` | Reset password request | ⚠️ Non |
| `auth_modifier-mot-de-passe.html` | Nouveau MDP | ⚠️ Non |

→ **Prochaine étape possible : P2.2 = hydratation auth slug-driven**

### 🟢 PHASE C — Dashboard entreprise (15 fichiers HTML, hydratés au seed)

Tous les dashboards Phase C sont déjà liés au seed via `dashboard_hydrate_utils.js`.

### 🟡 PHASE D — Admin (3/13 fichiers livrés, en pause)

3 fichiers admin déjà uploadés mais Phase D non terminée. À reprendre plus tard.

### 🔜 PHASES À VENIR

- **P2.2** — Hydratation pages auth (8 pages)
- **P2.6** — Hydratation onboarding
- **P2.7** — Landing page `/` publique (seule page publique manquante)
- **P2.8** — Polish / responsive / accessibility
- **Phase D** — Finir l'admin (10 fichiers restants)

---

## 🎯 CANON DESIGN (ne pas remettre en question)

### Design tokens
- **Primary BrandUP** : `#0078D4` (hover `#106EBE`, dark `#005A9E`, light `#EFF6FC`)
- **Secondary TraceUP** : `#8764B8` (logo uniquement)
- **Accent LinkUP** : `#000` + `#C5A059` (gold)
- **Admin (Phase D)** : violet `#5C2D91`
- Fonts : Plus Jakarta Sans (headings) + Inter (body) — Tailwind CDN
- **Border radius** : inputs/tags/badges = 4px · boutons/cards = 8px · modales/dropdowns = 12px
- **Ombres** : `0 2px 4px rgba(0,0,0,0.08)` repos · `0 4px 16px rgba(0,0,0,0.12)` hover · `0 8px 32px rgba(0,0,0,0.16)` modal
- **Pas de** : ombres colorées, `font-extrabold`, `rounded-2xl` (sauf hero hexagon), tokens Material 3
- **Monnaie** : DT (jamais €), TVA 19%, format `1 250` avec espace insécable

### Statuts (status pills réutilisables)

| État | Texte | Bg | Border | Dot |
|---|---|---|---|---|
| Brouillon | `#475569` | `#F1F5F9` | `#CBD5E1` | `#64748B` |
| En attente | `#92400E` | `#FFFBEB` | `#FDE68A` | `#D97706` |
| Actif | `#107C10` | `#F0FDF4` | `#B7EBC0` | `#107C10` |
| Refusé | `#B91C1C` | `#FEF2F2` | `#FCA5A5` | `#DC2626` |
| Désactivé | `#616161` | `#F5F5F5` | `#E0E0E0` | `#8A8886` |
| Validé RSE (gold) | `#8A6A1F` | `#FEFCE8` | `#E8C96A` | `#C5A059` |

---

## 🎭 NARRATION TECHNOFAB (démo canon)

**Entreprise démo principale** : TechnoFab Industries · B2B · Mécanique · Sousse
- BrandUP : 🔴 **Refusé** par admin (invisible publiquement)
- TraceUP : 🟠 **Pending** validation
- LinkUP : 🟢 **Actif + Boosté** (visible publiquement)

**Les profils non-actifs sont invisibles publiquement** (règle métier). Le seed contient 10 sociétés avec différents states pour tester tous les cas.

### Sociétés actives par profil (visibles dans les moteurs publics)

| Société | Slug | Type | BrandUP | TraceUP | LinkUP |
|---|---|---|---|---|---|
| TechnoFab Industries | technofab-industries | B2B | ❌ rejected | ❌ pending | ✅ active |
| MediaCom Communication | mediacom-communication | B2B | ✅ | ✅ | ✅ |
| GreenLife — Bio | greenlife-bio | B2C | ✅ | incomplete | ✅ |
| BuildTech Construction | buildtech-construction | B2B | incomplete | incomplete | ✅ |
| FoodCorner Restaurant | foodcorner-restaurant | B2C | ✅ | ✅ | ✅ |
| ArchStudio | archstudio-architecture | B2B | ✅ | ✅ | ✅ (**société démo riche** : 9 projets + 2 vidéos + 1 cert + 2 RSE + 6 socials) |
| AutoPlus | autoplus | B2B | ✅ | ✅ | ✅ |
| PharmaTN | pharmatn | B2B | incomplete | incomplete | incomplete |
| EduPro Formation | edupro | B2B | ✅ | ✅ | disabled |
| TextilTunis | textiltunis | B2B | ❌ rejected | ❌ rejected | ✅ |

---

## 🔧 ARCHITECTURE TECHNIQUE — SLUG-DRIVEN HYDRATION

### Principe

Chaque profil/popup est un fichier HTML statique avec :
1. **Container HTML** avec IDs sur chaque champ (`bu-name`, `tu-video-player`, `lu-svc-brandup`, etc.)
2. **Seed loader** : `<script src="marketup_seed_data.js"></script>` dans `<head>`
3. **Script de hydration** en bas du `<body>` qui :
   - Extrait le slug depuis `window.location.pathname`
   - Trouve la société : `data.companies.find(c => c.slug === slug)`
   - Vérifie que le profil est `active` (sinon affiche 404)
   - Hydrate tous les containers via `setText('id', value)` et `setAttr('id', 'src', url)`

### URL Pattern (slug = nom du fichier)

```
Moteur BrandUP → click card → public_brandup_popup_<slug>.html
                              └── click "Voir profil complet" → public_brandup_<slug>.html

Pour chaque slug, on a donc 2 fichiers (le profil + le popup), idéntiques en code,
différents uniquement par l'URL. Le JS extrait le slug et hydrate avec la bonne data.
```

### Cross-links automatiques

Quand on est sur le profil BrandUP de MediaCom et que le HTML a `<a href="public_traceup_technofab-industries.html">`, le JS le réécrit en `public_traceup_mediacom-communication.html` si MediaCom a un TraceUP actif. Sinon → `removeAttribute('href')` + opacity 0.4.

---

## 🎬 SPÉCIFIQUE TRACEUP — Lecteur vidéo inline (v4)

### Plateformes supportées
- **YouTube** : `youtube.com/watch?v=…` · `youtu.be/…` · `youtube.com/shorts/…`
- **Dailymotion** : `dailymotion.com/video/…` · `dai.ly/…`
- **Vimeo** : `vimeo.com/…`

### URLs d'embed (générées dynamiquement)
```js
function buildEmbedUrl(video, autoplay) {
  const ap = autoplay ? 1 : 0;
  const id = video.videoId;
  if (video.source === 'youtube') return `https://www.youtube.com/embed/${id}?autoplay=${ap}&rel=0&modestbranding=1`;
  if (video.source === 'vimeo') return `https://player.vimeo.com/video/${id}?autoplay=${ap}&title=0&byline=0&portrait=0`;
  if (video.source === 'dailymotion') return `https://www.dailymotion.com/embed/video/${id}?autoplay=${ap}&queue-enable=false`;
  return '';
}
```

### Comportement
- Page load : 1ère vidéo en thumbnail + bouton ▶ (statique)
- Click ▶ → swap pour iframe avec `autoplay=1`
- Click sur card dans library → swap player + smooth scroll vers player
- Tabs (Actualité/Offres/Astuces/Emplois) avec compteurs dynamiques

### ⚠️ Piège évité : Temporal Dead Zone

`const tabsEl` et `const gridEl` **DOIVENT** être déclarés AVANT le premier `renderPlayer()` car celui-ci appelle `updateLibraryHighlight()` qui lit `tabsEl`. Bug TDZ corrigé en v4.

---

## 🖼️ SPÉCIFIQUE BRANDUP — Catalogue 9 projets + lightbox (v3)

### Layout
**1 main image** (40%) + **2 sub-images named** (25% gauche) + **6 small images** (35% droite) = 9 slots

### Lightbox carousel
- Click sur n'importe quelle image → ouvre lightbox plein écran
- Navigation : ← → boutons + touches clavier
- Échap pour fermer
- Counter "N/9"
- Affiche : image + nom du projet + description

### Schéma project (seed)
```js
{
  id: 'proj-c-001-1',
  name: { fr: 'Pièces aéronautiques A320', ar: '', en: '' },
  image: 'https://picsum.photos/seed/c-001-proj-1/600/400',
  description: { fr: '...', ar: '', en: '' },
  order: 1
}
```

**Une seule image par projet** — pas de gallery (champ supprimé du seed).

---

## 🔗 SPÉCIFIQUE LINKUP — 10 services conditionnels

### Liste des services
1. **BrandUP** — `public_brandup_<slug>.html` (si BrandUP active)
2. **TraceUP** — `public_traceup_<slug>.html` (si TraceUP active)
3. **Site Web** — `contactCard.website`
4. **WhatsApp** — `https://wa.me/<phone digits>` (si phone)
5. **YouTube** — socials.find(youtube).url
6. **Facebook** — socials.find(facebook).url
7. **Instagram** — socials.find(instagram).url
8. **LinkedIn** — socials.find(linkedin).url
9. **Twitter** — socials.find(twitter || x).url
10. **Maps** — `https://maps.google.com/?q=<lat>,<lng>` (depuis `contactCard.gpsPosition.coordinates`)

### Règle d'affichage
- Si l'URL est **null/undefined** → `el.style.display = 'none'` (card masquée)
- Cohérent avec règle métier : "profil non Actif = invisible publiquement"

### CSS critique (.service-card)
```css
.service-card {
  border: 1px solid #E0E0E0;
  transition: all 0.2s ease-in-out;
  border-radius: 14px;
}
.service-card:hover {
  border-color: #C5A059;  /* gold LinkUP */
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
```

---

## 📊 SEED DATA (marketup_seed_data.js)

### Statistiques
- **10 sociétés** (c-001 à c-010)
- **25 sectorsB2B + 25 categoriesB2C** (FR/AR/EN)
- **24 gouvernorats** tunisiens
- **5 associations** partenaires RSE
- **72 projets** (9 par société active BrandUP)
- **19 vidéos** (mix YouTube + Vimeo + Dailymotion)
- **6 RSE receipts validés**

### Format
```js
window.MARKETUP_DATA = {
  companies: [...],
  sectorsB2B: [...],
  categoriesB2C: [...],
  gouvernorats: [...],
  associations: [...],
  // ... + helpers via MockAPI
};
```

### Helpers i18n
Tous les textes utilisateurs sont en `{ fr, ar, en }`. Utiliser `fmtName(i18n)` qui retourne `fr || ar || en || ''`.

---

## ⚙️ MÉTHODE DE TRAVAIL ÉTABLIE

### Workflow type
1. **Audit chirurgical** sur fichiers existants — pas de refonte si proche du bon
2. **Méthode A privilégiée** : Claude produit le fichier complet corrigé, Ahmed upload
3. **Livraison cluster par cluster** (jamais tout d'un coup)
4. **Pass transversal d'abord** sur un lot de fichiers puis audit détaillé
5. **2-3 questions clarifiantes** via `ask_user_input_v0` AVANT de produire
6. `str_replace` pour patches précis, jamais de réécriture globale quand évitable
7. **Templates principaux + copies test** pour chaque lot (slugs alimentés)
8. **Vérification cross-fichier** après chaque lot
9. **Si doute** → référencer un fichier source de vérité existant

### Conventions de coding
- Toujours partir des **uploads originaux** quand on patche (pas /mnt/project si déjà patché)
- Utiliser **regex avec patterns** quand structure HTML est répétitive
- Vérifier `div balance` (`<div>` count == `</div>` count) après chaque patch
- IDs cohérents : `bu-*` pour BrandUP, `tu-*` pour TraceUP, `lu-*` pour LinkUP
- 404 wrapper si profil pas active : `<div id="<type>-404" class="hidden">` + content wrapper `<div id="<type>-content">`

---

## 🔐 IDENTIFIANTS DÉMO

**Password commun toutes sociétés** : `Demo1234!`
**Bcrypt hash** : `$2b$10$V5Iv4O6ds6vMoeRRbWndSedtb43uI00BF.a0Kai9ckKUk4LaJzfaa`

**Compte admin** : `bassem@vivasky.media` (Bassem Admin, avatar BA sur violet `#5C2D91`)

---

## 💰 CONTRAT & CONTEXTE COMMERCIAL

- Prestataire : AGGREGAX SUARL (Ahmed Mrabet)
- Montant total V1 : 4 500 DT HT
- Paiement : 30% signature → 40% livraison V1.1 → 30% livraison V1.2
- Garantie : 1 mois post-solde
- **V1.1** (3 mois) : Modules 1-4, 7-9 — 2700 DT
- **V1.2** (+1 mois) : Modules 5-6 Boost & Sponsoring — 1800 DT
- Juridiction : Tunis, droit tunisien
- TVA : 19% · HT stocké en base, TTC calculé à la volée

---

## 🎯 PROCHAINES ÉTAPES POSSIBLES (au choix)

### Option 1 — P2.2 Auth slug-driven (8 pages)
Lier les pages d'inscription/login au seed. Récupérer `email` d'un compte existant → autofill, vérifier que les champs `company.legalId` correspondent, etc.

### Option 2 — P2.6 Onboarding
Hub produit (`onboarding_onboarding.html`) → router vers `auth_inscription-entreprise.html?type=B2B` ou `?type=B2C`.

### Option 3 — P2.7 Landing page `/`
Seule page publique manquante. Vivasky.media en tant que site marketing :
- Hero + 3 produits (BrandUP/TraceUP/LinkUP)
- Bénéfices clients B2B/B2C
- CTA "Créer mon compte" → `/onboarding`
- Pricing V1.2 (Boost 50 DT · Sponsoring 100 DT)
- Footer AGGREGAX + mentions légales

### Option 4 — Finir Phase D (Admin)
10 fichiers restants. Voir détails dans `PROJET_CLAUDE_TRANSFERT.md` v1 (canon admin violet `#5C2D91`).

### Option 5 — Handoff dev Next.js
Le projet est-il prêt pour le dev ? Audit handoff.

---

## ⚠️ INVALIDÉS / OBSOLÈTES

### Invalidés par P2.3 (mai 2026)
- ❌ `bu.data.gallery[]` → **supprimé du seed**, remplacé par `projects[]` (1 image par projet, 9 projets par société active)
- ❌ Catalogue BrandUP **1+2+4 = 7 slots** → désormais **1+2+6 = 9 slots**
- ❌ TraceUP video cards en `<a target="_blank">` (redirect externe) → désormais **lecteur iframe inline** (in-page)
- ❌ Modal d'ajout vidéo TraceUP "YouTube only" → désormais **multi-plateforme** (YouTube + Dailymotion + Vimeo)
- ❌ LinkUP popup sans `.service-card` CSS → corrigé (cadres + hover gold)

### Invalidés par les phases précédentes (toujours valables)
Voir `PROJET_CLAUDE_TRANSFERT.md` v1 pour la liste exhaustive (Phase B2 + Phase C).

---

## 🛠️ POINTS TECHNIQUES IMPORTANTS

### Temporal Dead Zone (TraceUP v4)
Avant le premier `renderPlayer(videos[0], false)` :
```js
// ❌ AVANT (bug TDZ — ReferenceError)
const playerEl = ...;
function renderPlayer(...) { ... updateLibraryHighlight(); }
renderPlayer(videos[0], false);  // 💥 ReferenceError
const tabsEl = ...;

// ✅ APRÈS (corrigé)
const playerEl = ...;
const tabsEl = ...;   // ← déclaré AVANT
const gridEl = ...;
function renderPlayer(...) { ... }
renderPlayer(videos[0], false);  // ✅ OK
```

### Pattern de div balance
Toujours vérifier après chaque patch :
```python
opens = len(re.findall(r'<div\b', content))
closes = len(re.findall(r'</div>', content))
assert opens == closes, f'div imbalance: {opens}/{closes}'
```

### CSS critique manquant dans popup
Le LinkUP popup original n'avait pas `.service-card` CSS — il était dans le profil mais pas dans le popup. Toujours vérifier que CSS critiques sont présents dans **tous** les fichiers qui les utilisent.

### Bug dans le mockup source (LinkUP popup)
Le `public_linkup_popup_*.html` original avait `<a href="public_traceup_*.html">` au lieu de `public_linkup_*.html` (coquille). Le JS corrige automatiquement vers la bonne URL `public_linkup_<slug>.html`.

---

## 🎉 RÉCAP — Ce qui a été fait dans cette session

1. ✅ **Migration seed** : `gallery[]` → `projects[]` (9 projets / société active, 1 image par projet)
2. ✅ **3 moteurs** : cards style entreprise + RSE badge + filtre simplifié (sector uniquement)
3. ✅ **3 profils slug-driven** :
   - BrandUP v3 : Catalogue 9 projets + lightbox + Certifications + RSE
   - TraceUP v4 : Lecteur inline + tabs + library + RSE (fix TDZ)
   - LinkUP v3 : 10 services conditionnels + RSE
4. ✅ **3 popups slug-driven** : Option A (même contenu que profils + topbar popup)
5. ✅ **Tous les clones générés** : 27 fichiers pour démo 100% navigable (0 erreur 404)
6. ✅ **Tous les fichiers critiques validés** : 48 fichiers attendus, 48 présents

---

## 📁 FICHIERS DE RÉFÉRENCE (uploadés dans le projet)

| Fichier | Rôle |
|---|---|
| `marketup_seed_data.js` (147 KB) | **Source de vérité unique** — toutes les données démo |
| `dashboard_hydrate_utils.js` | Helpers réutilisables pour dashboard |
| `admin_data_bridge.js` | Pont entre admin pages et seed |
| `PROJET_CLAUDE_TRANSFERT_v2.md` | **CE FICHIER** — état actuel mai 2026 |
| `PROJET_CLAUDE_TRANSFERT.md` | Ancien fichier (avril 2026) — partiellement obsolète |
| `CLAUDE_v3.md` | Master spec originale (⚠️ partiellement obsolète) |
| `SKILL.md` | Patterns Next.js fullstack |
| `SKILL_code_review.md` | Checklist de code review |
| `SEED_ARCHITECTURE.md` | Architecture détaillée du seed |
| `MARKET_UP_Cahier_des_Charges.docx` | Cahier des charges fonctionnel |
| `SPEC_TECH_Phase1_Developpeur.docx` | Spec technique Phase 1 |
| `SPEC_TECH_Phase2_Dashboard.docx` | Spec technique Phase 2 |
| `ANNEXE_A_MARKET_UP.docx` | Annexe A |
| `CONTRAT_MARKET_UP_v2.docx` | Contrat client |
| `Structure_des_Donne_es_et_Formulaires_MarketUP.pdf` | Schéma de données |
| `Listes_b2b_b2c.pdf` | 25 secteurs B2B + 25 catégories B2C |
| `STITCH_PROMPTS_MARKET_UP.md` | Prompts Stitch (⚠️ obsolète sur le dashboard) |
| `BRIEF_PATCH_VIDEO_SOURCES.md` | Brief patch multi-plateforme vidéo |

---

## 📝 INSTRUCTIONS POUR LE PROCHAIN CLAUDE

### Avant de commencer
1. **Lire CE FICHIER en premier** (PROJET_CLAUDE_TRANSFERT_v2.md)
2. **Ouvrir `marketup_seed_data.js`** dans le projet pour comprendre la structure
3. **Confirmer avec Ahmed** le scope de la session (P2.2 auth ? P2.7 landing ? autre ?)

### Si on travaille sur P2.2 Auth
- Reprendre le pattern slug-driven mais adapté aux pages auth
- Utiliser le seed pour valider les emails/RNE existants au login
- Compte démo : tous les comptes ont password `Demo1234!`

### Si on travaille sur P2.7 Landing
- Vivasky.media en tant que site marketing
- Hero + 3 produits cards (BrandUP/TraceUP/LinkUP)
- CTA "Créer mon compte" → `/onboarding`
- Footer AGGREGAX

### Si on continue Phase D Admin
- Cluster A : `admin_validation_comptes.html` + `admin_validation_profils.html` + `admin_entreprises.html`
- Voir canon admin (violet `#5C2D91`) dans v1 du fichier de transfert

### Ce qui est verrouillé (ne JAMAIS remettre en question)
- Seed structure (projects[] + 1 image par projet)
- Catalogue BrandUP = 9 slots avec lightbox
- TraceUP = lecteur inline iframe (pas redirect externe)
- LinkUP = 10 services conditionnels
- Popups = même contenu que profils (Option A)
- Profil non-active = invisible publiquement (cards masquées)
- Tokens Fluent plats, pas Material 3
- 0 ombre colorée, 0 `font-extrabold`, 0 `rounded-2xl` non canon

---

**Fin du fichier de transfert v2.**
Bonne reprise ! 🚀