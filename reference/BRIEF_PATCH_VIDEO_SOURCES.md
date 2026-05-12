# 🎬 BRIEF DE PATCH — Extension sources vidéo TraceUP

**À exécuter dans la prochaine conversation Claude**
**Date de décision** : 19 avril 2026
**Arbitrage Ahmed** : Option B (3 plateformes) + UX guidée (select + URL)

---

## 🎯 Objectif

Étendre le formulaire "Ajouter une vidéo" de TraceUP pour accepter **3 plateformes** (YouTube + Dailymotion + Vimeo), au lieu de YouTube uniquement dans le canon actuel.

Cette extension couvre la demande explicite du cahier des charges client (page 2 du PDF `Structure_des_Donne_es_et_Formulaires_MarketUP` — section 3 TraceUP).

> Citation client : *"Lien source : (URL YouTube, DailyMotion, Vimeo ou Website entreprise)"*

**Note** : "Website entreprise" est **exclu** de V1 (trop flou — nécessite clarification client). À reclarifier pour V1.1.

---

## 📋 Périmètre à patcher

### Fichiers impactés

| Fichier | Type de modification |
|---|---|
| `dashboard_traceup.html` | Modal "Ajouter une vidéo" · badge source par vidéo dans la liste |
| `public_traceup_profile.html` | Rendu embed multi-plateforme dans la galerie vidéo |
| `moteur_de_recherche-traceup.html` | Miniatures multi-plateforme dans les cards résultats |
| `popup_traceup.html` | Player embed multi-plateforme |
| `dashboard_traceup_popup.html` | Player embed multi-plateforme (composant dashboard) |

### Fichiers NON impactés

- BrandUP, LinkUP (pas de vidéos)
- Auth, Onboarding (aucune référence vidéo)
- Autres pages dashboard (Boost, Sponsoring, RSE, etc.)

---

## 🎨 Canon UX — Modal "Ajouter une vidéo" (guidé)

### Structure du formulaire

```
┌────────────────────────────────────────────┐
│ Ajouter une vidéo                       × │
├────────────────────────────────────────────┤
│                                            │
│ PLATEFORME *                               │
│ [ Sélectionner une plateforme       ▾ ]   │
│    · YouTube                               │
│    · Dailymotion                           │
│    · Vimeo                                 │
│                                            │
│ URL VIDÉO *                                │
│ [ 🔗 https://...                       ]   │
│ ℹ️ Collez l'URL publique de la vidéo       │
│                                            │
│ CATÉGORIE *                                │
│ [ ○ Actualité  ○ Offres  ○ Astuces        │
│   ○ Emplois ]                              │
│                                            │
│ TITRE DE LA VIDÉO *                        │
│ [ Ex : Inauguration de nos ateliers  ]    │
│ 120 caractères max                         │
│                                            │
│ DESCRIPTION COURTE                         │
│ [ Contexte de la vidéo (optionnel)   ]    │
│ 280 caractères max                         │
│                                            │
├────────────────────────────────────────────┤
│              [Annuler] [Ajouter la vidéo]  │
└────────────────────────────────────────────┘
```

### Règles d'interaction

- **Champ URL dynamique selon plateforme** :
  - YouTube → placeholder `https://www.youtube.com/watch?v=...`
  - Dailymotion → placeholder `https://www.dailymotion.com/video/...`
  - Vimeo → placeholder `https://vimeo.com/...`
- **Texte d'aide sous l'URL** : formats acceptés par plateforme
  - YouTube : `youtube.com/watch?v=…` · `youtu.be/…` · `youtube.com/shorts/…`
  - Dailymotion : `dailymotion.com/video/…` · `dai.ly/…`
  - Vimeo : `vimeo.com/…` (URL publique)
- **Validation front** : regex selon plateforme sélectionnée
- **Bouton "Ajouter la vidéo"** : disabled tant que URL invalide
- **Miniature auto-récupérée côté serveur** (pas de preview dans le modal V1)

### Icônes canon des plateformes

Utiliser Material Symbols Outlined :
- YouTube → `smart_display` (reste canon) · couleur `#FF0000`
- Dailymotion → `play_circle` · couleur `#0066DC`
- Vimeo → `movie` · couleur `#1AB7EA`

**ATTENTION** : respecter la règle canon "pas de logo propriétaire" → utiliser les icônes Material génériques colorées, pas les logos officiels des plateformes (évite conflits de marque).

---

## 🧱 Structure de données canon

### Schéma MongoDB (à documenter)

```js
{
  _id: ObjectId,
  profileId: ObjectId,           // Ref vers profil TraceUP
  category: String,              // "actualite" | "offres" | "astuces" | "emplois"
  source: String,                // "youtube" | "dailymotion" | "vimeo"
  videoId: String,               // ID extrait selon plateforme
  videoUrl: String,              // URL originale (backup + clic externe)
  thumbnailUrl: String,          // URL miniature (auto-récupérée)
  title: String,                 // 120 caractères max, multilingue
  description: String,           // 280 caractères max, optionnel
  status: String,                // "pending" | "active" | "rejected"
  rejectReason: String,          // si rejected
  publishedAt: Date,             // auto-set à l'approbation
  createdAt: Date,
  updatedAt: Date,
}
```

### Helpers d'extraction (à implémenter côté serveur)

```js
// Regex d'extraction d'ID par plateforme
const VIDEO_PATTERNS = {
  youtube: [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  dailymotion: [
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    /dai\.ly\/([a-zA-Z0-9]+)/,
  ],
  vimeo: [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/channels\/[^\/]+\/(\d+)/,
  ],
};

// URLs d'embed selon plateforme
const EMBED_URLS = {
  youtube: (id) => `https://www.youtube.com/embed/${id}`,
  dailymotion: (id) => `https://www.dailymotion.com/embed/video/${id}`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}`,
};

// Thumbnails selon plateforme
// YouTube : accessible sans auth ni API key
//   https://img.youtube.com/vi/{ID}/hqdefault.jpg
// Dailymotion : via oEmbed API (serveur → récupère et cache)
//   https://www.dailymotion.com/services/oembed?url={URL}&format=json
// Vimeo : via oEmbed API (serveur → récupère et cache)
//   https://vimeo.com/api/oembed.json?url={URL}
```

---

## 🎨 Affichage canon dans la liste (dashboard TraceUP)

Chaque card vidéo doit afficher un **badge source** discret en coin de la miniature :

```
┌──────────────────────────────────────┐
│ [▶ Thumbnail]   Titre de la vidéo    │
│  ┌────┐         Description courte   │
│  │ YT │         [Catégorie] · 2j     │
│  └────┘         [📎 youtu.be/...]    │
│                              [🗑 Suppr]│
└──────────────────────────────────────┘
```

Badge source (top-left de la miniature) :
- Pastille 20×20 avec couleur de la plateforme + initiale
  - YouTube : `bg-[#FF0000]` + `YT` blanc
  - Dailymotion : `bg-[#0066DC]` + `DM` blanc
  - Vimeo : `bg-[#1AB7EA]` + `V` blanc

---

## 📱 Rendu embed canon (pages publiques + popup)

### Structure iframe uniforme

```html
<div class="video-embed aspect-video rounded-lg overflow-hidden">
  <iframe
    src="{embedUrl}"
    title="{videoTitle}"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    loading="lazy"
    class="w-full h-full"
  ></iframe>
</div>
```

Les 3 plateformes supportent `allowfullscreen` + lazy-loading. Les permissions `allow=...` sont identiques (YouTube les accepte toutes, les autres ignorent celles qu'elles ne supportent pas).

---

## ⚠️ Points techniques critiques

### CORS et embed

- ✅ YouTube : toujours embeddable sauf vidéos privées / restrictions d'âge
- ✅ Dailymotion : embeddable par défaut
- 🟠 Vimeo : certaines vidéos sont **embed-restricted par domaine**. L'admin devra valider que la vidéo s'affiche bien lors de la modération.

### oEmbed côté serveur (pas client)

**IMPÉRATIF** : les appels oEmbed (Dailymotion + Vimeo) doivent se faire **côté serveur** lors de l'ajout de la vidéo, pas à chaque affichage :
- Évite les rate-limits
- Cache le thumbnail dans MongoDB (`thumbnailUrl`)
- Permet de re-uploader sur MARKET-UP CDN si besoin (phase ultérieure)

### Validation admin

L'ajout d'une vidéo déclenche-t-il une revalidation admin ?
- **Canon actuel** (dashboard_traceup.html) : **NON**, ajout/suppression libre
- **Spec client** : "Chaque modification de champ sensible (Pitch, Vidéo, Preuve RSE) passe par une file d'attente de modération"

→ **Conflit à trancher** : le client dit que les vidéos sont sensibles mais le canon actuel ne fait pas de modération. Ma recommandation : **conserver le canon actuel** (pas de modération par vidéo) pour éviter un goulot admin sur ce module. Alternative : modération uniquement sur la **première** vidéo soumise par profil.

---

## 🔍 Alignement avec la narration Option 4

Rappel : dans la démo actuelle, **TraceUP est en Brouillon** avec modifications non soumises. Donc les vidéos sont affichées mais le profil n'est pas public.

Le patch doit donc :
- Fonctionner pareil quel que soit l'état (Brouillon/Actif/etc.)
- Ne pas bloquer l'ajout/édition en état Brouillon
- Les exemples démo actuels (6 vidéos dans les 4 catégories) doivent être distribués sur les 3 plateformes pour démontrer le support multi-source

### Distribution suggérée des 6 vidéos démo

| # | Catégorie | Plateforme | Raison |
|---|---|---|---|
| 1 | Actualité | YouTube | Canonique |
| 2 | Actualité | Vimeo | Démontrer Vimeo |
| 3 | Actualité | Dailymotion | Démontrer Dailymotion |
| 4 | Offres | YouTube | Canonique |
| 5 | Emplois | Vimeo | Variété |
| 6 | Emplois | YouTube | Canonique |

---

## 📝 Note pour le `PROJET_CLAUDE_TRANSFERT.md`

Ajouter dans la section "CANON PROFILS" un nouveau sous-titre **"TraceUP — Sources vidéo supportées"** avec le contenu résumé suivant :

```markdown
### TraceUP — Sources vidéo supportées (canon V1)

3 plateformes d'embed acceptées (cahier des charges client PDF section 3) :
- **YouTube** : `youtube.com/watch` · `youtu.be/` · `youtube.com/shorts/`
- **Dailymotion** : `dailymotion.com/video/` · `dai.ly/`
- **Vimeo** : `vimeo.com/` (URL publique, certaines vidéos peuvent être embed-restricted)

UX du modal d'ajout : **select Plateforme → champ URL → catégorie → titre → description**
Stockage MongoDB : `{source, videoId, videoUrl, thumbnailUrl}` (extraction côté serveur)
Thumbnails : YouTube API directe · Dailymotion + Vimeo via oEmbed côté serveur (cache thumbnailUrl en DB)

**"Website entreprise"** (mentionné dans le PDF client) = **hors scope V1**, à reclarifier pour V1.1
(ambigu : URL MP4 auto-hébergée ? lien vers page avec vidéo embedded ? flux HLS ?)

**Modération** : pas de revalidation admin à chaque vidéo (ajout libre) — en écart léger avec la spec
qui classe la vidéo comme "champ sensible". Décision Ahmed (19/04/2026) : maintenir ajout libre
pour éviter un goulot admin sur ce module.
```

---

## ✅ Checklist du patch à produire

- [ ] Modifier le modal "Ajouter une vidéo" dans `dashboard_traceup.html` (select + placeholder dynamique + validation regex)
- [ ] Ajouter les badges source (YT/DM/V) sur chaque card vidéo de la liste
- [ ] Redistribuer les 6 vidéos démo sur les 3 plateformes
- [ ] Patcher le rendu embed dans `public_traceup_profile.html`
- [ ] Patcher le rendu embed dans `moteur_de_recherche-traceup.html`
- [ ] Patcher le player embed dans `popup_traceup.html` et `dashboard_traceup_popup.html`
- [ ] Ajouter la section "TraceUP — Sources vidéo" au `PROJET_CLAUDE_TRANSFERT.md`
- [ ] Validation cross-pages : cohérence de la narration vidéo multi-plateforme

---

## 🎯 Prompt de démarrage pour la nouvelle conversation

> *"Reprends le projet MARKET-UP depuis `PROJET_CLAUDE_TRANSFERT.md`. Je veux maintenant patcher le module vidéo TraceUP pour accepter YouTube + Dailymotion + Vimeo (au lieu de YouTube seul). Utilise le brief `BRIEF_PATCH_VIDEO_SOURCES.md` que j'ai uploadé dans le projet. Commence par me montrer ton plan avant de produire les patches."*