# MARKET-UP — Sprint Changelog

> Extracted from CLAUDE.md §9 for context reduction. Full history of delivered sprints.

## Livres (PP-0 → PP-14.6)

| Sprint | Scope |
|---|---|
| **PP-0** | Setup: Next.js 14, Mongoose, NextAuth, Tailwind, shadcn, middleware, env validation |
| **PP-1** | Models (16 Mongoose), seed script `npm run db:seed` |
| **PP-2** | Auth flow: signup (company+user+OTP), login, forgot/reset password, email validation |
| **PP-3** | Dashboard skeleton: layout, sidebar, topbar, `/me` endpoint |
| **PP-4** | Profile editing: 3 kinds CRUD, soft/hard patterns, gallery, videos |
| **PP-5** | Public search engines (3) + profile pages (3 x `[slug]`) |
| **PP-6** | Admin workspace: validation queues (inscriptions, profils, RSE), company detail, suspend/reactivate |
| **PP-6b** | Geocodage Nominatim au signup (remplace par PP-12.6) |
| **PP-7** | Hard change `displayName` + `pendingUpdates` pattern generique |
| **PP-8** | Hard change `gouvernorat` (bloc unifie multi-fields) |
| **PP-9** | Hard change LinkUP socials (pattern 3-tier profile) |
| **PP-10** | Hard change logo + banner (upload Cloudinary → pendingUpdates) |
| **PP-11** | Hard change TraceUP videos (hybride hard add / soft delete) |
| **PP-11.5** | Visibilite : profil valide reste visible pendant pending/rejected (matrice 4 cas) |
| **PP-12** | Hub admin unifie (4 onglets) + slug lifecycle (regeneration + 301 redirect) |
| **PP-12.5** | Cluster localisation : gouvernorat/ville/adresse en hard change Company |
| **PP-12.6** | GPS par pin Leaflet dans editeur LinkUP, retrait complet Nominatim |
| **SEC-1** | Escape regex recherche (ReDoS + crash) + cleanup UI morts |
| **PP-13** | Changement mot de passe + invalidation sessions (passwordChangedAt) + S8 (suspended/deleted) |
| **PP-14.5** | Mode "Bientot disponible" : placeholderMode (hidden/coming_soon) pour profils masques |
| **PP-14.6** | Cablage toggles visibilite dashboard (Vue d'ensemble) sur soft service PP-14.5 |
| **PP-14** | Delete account (owner self-delete cascade) + Suspend hardening (raison, audit trail, emails, modals) |
| **PP-15a** | Tracking statistiques reel : vues (beacon client) + clics sortants (sendBeacon), collection ProfileStatsMonthly, endpoint POST /track, dashboard tendance mois courant vs mois-1 |
| **PP-15b** | Corbeille admin : onglet Supprimees, fiche detail read-only, restauration cascade inverse symetrique (9 models, match exact timestamp, E1 pending guard), StatusPill deleted |

## V1.1 post-prod (backlog)

| Item | Scope |
|---|---|
| PP-15 | Notifications utilisateur (Pusher real-time + bell dropdown) |
| PP-16 | Langues (AR/EN) — i18n frontend |
| Boost/Sponsoring dynamiques | Checkout flow, paiement reel, campagnes |
| Tracking vues | Compteurs de vues profils (analytics) |
| Facturation reelle | PDF invoices + Excel export admin |
| Cache sessions | TTL ~30s sur jwt() pour reduire DB hits |
| Purge RGPD J+30 | Suppression physique des fichiers Cloudinary/S3 apres soft-delete (30 jours) |
| Corbeille admin | Vue admin des comptes supprimes + restauration potentielle |
| Backlog polish | `V1_1_POLISH_BACKLOG.md` (GPS re-geocode, badge StatusPill isPublic, nom gouvernorat diff admin, etc.) |
