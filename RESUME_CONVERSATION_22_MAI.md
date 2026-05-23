# RESUME — Session Claude.ai du 22 mai 2026

## Etat final du projet

- Tag : `pre-demo-improvements` pushe sur GitHub
- npm run build : PASS
- Tests : 34/34 green
- Phase 4 + 5 + 6 + Pre-demo improvements : COMPLETE
- Deploy OVH : fait par equipe parallele
- Demo client : a venir

## Pre-demo improvements (sprints 7) accomplis cette session

### Sprint 7X — Profils auto a signup (BUG CRITIQUE resolu)
- Avant : nouveau user cree n'avait AUCUN profil (Aggregax 0 profils)
- Cause : oubli originel Phase 2 (aucun code production creait les profils)
- Fix : verifyOtp() cree les 3 profils via discriminator models (BrandUpModel/TraceUpModel/LinkUpModel)
- Filet lazy au login : si countDocuments < 3, cree les profils manquants (couvre comptes existants)
- Bug subtil debloque : ProfileModel.create({kind}) ne fonctionnait pas avec discriminators Mongoose. Remplace par PROFILE_MODELS[kind].create() qui injecte automatiquement kind + applique defaults data specifiques au sub-schema

### Sprint 7A — Cacher Certifications BrandUP public
- BrandUpPublic.tsx : section certifications wrapee `{false && ...}`
- V1.1 : reactivation simple en retirant le `false &&`

### Sprint 7B + 7B+ — Admin visibility console-style
- /admin/validation/profiles/[id] : layout dashboard style + tags "MODIFIE" + tooltip ancien
- /admin/validation/comptes/[id] : 12 champs + section "Profils de cette entreprise" (3 cards)
- /admin/entreprises : bouton "Voir details" sur chaque ligne (redirige vers /admin/validation/comptes/[id])
- Page /admin/validation/profiles/[id] accepte tous status (pas seulement pending)
- Bannieres status lecture seule pour active/rejected/incomplete/disabled

### Sprint 7C + 7C+ + 7C++ + 7C+++ — Tout BrandUP en hard change

#### Architecture
- TOUS les champs BrandUP (pitch, about, gallery) passent par pendingData -> validation admin
- isPublic reste SOFT (toggle owner instantane)
- TraceUP/LinkUP inchanges (canon CLAUDE.md 6.10 preserve)
- Approche C "Snapshot" : gallery est un field dans pendingData.fields[] comme pitch/about
- 1 seul bouton "Enregistrer et soumettre" pour BrandUP (vs 2 pour TraceUP/LinkUP)
- Endpoint DELETE /api/v1/profiles/[id]/pending pour annulation soumission

#### Bugs UX gallery resolus (Sprint 7C+, ++, +++)
- Bug 1+3 : router.refresh() apres submit + cancel (gallery state a jour direct)
- Bug 2 : tags visuels NOUVEAU (vert) / SUPPRIMEE (rouge + opacity) dashboard pending
- Bug 4 : previousStatus stocke dans pendingData -> cancel restaure le bon status (rejected -> rejected, pas active)
  * Bug subtil : pendingData sub-schema Mongoose strict:true strippait silencieusement previousStatus. Ajoute au schema.
- Bug 5 : tags NOUVEAU/SUPPRIMEE egalement cote admin

#### Bug A subtil debloque (Sprint 7C+++)
- Cause : Phase 1 POST /gallery ecrivait l'image dans data.gallery AVANT le hard submit. Le service lisait data.gallery (qui contenait deja la nouvelle image) comme currentValue -> diff currentValue = newValue -> tout "kept", jamais "added"
- Fix v1 : client envoie currentGallery snapshot au submit
- Fix v2 (final) : profile-editor.service.buildBrandUp() lit currentGallery depuis pendingData.fields[gallery].currentValue (snapshot pre-edit) si pending, sinon fallback data.gallery
- Idem cote admin dans admin-profile.service

## Decisions architecturales cles a retenir

1. **Status canon** : pending / active / rejected / suspended / incomplete / deleted
2. **Workflow hard change BrandUP** :
   - User modifie pitch/about/gallery -> bouton "Enregistrer et resoumettre"
   - Tout va dans pendingData.fields[] (snapshot complet pour gallery)
   - pendingData stocke previousStatus pour cancel
   - User peut annuler -> status restaure, pendingData=null
   - Admin valide -> data merge depuis pendingData -> status active
3. **Workflow soft change** :
   - LinkUP socials/website : instantane
   - TraceUP videos : instantane (CLAUDE.md 6.10)
   - isPublic toggle : instantane (droit owner)
   - Account fields (phone, whatsapp, email, address, ville) : instantane + propagent vers tous les profils
4. **Cascade visibility** : isProfileVisible() helper + Company.status="active" + Profile.status="active" + Profile.isPublic=true + Profile.pendingData=null
5. **Creation profils** : 3 profils auto a verifyOtp() + filet lazy au login
6. **Admin console** : navigation libre depuis /admin/entreprises -> /admin/validation/comptes/[id] -> /admin/validation/profiles/[id] avec tous status

## Bugs subtils Mongoose decouverts cette session

1. **immutable: true** silently drops $set (deja fixe Sprint 6.2C pour identityDocumentUrl)
2. **Discriminators** : ProfileModel.create({kind}) ne fonctionne pas, utiliser PROFILE_MODELS[kind].create()
3. **strict: true** schema strippe silencieusement les champs non declares dans sub-schemas (previousStatus dans pendingData)
4. **Phase soft -> Phase hard timing** : POST gallery (soft) updated data AVANT submit (hard) -> diff incorrect

## V1.1 backlog (priorise)

### Phase 5 cleanup
- Validation/redimensionnement images upload (taille max + dimensions normalisees)
- Validation post-creation profil (corruptions discriminators)
- Reactiver Certifications BrandUP public
- Services/socials/certifications editeurs dashboard BrandUP (actuellement seed only)
- Tracking views/clicks publics (POST /public/profiles/:type/:slug/track)
- Sponsoring banner wiring (actuellement statique)
- $text MongoDB index search (actuellement $regex)
- B2C TraceUP seed companies (currently 0)
- Real Open Graph images (Cloudinary transforms vs dicebear)

### Phase 6 cleanup
- channelName + channelDescription TraceUP cleanup sprint (suppression definitive)
- gpsPosition LinkUP -> Account migration (sync depuis Account)
- Resend domain verification (email free tier limits)
- Auth'd dedicated endpoint for rejected PDF re-upload (reutilise /public/signup-document)
- Migration signup-temp/ -> companies/{id}/legal-docs/
- Email user on suspend/reactivate
- Real-time JWT refresh on admin status change
- Admin page for "rejected" companies list

### Architecture
- Path traversal defense LocalAdapter
- Random suffix collision-resistant keys
- Component tests + service tests
- E2E Playwright

## Remarques en attente (Ahmed a clarifier prochaine conversation)

Ahmed va revenir avec quelques petites remarques finales a regler avant la demo.

## Workflow pour la nouvelle conversation Claude.ai

Dans le meme Project, nouveau chat, coller :

```
Bonjour Claude, je travaille sur le projet MARKET-UP avec une equipe Claude.ai + Claude Code.

Phase 4 + 5 + 6 + Pre-demo improvements COMPLETES (tag pre-demo-improvements pushe).
Deploy OVH fait par equipe parallele. npm run build PASS.

Lis PROJECT_TRANSFERT_v3.md et RESUME_CONVERSATION_22_MAI.md dans Project Knowledge pour reprendre le contexte complet.

Etat : je vais te lister quelques petites remarques finales a regler avant la demo client.

Une fois lu, propose-moi un recap 3-5 lignes de l'etat du projet pour validation. Puis je te liste les remarques.
```
