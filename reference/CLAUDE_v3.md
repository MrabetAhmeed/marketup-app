# MARKET-UP — CLAUDE.md
# Master AI Developer Instructions — All Phases
# Platform: vivasky.media
# For use with: Claude Code, Cursor, Windsurf, Copilot, or any AI coding assistant
# ─────────────────────────────────────────────────────────────────────────────

## PROJECT OVERVIEW

MARKET-UP is a national digital platform for Tunisian companies.
It combines 3 independent search engines, institutional profiles, an RSE badge
system, and a monetizable visibility module (Boost & Sponsoring).

The platform has 3 engines, each with its own accent color:
- BrandUP  → Institutional profile   → Blue   #0078D4
- TraceUP  → Media / YouTube profile → Purple #8764B8
- LinkUP   → Contact card profile    → Black + Gold #000 / #C5A059

---

## TECH STACK (non-negotiable)

- Framework    : Next.js 14, App Router, TypeScript
- Database     : MongoDB + Mongoose
- Auth         : NextAuth.js v5, credentials provider (email + password), JWT
- Styling      : Tailwind CSS + shadcn/ui (neutral variant)
- Validation   : Zod (client AND server, always both)
- Uploads dev  : local /public/uploads via API route
- Uploads prod : Cloudinary (env variable toggle)
- Email        : Resend
- Payment V1.2 : Konnect TN or ClicToPay
- Language     : English (all code, comments, variable names)

---

## ABSOLUTE RULES

1. Server Components by default. Add "use client" ONLY when interactivity is required.
2. NEVER expose passwordHash in any API response. Always .select('-passwordHash').
3. NEVER hard delete anything. Use isDeleted:true or status:'disabled'.
4. ALL API routes must validate with Zod before processing.
5. Boost status ALWAYS computed server-side: boostExpiresAt > new Date().
6. viewCount incremented server-side only, never from dashboard or admin views.
7. Slugs always generated with generateSlug(name) from lib/utils.ts — must be unique.
8. All monetary amounts: store in DT (Tunisian Dinar), TVA 19% — store HT, compute TTC = HT * 1.19.
9. Every /api/dashboard/* route: verify session + verify resource ownership before processing.
10. Sector/category values ALWAYS from the official lists below — never invent sector names.
11. legalId field name is used everywhere (NOT rneNumber) — generic across all countries.
12. Email admin ≠ email public — Company.email is admin-only, never displayed publicly.

---

## REFERENCE FILES (in Project Knowledge)

- `Structure_des_Donnees_Formulaires_MarketUP.pdf` — source of truth for all form
  fields, data structure per profile (BrandUP/TraceUP/LinkUP), moderation rules,
  RSE badge behavior. Read before generating any form, MongoDB model or profile editor.

- `Listes_B2B_B2C.pdf` — official lists of 25 B2B sectors and 25 B2C categories.
  Use these EXACT names for all dropdowns, search filters and sector tags.

---

## OFFICIAL SECTOR / CATEGORY LISTS

### B2B — 25 Secteurs (from Listes_B2B_B2C.pdf)
```
Pôle Industrie & Production:
  1. Agro-Industrie & Transformation
  2. Textile, Confection & Habillement
  3. Plasturgie, Chimie & Matériaux
  4. Métallurgie, Sidérurgie & Mécanique
  5. Machinerie, Robotique & Automatisme
  6. Packaging, Imprimerie & Édition
  7. Maintenance & Maintenance Industrielle

Pôle Bâtiment & Infrastructure:
  8. BTP & Matériaux de Construction
  9. Énergie, Électricité & Environnement
  10. Immobilier Professionnel

Pôle Logistique & Mobilité:
  11. Logistique, Transport & Transit
  12. Automobile Professionnel & Flottes

Pôle Commerce & International:
  13. Commerce de Gros & Distribution
  14. Négoce & Import-Export

Pôle Technologie & Digital:
  15. IT, Logiciels & Solutions Cloud
  16. Télécoms, Réseaux & Cybersécurité

Pôle Finance & Conseil:
  17. Banques, Leasing & Micro-finance
  18. Conseils, Audit & Expertise Comptable
  19. Assurances Professionnelles

Pôle Santé & Services Spécialisés:
  20. Santé & Équipements Médicaux
  21. Hôtellerie, Restauration & CHR
  22. Services Généraux & Nettoyage Pro
  23. Sécurité, Gardiennage & Protection
  24. Ressources Humaines & Recrutement
  25. Artisanat d'Exportation & Design
```

### B2C — 25 Catégories (from Listes_B2B_B2C.pdf)
```
Se nourrir & Savourer:
  1. Manger & Sortir
  2. Faire ses courses

S'habiller & Rayonner:
  3. S'habiller & Se chausser
  4. Se faire beau / belle
  5. S'offrir du luxe

Se loger & Aménager:
  6. Se loger
  7. Décorer & Meubler
  8. Bricoler & Jardiner

Se déplacer & Voyager:
  9. Se déplacer (Auto/Moto)
  10. Entretenir son véhicule
  11. Voyager & S'évader
  12. Déménager

Prendre soin de soi & des siens:
  13. Se soigner
  14. Se ressourcer
  15. S'occuper des enfants
  16. Apprendre & Se former
  17. Soigner ses animaux

Bouger & Se divertir:
  18. Faire du sport
  19. Se divertir
  20. Découvrir le terroir

Gérer & Réparer:
  21. Réparer sa maison
  22. Dépanner son matériel
  23. Gérer son argent & s'assurer
  24. S'occuper de son linge

Célébrer:
  25. Organiser un événement
```

The client explicitly requires the visual style of microsoft.com and office.com.
This is Microsoft Fluent Design System 2. Apply it strictly and consistently across
every page, component, and state.

### Font
```css
font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
/* Google Fonts fallback: 'Plus Jakarta Sans' */
```
- Title weight: 600–700 (never 800+ on headings)
- Letter spacing: -0.01em to -0.02em on titles, normal on body
- Body size: 14–16px, line-height: 1.5
- Text primary: #242424 (NOT pure black #000000)
- Never use ALL CAPS on headings

### Color Palette (exact — do not improvise)
```css
--ms-blue:          #0078D4;  /* Primary action */
--ms-blue-hover:    #106EBE;  /* Hover state */
--ms-blue-light:    #EFF6FC;  /* Light backgrounds, badges */
--ms-blue-dark:     #005A9E;  /* Pressed state */
--ms-text:          #242424;  /* Primary text */
--ms-text-muted:    #616161;  /* Secondary text */
--ms-bg:            #FFFFFF;  /* Page background */
--ms-bg-subtle:     #F5F5F5;  /* Section backgrounds */
--ms-border:        #E0E0E0;  /* Default borders */
--ms-border-strong: #D1D1D1;  /* Input borders */
--ms-success:       #107C10;  /* Microsoft green */
--ms-error:         #D13438;  /* Microsoft red */
--ms-sidebar:       #1F1F1F;  /* Dashboard sidebar background */
--ms-gold:          #C5A059;  /* RSE badge accent only */
```

### Border Radius (Fluent 2 — strict)
```
Badges, tags, inputs, small elements : 4px
Buttons, cards, dropdowns            : 8px   ← most common
Modals, large panels, drawers        : 12px
```
- NEVER use rounded-full (50%) on cards or primary buttons
- Pills/tags CAN use rounded-full only for small status dot indicators

### Shadows (subtle — Microsoft style)
```css
/* Card resting  */ box-shadow: 0 2px 4px rgba(0,0,0,0.08);
/* Card hover    */ box-shadow: 0 4px 16px rgba(0,0,0,0.12);
/* Modal         */ box-shadow: 0 8px 32px rgba(0,0,0,0.16);
```
- NO colored shadows (no blue glow, no colored drop-shadow)

### Buttons
```css
/* Primary   */ bg: #0078D4; color: white; radius: 4px; padding: 8px 20px; font-weight: 600;
/* Hover     */ bg: #106EBE;
/* Active    */ bg: #005A9E;
/* Secondary */ bg: transparent; border: 1.5px solid #0078D4; color: #0078D4; radius: 4px;
/* Ghost     */ bg: transparent; border: none; color: #0078D4; hover-bg: #EFF6FC;
```
- NO gradients on any button
- NO box-shadow on buttons (flat Fluent style)

### Cards
```css
background: #FFFFFF;
border: 1px solid #E0E0E0;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0,0,0,0.08);
padding: 20px; /* or 24px */

/* Hover */
border-color: #0078D4;
box-shadow: 0 4px 16px rgba(0,0,0,0.12);
```
- NO colored card backgrounds (except #F5F5F5 for secondary/muted cards)

### Search Result Cards — Golden Ratio Proportions (φ = 1.618)

Search engine cards use the golden ratio for image/text balance.
The text zone dominates (major), image zone is the anchor (minor).

```
Card total height : min-h-[260px]
Image zone        : h-[107px]  = 38% ← minor part (φ²)
Text zone         : ~153px     = 62% ← major part (φ)
Grid              : 4 columns desktop (gap-5), 2 mobile
```

#### Image Zone — 3 Variants (priority order)

```
PRIORITY 1 — Cover photo exists:
  Container : h-[107px] bg-[#F5F5F5] p-2 relative flex-shrink-0
  Image     : w-full h-full object-cover rounded-[6px]
              group-hover:scale-105 transition-transform duration-300
  Use when  : company.coverImage is set

PRIORITY 2 — Logo exists, no cover photo:
  Container : h-[107px] bg-[#F5F5F5] p-2 flex items-center
              justify-center flex-shrink-0
  Inner box : w-[72px] h-[72px] bg-white border border-[#E8E8E8]
              rounded-lg shadow-sm flex items-center justify-center
  Image     : max-w-[56px] max-h-[48px] object-contain
  Use when  : company.logo exists AND company.coverImage is null

PRIORITY 3 — No cover, no logo:
  Container : h-[107px] bg-[#F5F5F5] p-2 flex items-center
              justify-center flex-shrink-0
  Circle    : w-[40px] h-[40px] rounded-full flex items-center
              justify-center text-white font-bold text-lg
              bg color derived deterministically from company name
  Content   : 2 initials from company name, uppercase
  Use when  : both company.logo and company.coverImage are null
```

#### Card Body Structure (top to bottom)
```
px-[16px] pt-[14px] pb-[12px] flex flex-col flex-grow

1. Company name   : text-[15px] font-bold #242424, mb-2, 1 line clamp
2. Pitch text     : text-[13px] #616161, line-clamp-2, leading-[1.6],
                    flex-grow, mb-2.5
3. Sector tag     : inline-block bg-[#F0F0F0] text-[#616161] text-[11px]
                    font-medium px-2 py-0.5 rounded-[4px] mb-2
──────────────────────────────────────────
4. Footer         : border-t border-[#F0F0F0] px-[16px] py-2.5
                    flex justify-between items-center mt-auto
   Left  : pin icon + city name, text-[11px] #616161
   Right : RSE badge XS (only if badgeActive) — else nothing
```

#### Boosted Cards
```
border-t-2 border-t-[#0078D4]  ← thin blue top accent
AD indicator : absolute top-[6px] right-[6px]
               w-[22px] h-[22px] bg-white rounded-full
               border border-slate-200 shadow-sm
               text "AD" — text-[8px] font-[800] text-slate-800
```

#### RSE Badge — 3 scales (consistent token system)
```
XS — card footer (20px):
  bg-[#FEFCE8] border border-[#E8C96A] px-2 py-1 rounded h-[20px]
  ★ star icon (yellow-500, 12px) + "RSE" (text-[10px] font-bold yellow-800)
  Show ONLY if badgeActive — show NOTHING if no badge

SM — profile header pill (28px):
  Same colors + "Engagement Social Attesté" (11px bold #92701F)

LG — certification block (standalone):
  w-[120px] white bg, border 2px #1A1A1A, radius 6px, centered
  "ENGAGEMENT" — 8px bold uppercase #616161
  "RSE"        — 32px weight-900 #C5A059
  "ATTESTÉ"    — 8px bold uppercase #1A1A1A
  Separators   : 1px #E8E8E8 between zones

Label : always "Attesté" (NEVER "certifié")
```

### Form Inputs
```css
border: 1px solid #D1D1D1; border-radius: 4px;
/* Focus */ border-color: #0078D4; box-shadow: 0 0 0 2px #EFF6FC;
/* Label */ font-size: 12px; font-weight: 600; color: #616161;
           text-transform: uppercase; letter-spacing: 0.04em;
/* Placeholder */ color: #A0A0A0;
/* Error */ border-color: #D13438;
```

### Dashboard Sidebar (office.com style)
```css
/* Container    */ background: #1F1F1F;
/* Logo area    */ padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
/* Nav resting  */ color: rgba(255,255,255,0.65); icon: rgba(255,255,255,0.45);
/* Nav hover    */ background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9);
/* Nav active   */ background: rgba(0,120,212,0.2); color: #60AFFE;
                   border-left: 3px solid #0078D4;
/* Section label*/ font-size: 9px; font-weight: 700; letter-spacing: 0.15em;
                   color: rgba(255,255,255,0.25); text-transform: uppercase;
/* User bottom  */ border-top: 1px solid rgba(255,255,255,0.08);
```

### Layout & Spacing
- Base unit: 8px — use multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48
- Page max-width: 1280px centered
- Section padding: 40px–64px vertical
- Card grid gap: 16px or 24px
- Use whitespace to separate sections — avoid decorative dividers

### Tables
```css
/* Header */ bg: #F5F5F5; font-weight: 600; font-size: 12px; text-transform: uppercase;
/* Row hover */ bg: #F5F5F5;
/* Border */ border-bottom: 1px solid #E0E0E0 on each row (no full grid borders)
/* Cell padding */ 12px 16px;
```

### Badges & Status Tags
```css
/* Active   */ bg: #F0FDF4; color: #107C10; border: 1px solid #B7EBC0; radius: 4px;
/* Pending  */ bg: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; radius: 4px;
/* Disabled */ bg: #F5F5F5; color: #616161; border: 1px solid #E0E0E0; radius: 4px;
/* Boosted  */ bg: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; radius: 4px;
/* RSE      */ bg: #FEFCE8; color: #C5A059; border: 1px solid #FDE68A; radius: 4px;
```

### Toggle (Microsoft Fluent style)
```css
/* Track off */ background: #C7C7C7; width: 40px; height: 20px; border-radius: 10px;
/* Track on  */ background: #0078D4;
/* Thumb     */ background: white; width: 16px; height: 16px; border-radius: 50%;
               box-shadow: 0 1px 3px rgba(0,0,0,0.2);
/* Transition*/ 200ms ease;
```

### Iconography
- Use Lucide React (included with shadcn/ui) — outline style, stroke-width: 1.5
- Sizes: 16px inline, 20px in nav, 24px in feature sections

### What to AVOID
- NO purple gradients or colorful hero backgrounds
- NO glassmorphism (backdrop-filter: blur on cards)
- NO heavy drop shadows or neon glows
- NO rounded-full on cards or standard buttons
- NO font-weight 900 or ultra-condensed typography
- NO decorative illustrations or abstract shapes in UI
- NO emoji in UI labels or buttons
- NO colored card backgrounds (keep cards white)
- Target feel: clean, structured, professional enterprise SaaS

---

## MONGODB MODELS

### Company
```typescript
{
  slug:             string   // unique, auto-generated from name
  email:            string   // unique — email administrateur (non affiché public)
  passwordHash:     string   // bcrypt rounds:12 — NEVER expose
  type:             'B2B' | 'B2C'
  country:          string   // default: 'TN' — multi-pays prévu
  name:             string   // raison sociale complète
  legalId:          string   // Identifiant légal (RNE Tunisie / SIRET France / VAT EU)
  taxId?:           string   // Matricule fiscal (optionnel selon pays)
  phone?:           string
  whatsapp?:        string
  logo?:            string   // image URL (format carré haute résolution)
  coverImage?:      string   // image de couverture pour cards de recherche
  primaryLanguage:  string   // default: 'fr' — langue par défaut du profil
  secondaryLanguages: string[] // ['ar', 'en'] — autres langues disponibles
  role:             'company' | 'admin'  // default: 'company'
  status:           'pending' | 'active' | 'suspended'  // default: 'pending'
  emailVerified:    boolean  // default: false
  isDeleted:        boolean  // default: false
  createdAt, updatedAt
}
// NOTE: email administrateur ≠ email public contact
// L'email de contact public est dans BrandUpProfile.email et LinkUpProfile.email
```

### BrandUpProfile
```typescript
{
  companyId:        ObjectId → Company
  slug:             string
  status:           'pending' | 'active' | 'disabled'
  // Multilingual fields — object keyed by language code
  shortDescription? Record<string, string>  // { fr: '...', en: '...', ar: '...' }
  about?:           Record<string, string>  // pitch multilingue
  // Location
  sector?:          string   // from official B2B/B2C list — see Listes_B2B_B2C.pdf
  city?:            string
  governorate?:     string   // gouvernorat (affiché sur les cards)
  address?:         string
  gpsUrl?:          string   // Google Maps URL
  // Contact public (≠ email admin)
  phone?:           string
  phoneStandard?:   string
  whatsapp?:        string
  email?:           string   // email de contact public
  // Company stats
  foundedYear?:     number
  employeesCount?:  number
  clientsCount?:    number
  // Certifications (ISO 9001, IATF 16949, labels écologiques, etc.)
  certifications:   Array<{ name: string, year?: number }>
  // Gallery — photos with multilingual names
  gallery:          Array<{
    url:            string
    uploadedAt:     Date
    name?:          Record<string, string>  // { fr: 'Produit X', en: 'Product X' }
  }>  // max 10
  isBoostActive:    boolean
  boostExpiresAt?:  Date
  viewCount:        number
  adminNote?:       string
  createdAt, updatedAt
}
```

### TraceUpProfile
```typescript
{
  companyId:      ObjectId → Company
  slug:           string
  status:         'pending' | 'active' | 'disabled'
  videos:         Array<{
    // Source URL — YouTube, DailyMotion, Vimeo OU site web entreprise
    videoUrl:     string
    sourceType:   'youtube' | 'dailymotion' | 'vimeo' | 'website'
    videoId?:     string   // extracted ID for thumbnail generation
    // Multilingual fields
    title:        Record<string, string>  // { fr: '...', en: '...', ar: '...' }
    description?: Record<string, string>
    category:     'actus' | 'offres' | 'astuces' | 'emplois'
    // NOTE: 'actus' (pas 'actualite') — nom officiel selon le document client
    publishedAt:  Date     // automatique ou manuelle
    addedAt:      Date     // date d'ajout dans la plateforme
  }>
  isBoostActive:  boolean
  boostExpiresAt? Date
  viewCount:      number
  adminNote?:     string
  createdAt, updatedAt
}

// Thumbnail generation par sourceType:
// youtube     → https://img.youtube.com/vi/[videoId]/mqdefault.jpg
// dailymotion → https://www.dailymotion.com/thumbnail/video/[videoId]
// vimeo       → API Vimeo oEmbed: https://vimeo.com/api/oembed.json?url=[url]
// website     → pas de thumbnail auto — upload manuel ou placeholder
```

### LinkUpProfile
```typescript
{
  companyId:      ObjectId → Company
  slug:           string
  status:         'pending' | 'active' | 'disabled'
  // Contacts obligatoires
  phoneStandard:  string   // avec indicatif pays automatique
  whatsapp:       string   // numéro WhatsApp Business — required for publication
  emailPublic?:   string   // email de devis/contact public
  address?:       string   // adresse physique texte complet
  gpsUrl:         string   // Google Maps URL — required for publication
  // Site web officiel
  website?:       string
  // Réseaux sociaux DYNAMIQUES (bouton "Ajouter un RS")
  // L'entreprise choisit parmi une liste prédéfinie extensible
  socialLinks:    Array<{
    platform:     string   // 'linkedin' | 'facebook' | 'instagram' | 'youtube'
                           // | 'twitter' | 'tiktok' | 'snapchat' | 'pinterest'
                           // | 'telegram' | 'vimeo' | 'dailymotion' | ...
                           // Liste extensible par l'admin MARKET-UP
    url:          string
    displayOrder: number   // ordre d'affichage choisi par l'entreprise
  }>
  // Liens auto-générés vers les autres profils MARKET-UP (non modifiables)
  // brandupUrl et tracupUrl sont construits depuis le slug — pas stockés
  isBoostActive:  boolean
  boostExpiresAt? Date
  viewCount:      number
  adminNote?:     string
  createdAt, updatedAt
}

// RÈGLE PUBLICATION: phoneStandard + whatsapp + gpsUrl obligatoires
// Les socialLinks sont tous optionnels — card masquée si url vide
// L'ordre d'affichage: BrandUP → TraceUP → website → socialLinks (par displayOrder)
```

### RSEBadge
```typescript
{
  companyId:   ObjectId → Company  // unique per company
  badgeActive: boolean
  // Clic sur le badge → page /company/[slug]/rse
  // Cette page affiche: preuves de dons + lien vers profil TraceUP
  // (TraceUP est le coeur RSE car vidéos axées sur engagement social)
  donations:   Array<{
    beneficiary: string   // nom association / organisme bénéficiaire
    amount:      number
    receiptUrl:  string   // image uploadée (reçu ou attestation)
    status:      'pending' | 'validated' | 'rejected'
    adminNote?:  string
    validatedAt? Date
    createdAt:   Date
  }>
}
// Les 2 derniers dons validés sont affichés publiquement sur les 3 profils
// Stockés une seule fois — partagés BrandUP + TraceUP + LinkUP
```
```

### Sponsoring
```typescript
{
  companyId?:  ObjectId   // null if created by admin
  name:        string
  imageUrl:    string
  targetUrl:   string
  sector:      string     // 'generic' or specific sector
  status:      'pending' | 'active' | 'inactive'
  clickCount:  number
  startDate?:  Date
  endDate?:    Date
  createdAt, updatedAt
}
```

### Boost
```typescript
{
  companyId:     ObjectId → Company
  profileType:   'brandup' | 'traceup' | 'linkup'
  profileId:     ObjectId
  status:        'active' | 'expired' | 'cancelled'
  startDate:     Date
  endDate:       Date
  amount:        number   // HT in DT
  amountTTC:     number   // HT * 1.19
  paymentRef?:   string
  paymentStatus: 'pending' | 'paid' | 'failed'
  viewsAtStart:  number   // profile.viewCount at boost start
  createdAt, updatedAt
}
```

### SponsoringOrder
```typescript
{
  companyId:     ObjectId → Company
  sponsoringId?: ObjectId → Sponsoring
  name:          string
  imageUrl:      string
  targetUrl:     string
  sector:        string
  desiredStart?: Date
  desiredEnd?:   Date
  amount?:       number
  amountTTC?:    number
  paymentRef?:   string
  paymentStatus: 'pending' | 'paid' | 'failed'
  adminStatus:   'pending' | 'approved' | 'rejected'
  adminNote?:    string
  createdAt, updatedAt
}
```

### Notification
```typescript
{
  companyId: ObjectId → Company
  type:
    | 'account_approved'
    | 'profile_validated'    // data: { profileType }
    | 'profile_rejected'     // data: { profileType, reason }
    | 'account_suspended'    // data: { reason }
    | 'rse_validated'
    | 'rse_rejected'         // data: { reason }
    | 'boost_activated'      // data: { profileType }
    | 'boost_expiring_soon'  // data: { profileType, daysLeft }
    | 'sponsoring_approved'
    | 'sponsoring_rejected'  // data: { reason }
  data?:     Record<string, any>
  isRead:    boolean
  emailSent: boolean
  createdAt, updatedAt
}
```

### BillingRecord
```typescript
{
  companyId:     ObjectId → Company
  type:          'boost' | 'sponsoring'
  referenceId:   ObjectId
  label:         string     // e.g. 'Boost BrandUP - 30 jours'
  amount:        number     // HT
  tva:           number     // HT * 0.19
  amountTTC:     number
  status:        'paid' | 'failed' | 'refunded'
  paymentRef?:   string
  invoiceNumber: string     // unique, e.g. 'MU-2026-00042'
  paidAt?:       Date
  createdAt, updatedAt
}
```

---

## COMPLETE ROUTE MAP

### Public routes (no auth)
```
/                          Landing page
/onboarding                B2B / B2C choice
/brandup                   BrandUp search engine
/brandup/[slug]            BrandUp public profile
/traceup                   TraceUp search engine
/traceup/[slug]            TraceUp public profile
/linkup                    LinkUp search engine
/linkup/[slug]             LinkUp public profile
/signin                    Company login
/signup                    Company registration (3 steps)
/reset-password            Request password reset
/new-password              Set new password
```

### Protected — Company dashboard
```
/dashboard                 Overview: stats, profiles, boost, RSE, shortcuts
/dashboard/account         Company info + logo + sharing + QR code
/dashboard/brandup         BrandUp editor + gallery + boost shortcut
/dashboard/traceup         TraceUp video manager + boost shortcut
/dashboard/linkup          LinkUp links + QR code + boost shortcut
/dashboard/boost           Tab 1: buy boost / Tab 2: boost history
/dashboard/sponsoring      Tab 1: buy sponsoring / Tab 2: campaign history
/dashboard/rse             RSE badge + donations + new donation
/dashboard/billing         Payment history + PDF invoices
/dashboard/notifications   Notification center
/dashboard/settings        Password change
```

---

## FOLDER STRUCTURE

```
market-up/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── brandup/page.tsx
│   │   ├── brandup/[slug]/page.tsx
│   │   ├── traceup/page.tsx
│   │   ├── traceup/[slug]/page.tsx
│   │   ├── linkup/page.tsx
│   │   └── linkup/[slug]/page.tsx
│   ├── (auth)/
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── new-password/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── account/page.tsx
│   │   ├── brandup/page.tsx
│   │   ├── traceup/page.tsx
│   │   ├── linkup/page.tsx
│   │   ├── boost/page.tsx
│   │   ├── sponsoring/page.tsx
│   │   ├── rse/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── companies/route.ts
│   │   ├── companies/[slug]/route.ts
│   │   ├── sponsoring/route.ts
│   │   ├── sponsoring/[id]/click/route.ts
│   │   ├── uploads/route.ts
│   │   ├── dashboard/
│   │   │   ├── stats/route.ts
│   │   │   ├── account/route.ts
│   │   │   ├── brandup/route.ts
│   │   │   ├── traceup/route.ts
│   │   │   ├── traceup/videos/route.ts
│   │   │   ├── traceup/videos/[videoId]/route.ts
│   │   │   ├── linkup/route.ts
│   │   │   ├── boost/route.ts
│   │   │   ├── sponsoring/route.ts
│   │   │   ├── rse/route.ts
│   │   │   ├── billing/route.ts
│   │   │   ├── billing/[id]/pdf/route.ts
│   │   │   ├── notifications/route.ts
│   │   │   ├── notifications/[id]/read/route.ts
│   │   │   ├── notifications/read-all/route.ts
│   │   │   └── settings/route.ts
│   │   └── cron/boost-expiry/route.ts
│   └── not-found.tsx
├── components/
│   ├── ui/                     # shadcn/ui
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── CompanyCard.tsx
│   │   ├── CompanyGrid.tsx
│   │   ├── CompanyModal.tsx
│   │   ├── SponsoringBanner.tsx
│   │   └── Pagination.tsx
│   ├── profiles/
│   │   ├── BrandUpProfile.tsx
│   │   ├── TraceUpProfile.tsx
│   │   └── LinkUpProfile.tsx
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── StatCard.tsx
│   │   ├── ProfileStatusCard.tsx
│   │   ├── BoostModal.tsx
│   │   ├── GalleryUpload.tsx
│   │   ├── VideoManager.tsx
│   │   ├── QRCodeDisplay.tsx
│   │   ├── NotificationItem.tsx
│   │   └── BillingTable.tsx
│   └── shared/
│       ├── Navbar.tsx
│       ├── Footer.tsx
│       ├── RSEBadge.tsx
│       ├── BoostTag.tsx
│       └── CompanyInitials.tsx
├── lib/
│   ├── mongodb.ts
│   ├── auth.ts
│   ├── utils.ts
│   ├── notifications.ts
│   └── validations.ts
├── models/
│   ├── Company.ts
│   ├── BrandUpProfile.ts
│   ├── TraceUpProfile.ts
│   ├── LinkUpProfile.ts
│   ├── RSEBadge.ts
│   ├── Sponsoring.ts
│   ├── Boost.ts
│   ├── SponsoringOrder.ts
│   ├── Notification.ts
│   └── BillingRecord.ts
├── types/index.ts
├── middleware.ts
├── .env.local
└── CLAUDE.md
```

---

## API SPECIFICATIONS

### Public API

#### GET /api/companies — Search
```typescript
// Query params
q?: string        // text search (name, description, sector)
type: 'brandup' | 'traceup' | 'linkup'  // required
sector?: string
city?: string
market?: 'B2B' | 'B2C'
page?: number     // default: 1
limit?: number    // default: 15

// Sort logic:
// 1. Boosted (isBoostActive:true AND boostExpiresAt > now) — shuffled randomly
// 2. Standard — alphabetical by name
// 3. If < 5 boosted → fill line 1 with standard profiles

// Response
{ companies: Company[], total: number, page: number, totalPages: number }
```

#### GET /api/companies/[slug]
```typescript
// Query: type = 'brandup' | 'traceup' | 'linkup'
// Returns: Company + matching profile + RSE (badgeActive + last 2 validated receipts)
// isBoostActive computed: boostExpiresAt > new Date()
// Side effect: viewCount++ (server-side)
// Returns 404 if: not found, isDeleted, status:suspended, profile status !== 'active'
```

#### POST /api/companies — Registration
```typescript
// Body (Zod):
{ name, email, password, type: 'B2B'|'B2C', rneNumber, taxId?, sector, city }
// 1. Check email unique
// 2. bcrypt.hash(password, 12)
// 3. generateSlug(name) — unique
// 4. Create Company (status:'pending', emailVerified:false)
// 5. Create BrandUpProfile + TraceUpProfile + LinkUpProfile (all status:'pending')
// 6. Send confirmation email via Resend
// 7. Return { success: true }
```

#### GET /api/sponsoring
```typescript
// Query: sector? (optional)
// Logic: sector-specific → generic → null (show default banner)
// Active: status:'active' AND startDate <= now AND endDate >= now
```

### Dashboard API (all require session + ownership check)

#### GET /api/dashboard/stats
```typescript
Response: {
  views: { total, brandup, traceup, linkup, totalDelta, brandupDelta, traceupDelta, linkupDelta },
  activeBoost: Boost | null,
  rse: { badgeActive, lastDonation? },
  profiles: { brandup: { status, viewCount }, traceup: { status, viewCount }, linkup: { status, viewCount } },
  unreadNotifications: number,
}
```

#### PUT /api/dashboard/brandup (and /traceup, /linkup)
```typescript
// Profile status logic:
if (isPublic === false) → status = 'disabled'          // immediate, no admin review
if (isPublic === true && currentStatus === 'disabled') → status = 'pending'
if (otherFieldsChanged) → status = 'pending'
// else: keep current status
```

#### POST /api/dashboard/traceup/videos
```typescript
// YouTube URL validation:
const YT_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
// Thumbnail: https://img.youtube.com/vi/${videoId}/mqdefault.jpg
// Adding/removing videos does NOT trigger status: 'pending'
```

#### PUT /api/dashboard/linkup
```typescript
// If isPublic === true: whatsapp AND gpsUrl must be present → else 400
```

#### POST /api/dashboard/boost
```typescript
// Flow: check no active boost → create Boost{paymentStatus:'pending'} →
//       init payment → return { paymentUrl }
// On payment success webhook:
//   Boost.paymentStatus = 'paid'
//   Profile.isBoostActive = true, Profile.boostExpiresAt = endDate
//   Boost.viewsAtStart = profile.viewCount
//   Create BillingRecord + Notification + send email
```

#### GET /api/dashboard/billing/[id]/pdf
```typescript
// Generate PDF invoice with: invoiceNumber, date, label, HT, TVA 19%, TTC,
// AGGREGAX SUARL details, company details
// Library: pdf-lib or @react-pdf/renderer
```

---

## KEY BUSINESS LOGIC SNIPPETS

### Boost active check
```typescript
const isBoostActive = (profile: { isBoostActive: boolean, boostExpiresAt?: Date }) =>
  profile.isBoostActive && profile.boostExpiresAt
    ? new Date(profile.boostExpiresAt) > new Date()
    : false;
```

### Search sort (MongoDB)
```typescript
const pipeline = [
  { $match: { status: 'active', isDeleted: false, ...filters } },
  { $addFields: {
    isCurrentlyBoosted: {
      $and: [{ $eq: ['$isBoostActive', true] }, { $gt: ['$boostExpiresAt', new Date()] }]
    }
  }},
  { $sort: { isCurrentlyBoosted: -1, name: 1 } },
  { $skip: (page - 1) * limit },
  { $limit: limit }
];
// After fetch: shuffle the boosted subset, keep standards in order
```

### RSE last 2 receipts
```typescript
const lastTwoReceipts = rseDoc?.donations
  .filter(d => d.status === 'validated')
  .sort((a, b) => b.validatedAt!.getTime() - a.validatedAt!.getTime())
  .slice(0, 2) ?? [];
```

### Active sponsoring
```typescript
async function getActiveSponsor(sector?: string) {
  const now = new Date();
  const base = { status: 'active', startDate: { $lte: now }, endDate: { $gte: now } };
  if (sector) {
    const specific = await Sponsoring.findOne({ ...base, sector });
    if (specific) return specific;
  }
  return Sponsoring.findOne({ ...base, sector: 'generic' }) ?? null;
}
```

### Slug generation
```typescript
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
async function getUniqueSlug(name: string): Promise<string> {
  let slug = generateSlug(name);
  let count = 0;
  while (await Company.exists({ slug })) slug = `${generateSlug(name)}-${++count}`;
  return slug;
}
```

### YouTube validator
```typescript
const YT_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
export const extractYouTubeId = (url: string) => url.match(YT_REGEX)?.[3] ?? null;
export const getYouTubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
```

### Invoice number
```typescript
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await BillingRecord.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
  return `MU-${year}-${String(count + 1).padStart(5, '0')}`;
}
```

### Notification helper
```typescript
// lib/notifications.ts
export async function createNotification(companyId: string, type: string, data?: Record<string, any>) {
  const notification = await Notification.create({ companyId, type, data });
  const company = await Company.findById(companyId).select('email name');
  if (company) {
    await sendEmail({ to: company.email, subject: getEmailSubject(type), html: getEmailTemplate(type, data, company.name) });
    await Notification.findByIdAndUpdate(notification._id, { emailSent: true });
  }
  return notification;
}
```

### Cron job — boost expiry warning
```typescript
// app/api/cron/boost-expiry/route.ts — runs daily at 9:00 AM
// vercel.json: { "crons": [{ "path": "/api/cron/boost-expiry", "schedule": "0 9 * * *" }] }
const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const expiring = await Boost.find({ status: 'active', endDate: { $lte: in3Days, $gte: new Date() } });
// For each: check no recent notification → createNotification('boost_expiring_soon', { profileType, daysLeft })
```

---

## AUTH & MIDDLEWARE

```typescript
// middleware.ts
export { default } from 'next-auth/middleware';
export const config = { matcher: ['/dashboard/:path*', '/admin/:path*'] };

// lib/auth.ts — NextAuth JWT strategy
// Session: { user: { id, email, name, role, slug, status } }
// authorize(): find Company by email → bcrypt.compare → check emailVerified → check not suspended
```

---

## NOTIFICATIONS REFERENCE

| Type | Trigger | Email |
|---|---|---|
| account_approved | Admin approves company | Yes |
| profile_validated | Admin validates a profile | Yes |
| profile_rejected | Admin rejects (with reason) | Yes |
| account_suspended | Admin suspends (with reason) | Yes |
| rse_validated | Admin validates RSE donation | Yes |
| rse_rejected | Admin rejects (with reason) | Yes |
| boost_activated | Payment confirmed | Yes |
| boost_expiring_soon | Cron: 3 days before expiry | Yes |
| sponsoring_approved | Admin approves sponsoring | Yes |
| sponsoring_rejected | Admin rejects (with reason) | Yes |

---

## ENV VARIABLES

```bash
MONGODB_URI=mongodb://localhost:27017/marketup
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=   # openssl rand -base64 32
RESEND_API_KEY=
EMAIL_FROM=noreply@vivasky.media
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=       # for cron job auth
# Cloudinary (prod)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## INSTALL COMMANDS

```bash
npx create-next-app@latest market-up \
  --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd market-up
npx shadcn@latest init
npm install mongoose next-auth@beta bcryptjs zod resend pdf-lib qrcode react-dropzone
npm install -D @types/bcryptjs @types/qrcode
```

---

## BUILD ORDER (recommended)

### Phase 1 — Public
1. Models: Company, BrandUpProfile, TraceUpProfile, LinkUpProfile, RSEBadge, Sponsoring
2. lib/utils.ts (generateSlug, isBoostActive, extractYouTubeId)
3. lib/auth.ts + middleware.ts
4. POST /api/companies (registration)
5. GET /api/companies (search)
6. GET /api/companies/[slug]
7. GET /api/sponsoring
8. POST /api/uploads
9. Pages: /signin, /signup, /reset-password, /new-password
10. Components: CompanyCard, CompanyInitials, RSEBadge, BoostTag
11. Pages: /brandup, /traceup, /linkup (search engines)
12. Pages: /brandup/[slug], /traceup/[slug], /linkup/[slug]
13. CompanyModal (popup)
14. Pages: /, /onboarding, not-found.tsx

### Phase 2 — Dashboard
15. Models: Boost, SponsoringOrder, Notification, BillingRecord
16. lib/notifications.ts
17. dashboard/layout.tsx (Sidebar + Topbar)
18. GET /api/dashboard/stats + /dashboard page
19. Account: GET+PUT /api/dashboard/account + page
20. BrandUp: GET+PUT /api/dashboard/brandup + GalleryUpload + page
21. TraceUp: GET+PUT + videos routes + VideoManager + page
22. LinkUp: GET+PUT + QRCodeDisplay + page
23. BoostModal (shared component)
24. Boost: POST+GET /api/dashboard/boost + page
25. Sponsoring: POST+GET /api/dashboard/sponsoring + page
26. RSE: POST+GET /api/dashboard/rse + page
27. Billing: GET + PDF route + page
28. Notifications: GET+PATCH + page
29. Settings: PUT + page
30. Cron: /api/cron/boost-expiry

---

## UI REFERENCE FILES

Files in /ui folder (HTML mockups provided by client):
```
0_-_page_inscription_B2B_B2C.html    → /onboarding design reference
1_-_Moteur_de_recherche.html          → search engine structure
2_-_profile_public_traceup.html       → TraceUp profile design
3_-_profile_public_linkup.html        → LinkUp profile design
4_-_profile_public_brandup.html       → BrandUp profile design
5_-_formulaire_inscription.html       → /signup form design
6_-_dashboard_entreprise.html         → dashboard overview reference
```

Font used in mockups: Instrument Sans (Google Fonts) — acceptable fallback.
Preferred font: 'Segoe UI Variable', 'Segoe UI', system-ui (Microsoft Fluent).

⚠️  Search page color schemes (/brandup, /traceup, /linkup) are NOT yet validated
by the client. Use neutral Tailwind grays for search pages until client confirms.
Apply #0078D4 only as accent (buttons, active states, links).