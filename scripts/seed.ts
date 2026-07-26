/* eslint-disable @typescript-eslint/no-explicit-any */
// Seed script — uses `any` casts on Mongoose .create()/.insertMany() calls
// because Mongoose 9 infers strict types that require all fields including
// timestamps. This is intentional for seed scripts only.

import mongoose, { Types } from "mongoose";
import type { Model } from "mongoose";
import bcrypt from "bcryptjs";
import * as readline from "node:readline";
import { Company } from "../src/models/company.model";
import { User } from "../src/models/user.model";
import { AdminUser } from "../src/models/admin-user.model";
import { Profile } from "../src/models/profile.model";
import "../src/models/profile-brandup.model";
import "../src/models/profile-traceup.model";
import "../src/models/profile-linkup.model";
import { Transaction } from "../src/models/transaction.model";
import { Boost } from "../src/models/boost.model";
import { Sponsoring } from "../src/models/sponsoring.model";
import { RseReceipt } from "../src/models/rse-receipt.model";
import { Notification } from "../src/models/notification.model";
import { Association } from "../src/models/association.model";
import { Sector } from "../src/models/sector.model";
import { Gouvernorat } from "../src/models/gouvernorat.model";
import { ProfileStatsMonthlyModel } from "../src/models/profile-stats-monthly.model";
import { Counter } from "../src/models/counter.model";

// Helpers to bypass Mongoose 9 strict types in seed context
const insert = (m: Model<any>, data: Record<string, unknown>) => m.create(data as any);
const insertBulk = (m: Model<any>, data: Record<string, unknown>[]) => m.insertMany(data as any);

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const DEMO_PASSWORD = "Demo1234!";
const BCRYPT_ROUNDS = 12;
const SAMPLE_LEGAL_ID_DOC = "/shared/sample-legal-id.pdf";
const SAMPLE_RSE_RECEIPT_DOC = "/shared/sample-rse-receipt.pdf";
const SAMPLE_INVOICE_DOC = "/shared/sample-invoice.pdf";

// Date strategy: relative offsets from now (per skill data-models §9)
const now = new Date();
const daysAgo = (n: number): Date => new Date(now.getTime() - n * 86_400_000);
const daysFromNow = (n: number): Date => new Date(now.getTime() + n * 86_400_000);
const hoursAgo = (n: number): Date => new Date(now.getTime() - n * 3_600_000);

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function i18n(fr: string, ar = "", en = "") {
  return { fr, ar, en };
}

function logoUrl(seed: string, bgHex: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bgHex}`;
}

function bannerUrl(id: string): string {
  return `https://picsum.photos/seed/${id}-banner/1200/400`;
}

function avatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

function ytThumb(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function dmThumb(videoId: string): string {
  return `https://www.dailymotion.com/thumbnail_large/video/${videoId}`;
}

function vimeoThumb(videoId: string): string {
  return `https://vumbnail.com/${videoId}.jpg`;
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

// Counters for summary
const counts = {
  gouvernorats: 0,
  sectorsB2B: 0,
  sectorsB2C: 0,
  associations: 0,
  adminUsers: 0,
  companies: 0,
  users: 0,
  profiles: 0,
  boosts: 0,
  boostsActive: 0,
  sponsorings: 0,
  sponsoringsActive: 0,
  transactions: 0,
  rseReceipts: 0,
  rseValidated: 0,
  rsePending: 0,
  notifications: 0,
  profileStatsMonthly: 0,
};

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "test") {
    const dbName = uri.split("/").pop()?.split("?")[0] ?? "unknown";
    const confirmed = await confirm(
      `This will DROP all existing data in "${dbName}" and reseed. Continue? (yes/no): `,
    );
    if (!confirmed) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  // Drop existing collections
  const collections = await db.collections();
  for (const col of collections) {
    try {
      await col.drop();
    } catch (err: unknown) {
      if ((err as { code?: number }).code !== 26) throw err;
    }
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // 1. Gouvernorats
  await seedGouvernorats();

  // 2. Sectors
  await seedSectors();

  // 3. Associations
  const associationMap = await seedAssociations();

  // 4. Admin user
  const adminId = await seedAdminUser(passwordHash);

  // 5-7. Companies + Users + Profiles + Boosts + Sponsorings + Transactions + RSE
  await seedCompanies(passwordHash, adminId, associationMap);

  // 8. Invoice counter (max seed invoice seq = 46 → next real = 47)
  await Counter.create({ _id: `invoice-${now.getFullYear()}`, seq: 46 });
  console.log(`  ✅ Counter invoice-${now.getFullYear()} initialized at seq 46`);

  // 9. Notifications
  await seedNotifications(adminId);

  // 9. ProfileStatsMonthly (tracking seed data)
  await seedProfileStatsMonthly();

  // Verify TechnoFab canon
  const canonOk = await verifyTechnoFabCanon();

  // Print summary
  printSummary(canonOk);

  await mongoose.disconnect();
  process.exit(canonOk ? 0 : 1);
}

// ═══════════════════════════════════════════════════
// REFERENTIALS
// ═══════════════════════════════════════════════════

async function seedGouvernorats(): Promise<void> {
  const data = [
    { slug: "tunis", name: i18n("Tunis", "تونس"), order: 1 },
    { slug: "ariana", name: i18n("Ariana", "أريانة"), order: 2 },
    { slug: "ben-arous", name: i18n("Ben Arous", "بن عروس"), order: 3 },
    { slug: "manouba", name: i18n("Manouba", "منوبة"), order: 4 },
    { slug: "nabeul", name: i18n("Nabeul", "نابل"), order: 5 },
    { slug: "zaghouan", name: i18n("Zaghouan", "زغوان"), order: 6 },
    { slug: "bizerte", name: i18n("Bizerte", "بنزرت"), order: 7 },
    { slug: "beja", name: i18n("Béja", "باجة"), order: 8 },
    { slug: "jendouba", name: i18n("Jendouba", "جندوبة"), order: 9 },
    { slug: "kef", name: i18n("Le Kef", "الكاف"), order: 10 },
    { slug: "siliana", name: i18n("Siliana", "سليانة"), order: 11 },
    { slug: "kairouan", name: i18n("Kairouan", "القيروان"), order: 12 },
    { slug: "kasserine", name: i18n("Kasserine", "القصرين"), order: 13 },
    { slug: "sidi-bouzid", name: i18n("Sidi Bouzid", "سيدي بوزيد"), order: 14 },
    { slug: "sousse", name: i18n("Sousse", "سوسة"), order: 15 },
    { slug: "monastir", name: i18n("Monastir", "المنستير"), order: 16 },
    { slug: "mahdia", name: i18n("Mahdia", "المهدية"), order: 17 },
    { slug: "sfax", name: i18n("Sfax", "صفاقس"), order: 18 },
    { slug: "gafsa", name: i18n("Gafsa", "قفصة"), order: 19 },
    { slug: "tozeur", name: i18n("Tozeur", "توزر"), order: 20 },
    { slug: "kebili", name: i18n("Kébili", "قبلي"), order: 21 },
    { slug: "gabes", name: i18n("Gabès", "قابس"), order: 22 },
    { slug: "medenine", name: i18n("Médenine", "مدنين"), order: 23 },
    { slug: "tataouine", name: i18n("Tataouine", "تطاوين"), order: 24 },
  ];
  await insertBulk(Gouvernorat, data);
  counts.gouvernorats = data.length;
}

async function seedSectors(): Promise<void> {
  const b2b = [
    { slug: "mecanique", kind: "B2B", name: i18n("Mécanique"), icon: "settings", order: 1 },
    { slug: "electronique", kind: "B2B", name: i18n("Électronique"), icon: "memory", order: 2 },
    { slug: "informatique", kind: "B2B", name: i18n("Informatique & IT"), icon: "computer", order: 3 },
    { slug: "btp", kind: "B2B", name: i18n("Construction & BTP"), icon: "construction", order: 4 },
    { slug: "architecture", kind: "B2B", name: i18n("Architecture"), icon: "architecture", order: 5 },
    { slug: "agroalimentaire", kind: "B2B", name: i18n("Industrie agroalimentaire"), icon: "agriculture", order: 6 },
    { slug: "textile", kind: "B2B", name: i18n("Textile"), icon: "checkroom", order: 7 },
    { slug: "pharmaceutique", kind: "B2B", name: i18n("Pharmaceutique"), icon: "medication", order: 8 },
    { slug: "chimie", kind: "B2B", name: i18n("Chimie"), icon: "science", order: 9 },
    { slug: "energie", kind: "B2B", name: i18n("Énergie & Pétrole"), icon: "bolt", order: 10 },
    { slug: "logistique", kind: "B2B", name: i18n("Logistique & Transport"), icon: "local_shipping", order: 11 },
    { slug: "imprimerie", kind: "B2B", name: i18n("Imprimerie & Édition"), icon: "print", order: 12 },
    { slug: "conseil", kind: "B2B", name: i18n("Conseil & Audit"), icon: "business_center", order: 13 },
    { slug: "marketing", kind: "B2B", name: i18n("Marketing & Publicité"), icon: "campaign", order: 14 },
    { slug: "juridique", kind: "B2B", name: i18n("Juridique"), icon: "gavel", order: 15 },
    { slug: "comptabilite", kind: "B2B", name: i18n("Comptabilité"), icon: "calculate", order: 16 },
    { slug: "formation-pro", kind: "B2B", name: i18n("Formation professionnelle"), icon: "school", order: 17 },
    { slug: "sante-pro", kind: "B2B", name: i18n("Santé professionnelle"), icon: "medical_services", order: 18 },
    { slug: "environnement", kind: "B2B", name: i18n("Environnement"), icon: "eco", order: 19 },
    { slug: "securite", kind: "B2B", name: i18n("Sécurité"), icon: "shield", order: 20 },
    { slug: "banque-finance", kind: "B2B", name: i18n("Banque & Finance"), icon: "account_balance", order: 21 },
    { slug: "assurance", kind: "B2B", name: i18n("Assurance"), icon: "verified_user", order: 22 },
    { slug: "immobilier-pro", kind: "B2B", name: i18n("Immobilier professionnel"), icon: "business", order: 23 },
    { slug: "recherche-rd", kind: "B2B", name: i18n("Recherche & R&D"), icon: "biotech", order: 24 },
    { slug: "automobile-pro", kind: "B2B", name: i18n("Industrie automobile"), icon: "directions_car", order: 25 },
  ];
  const b2c = [
    { slug: "alimentation", kind: "B2C", name: i18n("Alimentation & Épicerie"), icon: "storefront", order: 1 },
    { slug: "restauration", kind: "B2C", name: i18n("Restauration"), icon: "restaurant", order: 2 },
    { slug: "hotellerie", kind: "B2C", name: i18n("Hôtellerie & Tourisme"), icon: "hotel", order: 3 },
    { slug: "mode", kind: "B2C", name: i18n("Mode & Habillement"), icon: "checkroom", order: 4 },
    { slug: "beaute", kind: "B2C", name: i18n("Beauté & Cosmétique"), icon: "spa", order: 5 },
    { slug: "sante", kind: "B2C", name: i18n("Santé & Pharmacie"), icon: "local_pharmacy", order: 6 },
    { slug: "sport", kind: "B2C", name: i18n("Sport & Fitness"), icon: "fitness_center", order: 7 },
    { slug: "loisirs", kind: "B2C", name: i18n("Loisirs & Culture"), icon: "theaters", order: 8 },
    { slug: "education", kind: "B2C", name: i18n("Éducation"), icon: "school", order: 9 },
    { slug: "maison-deco", kind: "B2C", name: i18n("Maison & Décoration"), icon: "chair", order: 10 },
    { slug: "auto-particulier", kind: "B2C", name: i18n("Automobile particulier"), icon: "directions_car", order: 11 },
    { slug: "telephonie-tech", kind: "B2C", name: i18n("Téléphonie & Tech"), icon: "smartphone", order: 12 },
    { slug: "commerce", kind: "B2C", name: i18n("Boutique & Commerce"), icon: "shopping_cart", order: 13 },
    { slug: "animaux", kind: "B2C", name: i18n("Animaux"), icon: "pets", order: 14 },
    { slug: "bijouterie", kind: "B2C", name: i18n("Bijouterie & Joaillerie"), icon: "diamond", order: 15 },
    { slug: "optique", kind: "B2C", name: i18n("Optique"), icon: "visibility", order: 16 },
    { slug: "boulangerie", kind: "B2C", name: i18n("Boulangerie & Pâtisserie"), icon: "bakery_dining", order: 17 },
    { slug: "cafe", kind: "B2C", name: i18n("Café & Salon de thé"), icon: "local_cafe", order: 18 },
    { slug: "banque-retail", kind: "B2C", name: i18n("Banque retail"), icon: "account_balance", order: 19 },
    { slug: "immobilier-part", kind: "B2C", name: i18n("Immobilier particulier"), icon: "home", order: 20 },
    { slug: "voyage", kind: "B2C", name: i18n("Voyage & Agences"), icon: "flight", order: 21 },
    { slug: "coiffure", kind: "B2C", name: i18n("Salons de coiffure"), icon: "content_cut", order: 22 },
    { slug: "spa-bienetre", kind: "B2C", name: i18n("Spas & Bien-être"), icon: "self_care", order: 23 },
    { slug: "photo", kind: "B2C", name: i18n("Photographie"), icon: "photo_camera", order: 24 },
    { slug: "services-personne", kind: "B2C", name: i18n("Services à la personne"), icon: "support_agent", order: 25 },
  ];
  await insertBulk(Sector, [...b2b, ...b2c]);
  counts.sectorsB2B = b2b.length;
  counts.sectorsB2C = b2c.length;
}

async function seedAssociations(): Promise<Map<string, Types.ObjectId>> {
  const data = [
    { slug: "al-ahed", name: i18n("Association Al Ahed"), description: i18n("Soutien aux familles défavorisées et orphelins en Tunisie. Distribution alimentaire et aide à la scolarisation."), logoUrl: logoUrl("AlAhed", "10B981"), website: "https://al-ahed.tn", causes: ["solidarite", "enfance", "education"], accreditedSince: new Date("2020-01-01"), active: true },
    { slug: "tunisie-verte", name: i18n("Tunisie Verte"), description: i18n("Préservation de l'environnement et reboisement. Actions de sensibilisation écologique dans les écoles."), logoUrl: logoUrl("TunisieVerte", "059669"), website: "https://tunisie-verte.org", causes: ["environnement", "education"], accreditedSince: new Date("2018-06-15"), active: true },
    { slug: "croissant-rouge-tunisien", name: i18n("Croissant Rouge Tunisien"), description: i18n("Aide humanitaire d'urgence, secourisme et action sociale. Présence sur tout le territoire tunisien."), logoUrl: logoUrl("CRT", "DC2626"), website: "https://croissantrouge.tn", causes: ["sante", "urgence", "solidarite"], accreditedSince: new Date("2015-03-01"), active: true },
    { slug: "sos-villages-enfants", name: i18n("SOS Villages d'Enfants Tunisie"), description: i18n("Accueil et accompagnement des enfants privés de soins parentaux. Programmes éducatifs et soutien familial."), logoUrl: logoUrl("SOSVillages", "F59E0B"), website: "https://sos-villages-enfants.tn", causes: ["enfance", "education", "famille"], accreditedSince: new Date("2019-09-10"), active: true },
    { slug: "association-aveugles-tunisie", name: i18n("Association des Aveugles de Tunisie"), description: i18n("Insertion socio-professionnelle des personnes non-voyantes. Formation et accompagnement adapté."), logoUrl: logoUrl("AAT", "7C3AED"), website: "https://aveugles-tunisie.org", causes: ["handicap", "insertion", "education"], accreditedSince: new Date("2017-11-22"), active: true },
  ];
  const docs = await insertBulk(Association, data);
  counts.associations = docs.length;

  // Map seed slug → ObjectId for RSE receipt references
  const map = new Map<string, Types.ObjectId>();
  const slugToId: Record<string, string> = {
    "a-001": "al-ahed",
    "a-002": "tunisie-verte",
    "a-003": "croissant-rouge-tunisien",
    "a-004": "sos-villages-enfants",
    "a-005": "association-aveugles-tunisie",
  };
  for (const [seedId, slug] of Object.entries(slugToId)) {
    const doc = docs.find((d: any) => d.slug === slug);
    if (doc) map.set(seedId, doc._id as Types.ObjectId);
  }
  return map;
}

async function seedAdminUser(passwordHash: string): Promise<Types.ObjectId> {
  const admin = await insert(AdminUser, {
    firstName: "Bassem",
    lastName: "Admin",
    email: "bassem@vivasky.media",
    passwordHash,
    role: "SUPER_ADMIN",
    avatar: { initials: "BA", backgroundColor: "#5C2D91" },
    languages: ["fr"],
    lastLoginAt: hoursAgo(2),
  });
  counts.adminUsers = 1;
  return admin._id as Types.ObjectId;
}

// ═══════════════════════════════════════════════════
// COMPANIES (10)
// ═══════════════════════════════════════════════════

interface CompanySeedData {
  seedId: string;
  slug: string;
  type: "B2B" | "B2C";
  legalId: string;
  accountEmail: string;
  user: { firstName: string; lastName: string; phone: string; languages: string[] };
  liveData: {
    contactEmail: string;
    phone: string;
    whatsapp: string;
    address: string;
    gouvernorat: string;
    ville: string;
    sectorId: string;
    languages: string[];
    gpsPosition?: { type: string; coordinates: number[] } | null;
  };
  data: {
    displayName: { fr: string; ar: string; en: string };
    logoUrl: string;
    bannerUrl: string;
    color?: string;
  };
  status: string;
  pendingUpdates?: {
    submittedAt: Date;
    fields: { key: string; label: string; currentValue: unknown; newValue: unknown }[];
    note?: string | null;
  } | null;
  registeredAt: Date;
  validatedAt?: Date | null;
  suspendedAt?: Date | null;
  suspendedReason?: string | null;
  rseBadgeStatus: string;
  rseBadgeValidatedAt?: Date | null;
  profiles: {
    brandup: ProfileSeedData;
    traceup: ProfileSeedData;
    linkup: ProfileSeedData;
  };
  transactions: TransactionSeedData[];
  rseReceipts: RseReceiptSeedData[];
}

interface ProfileSeedData {
  kind: "brandup" | "traceup" | "linkup";
  status: string;
  data: Record<string, unknown>;
  pendingData?: {
    submittedAt: Date;
    fields: { key: string; label: string; currentValue: unknown; newValue: unknown }[];
    note?: string | null;
    previousStatus?: string | null;
  } | null;
  rejectionReason?: string | null;
  rejectedAt?: Date | null;
  publishedAt?: Date | null;
  lastValidatedAt?: Date | null;
  submittedAt?: Date | null;
  disabledAt?: Date | null;
  stats: { viewsTotal: number; views30d: number; clicksTotal: number };
  boosts: BoostSeedData[];
  sponsorings: SponsoringSeedData[];
}

interface BoostSeedData {
  seedId: string;
  from: Date;
  to: Date;
  priceHT: number;
  transactionSeedId: string;
  viewsAdded: number;
  clicksAdded: number;
  status: string;
}

interface SponsoringSeedData {
  seedId: string;
  from: Date;
  to: Date;
  priceHT: number;
  transactionSeedId: string;
  targetCategory: string;
  impressions: number;
  clicks: number;
  status: string;
}

interface TransactionSeedData {
  seedId: string;
  type: string;
  refSeedId: string | null;
  profileKind: string;
  priceHT: number;
  vatRate: number;
  status: string;
  paidAt: Date | null;
  paymentMethod: string;
  paymentReference: string;
  invoiceUrl: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
}

interface RseReceiptSeedData {
  associationSeedId: string;
  amount: number;
  donationDate: Date;
  status: string;
  submittedAt: Date;
  validatedAt?: Date | null;
  rejectedReason?: string | null;
}

// Store created ID maps for cross-references
const userIdMap = new Map<string, Types.ObjectId>(); // seedCompanyId → userId
const boostIdMap = new Map<string, Types.ObjectId>(); // seedBoostId → boostId
const sponsoringIdMap = new Map<string, Types.ObjectId>(); // seedSponsoringId → sponsoringId

function buildCompanies(): CompanySeedData[] {
  return [
    // c-001 — TechnoFab Industries (canonical demo company)
    {
      seedId: "c-001",
      slug: "technofab-industries",
      type: "B2B",
      legalId: "B12345",
      accountEmail: "ahmed@technofab.tn",
      user: { firstName: "Ahmed", lastName: "Mrabet", phone: "+216 71 234 567", languages: ["fr"] },
      liveData: { contactEmail: "contact@technofab.tn", phone: "+216 73 222 333", whatsapp: "+216 20 123 456", address: "Rue de l'Industrie, ZI Sahline", gouvernorat: "sousse", ville: "Sahline", sectorId: "mecanique", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.7148, 35.7628] } },
      data: { displayName: i18n("TechnoFab Industries"), logoUrl: logoUrl("TechnoFab", "0078D4"), bannerUrl: bannerUrl("c-001") },
      status: "active",
      pendingUpdates: null,
      registeredAt: daysAgo(97),
      validatedAt: daysAgo(96),
      rseBadgeStatus: "validated", rseBadgeValidatedAt: daysAgo(45),
      profiles: {
        brandup: {
          kind: "brandup",
          status: "rejected",
          data: {
            pitch: i18n("Spécialiste de la mécanique de précision en Tunisie depuis 2003. Nous concevons et fabriquons des pièces industrielles sur mesure pour les secteurs automobile, aéronautique et énergétique. Notre savoir-faire repose sur un parc machines CNC de dernière génération et une équipe de 45 ingénieurs et techniciens hautement qualifiés."),
            about: i18n("Fondée en 2010 à Sousse, TechnoFab Industries est spécialisée dans la conception et la fabrication de pièces mécaniques usinées haute précision. Nos ateliers de 4 000 m² intègrent des centres d'usinage CNC de dernière génération et une équipe de 45 ingénieurs et techniciens certifiés ISO 9001. Nous avons noué des partenariats stratégiques avec les leaders européens de l'aéronautique et de l'automobile, et exportons aujourd'hui plus de 60% de notre production vers la France, l'Allemagne et l'Italie."),
            color: "#0078D4",
            links: [
              { label: i18n("Site web"), url: "https://technofab.tn", icon: "language" },
              { label: i18n("LinkedIn"), url: "https://linkedin.com/company/technofab", icon: "linkedin" },
              { label: i18n("Catalogue"), url: "https://technofab.tn/catalogue.pdf", icon: "download" },
            ],
            gallery: [
              { id: "img-001", url: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800", caption: i18n("Usine CNC Sahline"), order: 0 },
              { id: "img-002", url: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=800", caption: i18n("Atelier d'usinage"), order: 1 },
              { id: "img-003", url: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800", caption: i18n("Pièces aéronautiques"), order: 2 },
              { id: "img-004", url: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800", caption: i18n("Contrôle qualité ISO"), order: 3 },
              { id: "img-005", url: "https://images.unsplash.com/photo-1542222024-c39e2281f121?w=800", caption: i18n("Équipe technique"), order: 4 },
            ],
            projects: [
              { id: "proj-c-001-1", name: i18n("Pièces aéronautiques A320"), image: "https://picsum.photos/seed/c-001-proj-1/600/400", description: i18n("Production de pièces structurelles aluminium pour Airbus A320 — partenariat Stelia Aerospace."), order: 1 },
              { id: "proj-c-001-2", name: i18n("Outillage spécialisé"), image: "https://picsum.photos/seed/c-001-proj-2/600/400", description: i18n("Conception et fabrication d'outillage de précision sur cahier des charges client."), order: 2 },
              { id: "proj-c-001-3", name: i18n("Systèmes hydrauliques"), image: "https://picsum.photos/seed/c-001-proj-3/600/400", description: i18n("Développement de vérins et distributeurs hydrauliques pour engins de chantier."), order: 3 },
              { id: "proj-c-001-4", name: i18n("Moteurs industriels"), image: "https://picsum.photos/seed/c-001-proj-4/600/400", description: i18n("Pièces de moteurs robustes pour applications minières et énergétiques."), order: 4 },
              { id: "proj-c-001-5", name: i18n("Engrenages haute précision"), image: "https://picsum.photos/seed/c-001-proj-5/600/400", description: i18n("Engrenages et transmissions pour l'industrie automobile et ferroviaire."), order: 5 },
              { id: "proj-c-001-6", name: i18n("Robotique d'atelier"), image: "https://picsum.photos/seed/c-001-proj-6/600/400", description: i18n("Bras robotisés et automates pour lignes d'assemblage clients."), order: 6 },
              { id: "proj-c-001-7", name: i18n("Découpe laser CNC"), image: "https://picsum.photos/seed/c-001-proj-7/600/400", description: i18n("Service de découpe laser et plasma pour tôles techniques."), order: 7 },
              { id: "proj-c-001-8", name: i18n("Maintenance industrielle"), image: "https://picsum.photos/seed/c-001-proj-8/600/400", description: i18n("Contrats de maintenance préventive et corrective sur sites clients."), order: 8 },
              { id: "proj-c-001-9", name: i18n("R&D Industrie 4.0"), image: "https://picsum.photos/seed/c-001-proj-9/600/400", description: i18n("Cellule R&D dédiée aux solutions IoT et jumeau numérique."), order: 9 },
            ],
            certifications: [
              { id: "cert-c-001-1", name: "ISO 9001:2015", label: i18n("Management de la qualité"), icon: "verified", image: "https://picsum.photos/seed/c-001-cert-iso9001/200/200", issuedAt: new Date("2024-06-01"), expiresAt: new Date("2027-06-01") },
              { id: "cert-c-001-2", name: "EN 9100:2018", label: i18n("Systèmes de management qualité aéronautique"), icon: "flight", image: "https://picsum.photos/seed/c-001-cert-en9100/200/200", issuedAt: new Date("2024-09-15"), expiresAt: new Date("2027-09-15") },
              { id: "cert-c-001-3", name: "IATF 16949", label: i18n("Qualité automobile"), icon: "directions_car", image: "https://picsum.photos/seed/c-001-cert-iatf/200/200", issuedAt: new Date("2023-11-01"), expiresAt: new Date("2026-11-01") },
              { id: "cert-c-001-4", name: "ISO 14001:2015", label: i18n("Management environnemental"), icon: "eco", image: null, issuedAt: new Date("2025-02-01"), expiresAt: new Date("2028-02-01") },
            ],
            services: [
              { name: i18n("Usinage CNC haute précision") },
              { name: i18n("Tôlerie industrielle") },
              { name: i18n("Soudure TIG/MIG") },
              { name: i18n("Fabrication de pièces sur mesure") },
            ],
          },
          // Verbatim rejection reason from seed — do not paraphrase
          rejectionReason: "Pitch non conforme à la charte de décence — termes inappropriés détectés dans la version soumise. Veuillez reformuler en restant sur un ton professionnel et soumettre à nouveau.",
          rejectedAt: daysAgo(38),
          publishedAt: null,
          lastValidatedAt: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boosts: [],
          sponsorings: [],
        },
        traceup: {
          kind: "traceup",
          status: "pending",
          data: {
            channelName: i18n("TechnoFab Studio"),
            channelDescription: i18n(""),
            videos: [
              { id: "v-c-001-1", source: "youtube", videoId: "dQw4w9WgXcQ", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnailUrl: ytThumb("dQw4w9WgXcQ"), category: "actualite", title: i18n("Visite de notre nouvelle ligne de production CNC"), description: i18n("Découvrez l'inauguration de notre 3e ligne de production CNC dédiée à l'aéronautique. Investissement de 1,2 M DT pour répondre à la demande croissante."), status: "active", publishedAt: daysAgo(33), order: 1 },
              { id: "v-c-001-2", source: "vimeo", videoId: "76979871", videoUrl: "https://vimeo.com/76979871", thumbnailUrl: vimeoThumb("76979871"), category: "actualite", title: i18n("Certification ISO 9001:2015 obtenue"), description: i18n("TechnoFab obtient la certification ISO 9001:2015. Une étape majeure dans notre démarche qualité."), status: "active", publishedAt: daysAgo(66), order: 2 },
              { id: "v-c-001-3", source: "dailymotion", videoId: "x7uqx0b", videoUrl: "https://www.dailymotion.com/video/x7uqx0b", thumbnailUrl: dmThumb("x7uqx0b"), category: "actualite", title: i18n("Notre participation au Salon Industrie Tunis 2026"), description: i18n("Retour en images sur notre stand au Salon Industrie 2026 à la foire de Tunis."), status: "active", publishedAt: daysAgo(52), order: 3 },
              { id: "v-c-001-4", source: "youtube", videoId: "jNQXAC9IVRw", videoUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw", thumbnailUrl: ytThumb("jNQXAC9IVRw"), category: "offres", title: i18n("Promotion -20% sur les pièces standard en avril"), description: i18n("Profitez de notre offre de printemps : -20% sur tout notre catalogue de pièces standard, jusqu'au 30 avril."), status: "active", publishedAt: daysAgo(21), order: 4 },
              { id: "v-c-001-5", source: "vimeo", videoId: "22439234", videoUrl: "https://vimeo.com/22439234", thumbnailUrl: vimeoThumb("22439234"), category: "emplois", title: i18n("Recrutement : 3 ingénieurs mécaniciens"), description: i18n("TechnoFab recrute 3 ingénieurs mécaniciens (CDI) pour son site de Sahline. Profils junior à confirmé bienvenus."), status: "active", publishedAt: daysAgo(12), order: 5 },
              { id: "v-c-001-6", source: "youtube", videoId: "9bZkp7q19f0", videoUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0", thumbnailUrl: ytThumb("9bZkp7q19f0"), category: "emplois", title: i18n("Stage technicien CNC — été 2026"), description: i18n("Stage de 6 mois ouvert aux étudiants en BTS productique mécanique. Encadrement par notre chef d'atelier."), status: "active", publishedAt: daysAgo(7), order: 6 },
            ],
          },
          submittedAt: daysAgo(3),
          publishedAt: null,
          lastValidatedAt: null,
          stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 },
          boosts: [],
          sponsorings: [],
        },
        linkup: {
          kind: "linkup",
          status: "active",
          data: {
            qrConfig: { style: "rounded", colorForeground: "#000000", colorBackground: "#FFFFFF", logoOverlay: true },
            socials: [
              { platform: "linkedin", url: "https://linkedin.com/in/ahmedmrabet" },
              { platform: "facebook", url: "https://facebook.com/technofab.tn" },
              { platform: "instagram", url: "https://instagram.com/technofab" },
              { platform: "twitter", url: null },
              { platform: "youtube", url: null },
              { platform: "tiktok", url: null },
            ],
          },
          publishedAt: daysAgo(71),
          lastValidatedAt: daysAgo(71),
          stats: { viewsTotal: 260, views30d: 212, clicksTotal: 45 },
          boosts: [
            { seedId: "b-c-001-1", from: daysAgo(15), to: daysFromNow(15), priceHT: 50, transactionSeedId: "t-c-001-2", viewsAdded: 212, clicksAdded: 18, status: "active" },
            { seedId: "b-c-001-0", from: daysAgo(71), to: daysAgo(41), priceHT: 50, transactionSeedId: "t-c-001-9", viewsAdded: 48, clicksAdded: 6, status: "expired" },
          ],
          sponsorings: [
            { seedId: "s-c-001-1", from: daysAgo(2), to: daysFromNow(5), priceHT: 100, transactionSeedId: "t-c-001-1", targetCategory: "mecanique", impressions: 1250, clicks: 45, status: "active" },
          ],
        },
      },
      transactions: [
        { seedId: "t-c-001-1", type: "sponsoring", refSeedId: "s-c-001-1", profileKind: "linkup", priceHT: 100, vatRate: 0.19, status: "paid", paidAt: daysAgo(2), paymentMethod: "card", paymentReference: "MP-SPO-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00042", createdAt: daysAgo(2) },
        { seedId: "t-c-001-2", type: "boost", refSeedId: "b-c-001-1", profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(15), paymentMethod: "card", paymentReference: "MP-BST-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00031", createdAt: daysAgo(15) },
        { seedId: "t-c-001-3", type: "sponsoring", refSeedId: null, profileKind: "linkup", priceHT: 100, vatRate: 0.19, status: "paid", paidAt: daysAgo(45), paymentMethod: "bank_transfer", paymentReference: "BT-SPO-002", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00024", createdAt: daysAgo(45) },
        { seedId: "t-c-001-4", type: "boost", refSeedId: null, profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(52), paymentMethod: "card", paymentReference: "MP-BST-002", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00019", createdAt: daysAgo(52) },
        { seedId: "t-c-001-5", type: "sponsoring", refSeedId: null, profileKind: "linkup", priceHT: 100, vatRate: 0.19, status: "paid", paidAt: daysAgo(59), paymentMethod: "card", paymentReference: "MP-SPO-003", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00015", createdAt: daysAgo(59) },
        { seedId: "t-c-001-6", type: "boost", refSeedId: null, profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(63), paymentMethod: "card", paymentReference: "MP-BST-003", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00012", createdAt: daysAgo(63) },
        { seedId: "t-c-001-7", type: "boost", refSeedId: null, profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(69), paymentMethod: "card", paymentReference: "MP-BST-004", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00008", createdAt: daysAgo(69) },
        { seedId: "t-c-001-8", type: "sponsoring", refSeedId: null, profileKind: "linkup", priceHT: 100, vatRate: 0.19, status: "paid", paidAt: daysAgo(73), paymentMethod: "card", paymentReference: "MP-SPO-004", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00005", createdAt: daysAgo(73) },
        { seedId: "t-c-001-9", type: "boost", refSeedId: "b-c-001-0", profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(71), paymentMethod: "card", paymentReference: "MP-BST-005", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00006", createdAt: daysAgo(71) },
        { seedId: "t-c-001-10", type: "boost", refSeedId: null, profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(77), paymentMethod: "manual", paymentReference: "MAN-BST-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00003", createdAt: daysAgo(77) },
        { seedId: "t-c-001-11", type: "boost", refSeedId: null, profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(84), paymentMethod: "card", paymentReference: "MP-BST-006", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00001", createdAt: daysAgo(84) },
        { seedId: "t-c-001-12", type: "boost", refSeedId: null, profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(90), paymentMethod: "card", paymentReference: "MP-BST-007", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00000", createdAt: daysAgo(90) },
      ],
      rseReceipts: [
        { associationSeedId: "a-001", amount: 5200, donationDate: daysAgo(4), status: "pending", submittedAt: daysAgo(4) },
        { associationSeedId: "a-002", amount: 4000, donationDate: daysAgo(100), status: "validated", submittedAt: daysAgo(100), validatedAt: daysAgo(99) },
        { associationSeedId: "a-003", amount: 3200, donationDate: daysAgo(138), status: "validated", submittedAt: daysAgo(138), validatedAt: daysAgo(137) },
      ],
    },
    // c-002 — MediaCom Communication
    {
      seedId: "c-002", slug: "mediacom-communication", type: "B2B", legalId: "B98765", accountEmail: "leila@mediacom.tn",
      user: { firstName: "Leila", lastName: "Karoui", phone: "+216 71 555 100", languages: ["fr"] },
      liveData: { contactEmail: "contact@mediacom.tn", phone: "+216 71 555 200", whatsapp: "+216 20 555 200", address: "Avenue Habib Bourguiba, Tunis Centre", gouvernorat: "tunis", ville: "Tunis", sectorId: "marketing", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.1815, 36.8065] } },
      data: { displayName: i18n("MediaCom Communication & Stratégie de Marque"), logoUrl: logoUrl("MediaCom", "6366F1"), bannerUrl: bannerUrl("c-002") },
      status: "active", registeredAt: daysAgo(80), validatedAt: daysAgo(79), rseBadgeStatus: "none",
      pendingUpdates: { submittedAt: daysAgo(2), fields: [{ key: "liveData.gouvernorat", label: "Gouvernorat", currentValue: "tunis", newValue: "ariana" }, { key: "liveData.ville", label: "Ville", currentValue: "Tunis", newValue: "Ariana" }, { key: "liveData.address", label: "Adresse", currentValue: "Avenue Habib Bourguiba, Tunis Centre", newValue: "Avenue de la République, Ariana Centre" }], note: "Ouverture d'une agence à Ariana — changement du gouvernorat de rattachement." },
      profiles: {
        brandup: { kind: "brandup", status: "active", data: { pitch: i18n("Agence de communication 360° basée à Tunis. Nous accompagnons PME et grands comptes dans leur stratégie de marque, leur identité visuelle et leur déploiement digital."), about: i18n("MediaCom est une agence de communication et de stratégie de marque fondée en 2015 à Tunis."), color: "#6366F1", links: [{ label: i18n("Site web"), url: "https://mediacom.tn", icon: "language" }], gallery: [], projects: [
          { id: "proj-c-002-1", name: i18n("Rebranding BIAT 2025"), image: "https://picsum.photos/seed/c-002-proj-1/600/400", description: i18n("Refonte complète de l'identité visuelle de la BIAT — guideline, signalétique, digital."), order: 1 },
          { id: "proj-c-002-2", name: i18n("Campagne TikTok Délice"), image: "https://picsum.photos/seed/c-002-proj-2/600/400", description: i18n("Campagne sociale ciblée 16-25 ans pour Délice avec influenceurs locaux."), order: 2 },
          { id: "proj-c-002-3", name: i18n("Plateforme Tunisie Telecom"), image: "https://picsum.photos/seed/c-002-proj-3/600/400", description: i18n("Refonte UX du site corporate Tunisie Telecom."), order: 3 },
          { id: "proj-c-002-4", name: i18n("Carrefour Tunisie"), image: "https://picsum.photos/seed/c-002-proj-4/600/400", description: i18n("Campagnes saisonnières + activations magasins."), order: 4 },
          { id: "proj-c-002-5", name: i18n("Salwa cosmétiques"), image: "https://picsum.photos/seed/c-002-proj-5/600/400", description: i18n("Lancement gamme premium — packaging et campagne digitale."), order: 5 },
          { id: "proj-c-002-6", name: i18n("Office National du Tourisme"), image: "https://picsum.photos/seed/c-002-proj-6/600/400", description: i18n("Campagne 'Découvrez la Tunisie' — vidéo, social, OOH."), order: 6 },
          { id: "proj-c-002-7", name: i18n("Ooredoo Wave"), image: "https://picsum.photos/seed/c-002-proj-7/600/400", description: i18n("Activation mobile-first jeunes 18-30 ans."), order: 7 },
          { id: "proj-c-002-8", name: i18n("Coca-Cola Ramadan"), image: "https://picsum.photos/seed/c-002-proj-8/600/400", description: i18n("Campagne Ramadan multi-canal pour Coca-Cola Tunisie."), order: 8 },
          { id: "proj-c-002-9", name: i18n("Maxula Festival"), image: "https://picsum.photos/seed/c-002-proj-9/600/400", description: i18n("Direction artistique et communication du festival Maxula."), order: 9 },
        ], certifications: [{ id: "cert-c-002-1", name: "Google Partner Premier", label: i18n("Certification Google Ads"), icon: "verified", image: "https://picsum.photos/seed/c-002-cert-google/200/200", issuedAt: new Date("2025-01-15"), expiresAt: new Date("2026-01-15") }], services: [{ name: i18n("Identité visuelle & branding") }, { name: i18n("Stratégie de communication") }] }, publishedAt: daysAgo(67), lastValidatedAt: daysAgo(67), stats: { viewsTotal: 432, views30d: 87, clicksTotal: 28 }, boosts: [], sponsorings: [] },
        traceup: { kind: "traceup", status: "active", data: { channelName: i18n("MediaCom Studio"), channelDescription: i18n(""), videos: [
          { id: "v-c-002-1", source: "youtube", videoId: "kJQP7kiw5Fk", videoUrl: "https://www.youtube.com/watch?v=kJQP7kiw5Fk", thumbnailUrl: ytThumb("kJQP7kiw5Fk"), category: "actualite", title: i18n("Rebranding BIAT — making of"), description: i18n("Coulisses du rebranding de la BIAT, de la recherche créative au lancement."), status: "active", publishedAt: daysAgo(52), order: 1 },
          { id: "v-c-002-2", source: "vimeo", videoId: "148751763", videoUrl: "https://vimeo.com/148751763", thumbnailUrl: vimeoThumb("148751763"), category: "actualite", title: i18n("5 erreurs à éviter en branding"), description: i18n("Les pièges classiques à éviter pour bâtir une marque forte."), status: "active", publishedAt: daysAgo(45), order: 2 },
          { id: "v-c-002-3", source: "youtube", videoId: "tgbNymZ7vqY", videoUrl: "https://www.youtube.com/watch?v=tgbNymZ7vqY", thumbnailUrl: ytThumb("tgbNymZ7vqY"), category: "actualite", title: i18n("Recrutement : Senior Art Director"), description: i18n("Nous cherchons un(e) Senior Art Director pour rejoindre notre équipe créative."), status: "active", publishedAt: daysAgo(38), order: 3 },
          { id: "v-c-002-4", source: "dailymotion", videoId: "x7uqx0b", videoUrl: "https://www.dailymotion.com/video/x7uqx0b", thumbnailUrl: dmThumb("x7uqx0b"), category: "actualite", title: i18n("Lancement campagne été 2026"), description: i18n("Présentation de notre campagne estivale multi-canal pour 3 clients simultanés."), status: "active", publishedAt: daysAgo(30), order: 4 },
          { id: "v-c-002-5", source: "youtube", videoId: "dQw4w9WgXcQ", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnailUrl: ytThumb("dQw4w9WgXcQ"), category: "actualite", title: i18n("Pack branding PME — offre spéciale"), description: i18n("Découvrez notre nouvelle offre packaging + identité visuelle à tarif préférentiel pour les PME tunisiennes."), status: "active", publishedAt: daysAgo(25), order: 5 },
          { id: "v-c-002-6", source: "vimeo", videoId: "76979871", videoUrl: "https://vimeo.com/76979871", thumbnailUrl: vimeoThumb("76979871"), category: "actualite", title: i18n("Comment réussir son pitch client"), description: i18n("Méthodologie MediaCom pour structurer un pitch gagnant en 45 minutes."), status: "active", publishedAt: daysAgo(20), order: 6 },
          { id: "v-c-002-7", source: "youtube", videoId: "jNQXAC9IVRw", videoUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw", thumbnailUrl: ytThumb("jNQXAC9IVRw"), category: "actualite", title: i18n("Stage community manager — été 2026"), description: i18n("Stage de 4 mois ouvert aux étudiants en communication digitale."), status: "active", publishedAt: daysAgo(15), order: 7 },
          { id: "v-c-002-8", source: "youtube", videoId: "9bZkp7q19f0", videoUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0", thumbnailUrl: ytThumb("9bZkp7q19f0"), category: "actualite", title: i18n("Audit digital gratuit — avril 2026"), description: i18n("Offre limitée : audit complet de votre présence digitale offert pour les 20 premiers inscrits."), status: "active", publishedAt: daysAgo(10), order: 8 },
        ] }, publishedAt: daysAgo(67), lastValidatedAt: daysAgo(67), stats: { viewsTotal: 892, views30d: 156, clicksTotal: 42 }, boosts: [], sponsorings: [] },
        // PP-11.5: MediaCom LinkUP = Cas 3 démonstratif (pending + publishedAt → visible avec ancienne data)
        linkup: { kind: "linkup", status: "pending", submittedAt: daysAgo(1), data: { qrConfig: { style: "rounded", colorForeground: "#000000", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "linkedin", url: "https://linkedin.com/in/leilakaroui" }, { platform: "facebook", url: "https://facebook.com/mediacom.tn" }] }, pendingData: { submittedAt: daysAgo(1), previousStatus: "active", fields: [{ key: "socials", label: "Réseaux sociaux", currentValue: [{ platform: "linkedin", url: "https://linkedin.com/in/leilakaroui" }, { platform: "facebook", url: "https://facebook.com/mediacom.tn" }], newValue: [{ platform: "linkedin", url: "https://linkedin.com/company/mediacom-communication" }, { platform: "facebook", url: "https://facebook.com/mediacom.tn" }, { platform: "instagram", url: "https://instagram.com/mediacom.design" }] }], note: null }, publishedAt: daysAgo(67), lastValidatedAt: daysAgo(67), stats: { viewsTotal: 178, views30d: 32, clicksTotal: 15 }, boosts: [], sponsorings: [] },
      },
      transactions: [],
      rseReceipts: [{ associationSeedId: "a-002", amount: 2800, donationDate: daysAgo(0), status: "pending", submittedAt: hoursAgo(2) }],
    },
    // c-003 — GreenLife Bio
    {
      seedId: "c-003", slug: "greenlife-bio", type: "B2C", legalId: "B33445", accountEmail: "karim@greenlife.tn",
      user: { firstName: "Karim", lastName: "Slim", phone: "+216 73 411 222", languages: ["fr"] },
      liveData: { contactEmail: "hello@greenlife.tn", phone: "+216 73 411 333", whatsapp: "+216 20 411 333", address: "Avenue Mohamed V, Sousse", gouvernorat: "sousse", ville: "Sousse", sectorId: "alimentation", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.6411, 35.8245] } },
      data: { displayName: i18n("GreenLife — Bio & Naturel"), logoUrl: logoUrl("GreenLife", "10B981"), bannerUrl: bannerUrl("c-003") },
      status: "active", registeredAt: daysAgo(173), validatedAt: daysAgo(172), rseBadgeStatus: "validated",
      pendingUpdates: { submittedAt: daysAgo(2), fields: [{ key: "data.displayName", label: "Nom de l'entreprise", currentValue: i18n("GreenLife — Bio & Naturel"), newValue: i18n("GreenLife Marché Bio") }] },
      profiles: {
        brandup: { kind: "brandup", status: "active", data: { pitch: i18n("Épicerie bio et naturelle à Sousse. Plus de 800 références."), about: i18n("GreenLife est née d'une conviction simple : manger bon, sain et juste."), color: "#10B981", links: [{ label: i18n("Site web"), url: "https://greenlife.tn", icon: "language" }], gallery: [], projects: [{ id: "proj-c-003-1", name: i18n("Huile d'olive bio extra vierge"), image: "https://picsum.photos/seed/c-003-proj-1/600/400", description: i18n("Notre huile premium issue de petits producteurs du Cap Bon."), order: 1 }], certifications: [{ id: "cert-c-003-1", name: "AB Tunisie", label: i18n("Agriculture biologique tunisienne"), icon: "eco", image: "https://picsum.photos/seed/c-003-cert-ab/200/200", issuedAt: new Date("2023-01-01"), expiresAt: new Date("2026-01-01") }], services: [{ name: i18n("Vente en boutique") }, { name: i18n("Livraison Sousse") }] }, publishedAt: daysAgo(153), lastValidatedAt: daysAgo(153), stats: { viewsTotal: 1543, views30d: 421, clicksTotal: 89 }, boosts: [{ seedId: "b-c-003-1", from: daysAgo(21), to: daysFromNow(9), priceHT: 50, transactionSeedId: "t-c-003-1", viewsAdded: 312, clicksAdded: 24, status: "active" }], sponsorings: [] },
        traceup: { kind: "traceup", status: "incomplete", data: { channelName: i18n(""), channelDescription: i18n(""), videos: [] }, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, boosts: [], sponsorings: [] },
        linkup: { kind: "linkup", status: "active", data: { qrConfig: { style: "square", colorForeground: "#10B981", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "instagram", url: "https://instagram.com/greenlife.tn" }, { platform: "facebook", url: "https://facebook.com/greenlife.tn" }] }, publishedAt: daysAgo(153), lastValidatedAt: daysAgo(153), stats: { viewsTotal: 245, views30d: 67, clicksTotal: 18 }, boosts: [], sponsorings: [] },
      },
      transactions: [
        { seedId: "t-c-003-1", type: "boost", refSeedId: "b-c-003-1", profileKind: "brandup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(21), paymentMethod: "card", paymentReference: "MP-BST-GL-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00036", createdAt: daysAgo(21) },
      ],
      rseReceipts: [{ associationSeedId: "a-002", amount: 1500, donationDate: daysAgo(61), status: "validated", submittedAt: daysAgo(61), validatedAt: daysAgo(60) }],
    },
    // c-004 — BuildTech Construction
    {
      seedId: "c-004", slug: "buildtech-construction", type: "B2B", legalId: "B77123", accountEmail: "sami@buildtech.tn",
      user: { firstName: "Sami", lastName: "Bouazizi", phone: "+216 71 877 555", languages: ["fr"] },
      liveData: { contactEmail: "contact@buildtech.tn", phone: "+216 71 877 600", whatsapp: "+216 20 877 600", address: "Z.I. Charguia II, Tunis", gouvernorat: "tunis", ville: "Tunis", sectorId: "btp", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.1553, 36.8375] } },
      data: { displayName: i18n("BuildTech Construction"), logoUrl: logoUrl("BuildTech", "F59E0B"), bannerUrl: bannerUrl("c-004") },
      status: "pending", registeredAt: daysAgo(58), validatedAt: daysAgo(57), rseBadgeStatus: "none",
      pendingUpdates: { submittedAt: daysAgo(3), fields: [{ key: "data.bannerUrl", label: "Bannière", currentValue: bannerUrl("c-004"), newValue: "https://picsum.photos/seed/c-004-banner-v2/1200/400" }] },
      profiles: {
        brandup: { kind: "brandup", status: "incomplete", data: { pitch: i18n(""), about: i18n(""), color: "#F59E0B", links: [], gallery: [], projects: [], certifications: [], services: [] }, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, boosts: [], sponsorings: [] },
        traceup: { kind: "traceup", status: "disabled", data: { channelName: i18n(""), channelDescription: i18n(""), videos: [{ id: "v-c-004-1", source: "youtube", videoId: "fJ9rUzIMcZQ", videoUrl: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ", thumbnailUrl: ytThumb("fJ9rUzIMcZQ"), category: "actualite", title: i18n("Avancement chantier Lac 2"), description: i18n(""), status: "active", publishedAt: daysAgo(61), order: 1 }] }, publishedAt: daysAgo(56), lastValidatedAt: daysAgo(56), disabledAt: daysAgo(10), stats: { viewsTotal: 124, views30d: 0, clicksTotal: 8 }, boosts: [], sponsorings: [] },
        linkup: { kind: "linkup", status: "active", data: { qrConfig: { style: "rounded", colorForeground: "#F59E0B", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "linkedin", url: "https://linkedin.com/in/samibouazizi" }] }, publishedAt: daysAgo(33), lastValidatedAt: daysAgo(33), stats: { viewsTotal: 87, views30d: 23, clicksTotal: 6 }, boosts: [], sponsorings: [] },
      },
      transactions: [], rseReceipts: [],
    },
    // c-005 — FoodCorner Restaurant (suspended)
    {
      seedId: "c-005", slug: "foodcorner-restaurant", type: "B2C", legalId: "B55678", accountEmail: "mehdi@foodcorner.tn",
      user: { firstName: "Mehdi", lastName: "Trabelsi", phone: "+216 74 222 100", languages: ["fr"] },
      liveData: { contactEmail: "contact@foodcorner.tn", phone: "+216 74 222 200", whatsapp: "+216 20 222 200", address: "Avenue Hedi Chaker, Sfax", gouvernorat: "sfax", ville: "Sfax", sectorId: "restauration", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.7603, 34.7406] } },
      data: { displayName: i18n("FoodCorner — Cuisine Tunisienne"), logoUrl: logoUrl("FoodCorner", "EF4444"), bannerUrl: bannerUrl("c-005") },
      status: "suspended", registeredAt: daysAgo(244), validatedAt: daysAgo(242), suspendedAt: daysAgo(21), suspendedReason: "Suspension suite à litige de facturation non résolu (boost facturé en double, dispute en cours).", rseBadgeStatus: "none",
      profiles: {
        brandup: { kind: "brandup", status: "active", data: { pitch: i18n("Restaurant familial à Sfax. Spécialités tunisiennes traditionnelles et plats du jour."), about: i18n("FoodCorner est un restaurant familial fondé en 2018 à Sfax."), color: "#EF4444", links: [{ label: i18n("Site web"), url: "https://foodcorner.tn", icon: "language" }], gallery: [], projects: [{ id: "proj-c-005-1", name: i18n("Couscous Royal"), image: "https://picsum.photos/seed/c-005-proj-1/600/400", description: i18n("Notre couscous traditionnel revisité."), order: 1 }], certifications: [], services: [{ name: i18n("Restaurant sur place") }, { name: i18n("À emporter") }] }, publishedAt: daysAgo(204), lastValidatedAt: daysAgo(204), stats: { viewsTotal: 2105, views30d: 0, clicksTotal: 187 }, boosts: [], sponsorings: [] },
        traceup: { kind: "traceup", status: "active", data: { channelName: i18n("FoodCorner Cuisine"), channelDescription: i18n(""), videos: [{ id: "v-c-005-1", source: "youtube", videoId: "L_jWHffIx5E", videoUrl: "https://www.youtube.com/watch?v=L_jWHffIx5E", thumbnailUrl: ytThumb("L_jWHffIx5E"), category: "astuces", title: i18n("Recette : Couscous royal traditionnel"), description: i18n("Notre chef partage les secrets du couscous royal."), status: "active", publishedAt: daysAgo(128), order: 1 }] }, publishedAt: daysAgo(158), lastValidatedAt: daysAgo(158), stats: { viewsTotal: 567, views30d: 0, clicksTotal: 34 }, boosts: [], sponsorings: [] },
        linkup: { kind: "linkup", status: "active", data: { qrConfig: { style: "rounded", colorForeground: "#EF4444", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "instagram", url: "https://instagram.com/foodcorner.tn" }, { platform: "facebook", url: "https://facebook.com/foodcorner.tn" }] }, publishedAt: daysAgo(204), lastValidatedAt: daysAgo(204), stats: { viewsTotal: 412, views30d: 0, clicksTotal: 67 }, boosts: [], sponsorings: [] },
      },
      transactions: [
        { seedId: "t-c-005-1", type: "boost", refSeedId: null, profileKind: "brandup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(71), paymentMethod: "card", paymentReference: "MP-BST-FC-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00011", createdAt: daysAgo(71) },
        { seedId: "t-c-005-2", type: "boost", refSeedId: null, profileKind: "brandup", priceHT: 50, vatRate: 0.19, status: "refunded", paidAt: daysAgo(38), paymentMethod: "card", paymentReference: "MP-BST-FC-002", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00027", createdAt: daysAgo(38) },
      ],
      rseReceipts: [],
    },
    // c-006 — ArchStudio (pending logo modif)
    {
      seedId: "c-006", slug: "archstudio-architecture", type: "B2B", legalId: "B66890", accountEmail: "salma@archstudio.tn",
      user: { firstName: "Salma", lastName: "Ben Aissa", phone: "+216 71 333 100", languages: ["fr"] },
      liveData: { contactEmail: "studio@archstudio.tn", phone: "+216 71 333 200", whatsapp: "+216 20 333 200", address: "Rue de Marseille, Tunis", gouvernorat: "tunis", ville: "Tunis", sectorId: "architecture", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.1658, 36.7998] } },
      data: { displayName: i18n("ArchStudio"), logoUrl: logoUrl("ArchStudio", "8B5CF6"), bannerUrl: bannerUrl("c-006") },
      status: "pending", registeredAt: daysAgo(158), validatedAt: daysAgo(157), rseBadgeStatus: "validated",
      pendingUpdates: { submittedAt: daysAgo(7), fields: [{ key: "data.logoUrl", label: "Logo", currentValue: logoUrl("ArchStudio", "8B5CF6"), newValue: logoUrl("ArchStudioNew", "7C3AED") }] },
      profiles: {
        brandup: { kind: "brandup", status: "active", data: { pitch: i18n("Cabinet d'architecture spécialisé dans les projets résidentiels haut de gamme et les espaces commerciaux."), about: i18n("Fondé en 2017, ArchStudio est un cabinet d'architecture indépendant basé à Tunis."), color: "#8B5CF6", links: [{ label: i18n("Site web"), url: "https://archstudio.tn", icon: "language" }], gallery: [], projects: [{ id: "proj-c-006-1", name: i18n("Villa Sidi Bou Saïd"), image: "https://picsum.photos/seed/c-006-proj-1/600/400", description: i18n("Villa contemporaine à Sidi Bou Saïd."), order: 1 }], certifications: [{ id: "cert-c-006-1", name: "Ordre des Architectes TN", label: i18n("Inscription ordinale"), icon: "verified", image: null, issuedAt: new Date("2017-09-01"), expiresAt: null }], services: [{ name: i18n("Architecture résidentielle") }, { name: i18n("Design d'intérieur") }] }, publishedAt: daysAgo(132), lastValidatedAt: daysAgo(132), stats: { viewsTotal: 678, views30d: 145, clicksTotal: 41 }, boosts: [], sponsorings: [] },
        traceup: { kind: "traceup", status: "active", data: { channelName: i18n("ArchStudio Films"), channelDescription: i18n(""), videos: [{ id: "v-c-006-1", source: "vimeo", videoId: "124540516", videoUrl: "https://vimeo.com/124540516", thumbnailUrl: vimeoThumb("124540516"), category: "actualite", title: i18n("Visite Villa Belvedere"), description: i18n("Visite virtuelle de la Villa Belvedere à Gammarth."), status: "active", publishedAt: daysAgo(80), order: 1 }] }, publishedAt: daysAgo(127), lastValidatedAt: daysAgo(127), stats: { viewsTotal: 423, views30d: 78, clicksTotal: 19 }, boosts: [], sponsorings: [] },
        linkup: { kind: "linkup", status: "active", data: { qrConfig: { style: "dots", colorForeground: "#8B5CF6", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "linkedin", url: "https://linkedin.com/in/salmabenaissa" }, { platform: "instagram", url: "https://instagram.com/archstudio.tn" }] }, publishedAt: daysAgo(132), lastValidatedAt: daysAgo(132), stats: { viewsTotal: 156, views30d: 38, clicksTotal: 12 }, boosts: [], sponsorings: [] },
      },
      transactions: [],
      rseReceipts: [
        { associationSeedId: "a-002", amount: 2500, donationDate: daysAgo(82), status: "validated", submittedAt: daysAgo(82), validatedAt: daysAgo(81) },
        { associationSeedId: "a-005", amount: 1800, donationDate: daysAgo(123), status: "validated", submittedAt: daysAgo(123), validatedAt: daysAgo(122) },
      ],
    },
    // c-007 — AutoPlus
    {
      seedId: "c-007", slug: "autoplus", type: "B2B", legalId: "B22334", accountEmail: "omar@autoplus.tn",
      user: { firstName: "Omar", lastName: "Belhaj", phone: "+216 73 600 100", languages: ["fr"] },
      liveData: { contactEmail: "contact@autoplus.tn", phone: "+216 73 600 200", whatsapp: "+216 20 600 200", address: "Route de Sahline, Sousse", gouvernorat: "sousse", ville: "Sousse", sectorId: "automobile-pro", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.6350, 35.8280] } },
      data: { displayName: i18n("AutoPlus"), logoUrl: logoUrl("AutoPlus", "DC2626"), bannerUrl: bannerUrl("c-007") },
      status: "active", registeredAt: daysAgo(203), validatedAt: daysAgo(202), rseBadgeStatus: "none",
      profiles: {
        brandup: {
          kind: "brandup", status: "active", data: { pitch: i18n("Distributeur de pièces automobiles et équipements professionnels pour garages et carrossiers."), about: i18n("AutoPlus est le distributeur de référence en pièces automobiles du Sahel tunisien depuis 2008."), color: "#DC2626", links: [{ label: i18n("Catalogue en ligne"), url: "https://autoplus.tn/catalogue", icon: "description" }], gallery: [], projects: [{ id: "proj-c-007-1", name: i18n("Pneumatiques Premium"), image: "https://picsum.photos/seed/c-007-proj-1/600/400", description: i18n("Distribution exclusive Michelin, Continental et Pirelli."), order: 1 }], certifications: [{ id: "cert-c-007-1", name: "Bosch Service Partner", label: i18n("Partenaire officiel Bosch"), icon: "verified", image: "https://picsum.photos/seed/c-007-cert-bosch/200/200", issuedAt: new Date("2023-01-01"), expiresAt: new Date("2026-01-01") }], services: [{ name: i18n("Pièces détachées toutes marques") }, { name: i18n("Livraison express") }] },
          pendingData: { submittedAt: daysAgo(1), fields: [{ key: "pitch", label: "Pitch", currentValue: "Distributeur de pièces automobiles...", newValue: "Centre auto multi-marques · 2 sites Tunis & Sousse..." }], note: "Mise à jour suite à l'ouverture de notre nouveau centre de service rapide." },
          publishedAt: daysAgo(188), lastValidatedAt: daysAgo(188), stats: { viewsTotal: 1287, views30d: 234, clicksTotal: 76 }, boosts: [], sponsorings: [],
        },
        traceup: { kind: "traceup", status: "active", data: { channelName: i18n("AutoPlus TV"), channelDescription: i18n(""), videos: [{ id: "v-c-007-1", source: "youtube", videoId: "YQHsXMglC9A", videoUrl: "https://www.youtube.com/watch?v=YQHsXMglC9A", thumbnailUrl: ytThumb("YQHsXMglC9A"), category: "astuces", title: i18n("Comment changer ses plaquettes de frein"), description: i18n("Tutoriel pas à pas."), status: "active", publishedAt: daysAgo(82), order: 1 }, { id: "v-c-007-2", source: "dailymotion", videoId: "x8a3kf9", videoUrl: "https://www.dailymotion.com/video/x8a3kf9", thumbnailUrl: dmThumb("x8a3kf9"), category: "offres", title: i18n("Promo printemps -15% pneumatiques"), description: i18n("Offre spéciale."), status: "active", publishedAt: daysAgo(21), order: 2 }, { id: "v-c-007-3", source: "youtube", videoId: "WMweEpGlu_U", videoUrl: "https://www.youtube.com/watch?v=WMweEpGlu_U", thumbnailUrl: ytThumb("WMweEpGlu_U"), category: "actualite", title: i18n("Test live nouvelle Volkswagen Polo"), description: i18n("Essai en direct."), status: "rejected", publishedAt: daysAgo(41), order: 3 }] }, publishedAt: daysAgo(158), lastValidatedAt: daysAgo(158), stats: { viewsTotal: 4567, views30d: 856, clicksTotal: 234 }, boosts: [{ seedId: "b-c-007-0", from: daysAgo(66), to: daysAgo(36), priceHT: 50, transactionSeedId: "t-c-007-1", viewsAdded: 1456, clicksAdded: 87, status: "expired" }], sponsorings: [] },
        linkup: { kind: "linkup", status: "active", data: { qrConfig: { style: "rounded", colorForeground: "#DC2626", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "linkedin", url: "https://linkedin.com/in/omarbelhaj" }, { platform: "youtube", url: "https://youtube.com/@autoplus.tn" }] }, publishedAt: daysAgo(188), lastValidatedAt: daysAgo(188), stats: { viewsTotal: 234, views30d: 45, clicksTotal: 18 }, boosts: [], sponsorings: [] },
      },
      transactions: [
        { seedId: "t-c-007-1", type: "boost", refSeedId: "b-c-007-0", profileKind: "traceup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(66), paymentMethod: "card", paymentReference: "MP-BST-AP-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00014", createdAt: daysAgo(66) },
      ],
      rseReceipts: [],
    },
    // c-008 — PharmaTN (pending initial registration)
    {
      seedId: "c-008", slug: "pharmatn", type: "B2C", legalId: "B11225", accountEmail: "nadia@pharmatn.tn",
      user: { firstName: "Nadia", lastName: "Saidi", phone: "+216 71 999 100", languages: ["fr"] },
      liveData: { contactEmail: "contact@pharmatn.tn", phone: "+216 71 999 200", whatsapp: "+216 20 999 200", address: "Avenue de la Liberté, Tunis", gouvernorat: "tunis", ville: "Tunis", sectorId: "sante", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.1797, 36.8008] } },
      data: { displayName: i18n("PharmaTN"), logoUrl: logoUrl("PharmaTN", "0EA5E9"), bannerUrl: bannerUrl("c-008") },
      status: "pending", registeredAt: daysAgo(2), rseBadgeStatus: "none",
      profiles: {
        brandup: { kind: "brandup", status: "incomplete", data: { color: "#0EA5E9", links: [], gallery: [], projects: [], certifications: [], services: [] }, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, boosts: [], sponsorings: [] },
        traceup: { kind: "traceup", status: "incomplete", data: { channelName: i18n(""), channelDescription: i18n(""), videos: [] }, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, boosts: [], sponsorings: [] },
        linkup: { kind: "linkup", status: "incomplete", data: { qrConfig: { style: "rounded", colorForeground: "#000000", colorBackground: "#FFFFFF", logoOverlay: false }, socials: [] }, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, boosts: [], sponsorings: [] },
      },
      transactions: [], rseReceipts: [],
    },
    // c-009 — EduPro Formation
    {
      seedId: "c-009", slug: "edupro", type: "B2B", legalId: "B44556", accountEmail: "hatem@edupro.tn",
      user: { firstName: "Hatem", lastName: "Gharbi", phone: "+216 71 444 100", languages: ["fr"] },
      liveData: { contactEmail: "contact@edupro.tn", phone: "+216 71 444 200", whatsapp: "+216 20 444 200", address: "Avenue Mohamed V, Tunis", gouvernorat: "tunis", ville: "Tunis", sectorId: "formation-pro", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.1720, 36.8028] } },
      data: { displayName: i18n("EduPro Formation"), logoUrl: logoUrl("EduPro", "7C3AED"), bannerUrl: bannerUrl("c-009") },
      status: "active", registeredAt: daysAgo(260), validatedAt: daysAgo(259), rseBadgeStatus: "validated",
      profiles: {
        brandup: { kind: "brandup", status: "active", data: { pitch: i18n("Centre de formation professionnelle à Tunis. Certifications IT, management, langues."), about: i18n("EduPro est un centre de formation agréé par le CNFCPP."), color: "#7C3AED", links: [{ label: i18n("Site web"), url: "https://edupro.tn", icon: "language" }], gallery: [], projects: [{ id: "proj-c-009-1", name: i18n("Formation Scrum Master"), image: "https://picsum.photos/seed/c-009-proj-1/600/400", description: i18n("Certification Scrum Master en 5 jours."), order: 1 }], certifications: [{ id: "cert-c-009-1", name: "CNFCPP Agréé", label: i18n("Centre agréé formation continue"), icon: "school", image: null, issuedAt: new Date("2020-01-01"), expiresAt: null }], services: [{ name: i18n("Formation IT") }, { name: i18n("Formation management") }] }, publishedAt: daysAgo(245), lastValidatedAt: daysAgo(245), stats: { viewsTotal: 987, views30d: 178, clicksTotal: 56 }, boosts: [{ seedId: "b-c-009-1", from: daysAgo(10), to: daysFromNow(20), priceHT: 50, transactionSeedId: "t-c-009-1", viewsAdded: 178, clicksAdded: 12, status: "active" }], sponsorings: [{ seedId: "s-c-009-1", from: daysAgo(5), to: daysFromNow(2), priceHT: 100, transactionSeedId: "t-c-009-2", targetCategory: "formation-pro", impressions: 890, clicks: 34, status: "active" }] },
        traceup: { kind: "traceup", status: "active", data: { channelName: i18n("EduPro Webinars"), channelDescription: i18n(""), videos: [{ id: "v-c-009-1", source: "youtube", videoId: "PkZNo7MFNFg", videoUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg", thumbnailUrl: ytThumb("PkZNo7MFNFg"), category: "astuces", title: i18n("Les 5 certifications IT les plus demandées en 2026"), description: i18n("Quelles certifications pour booster votre carrière IT."), status: "active", publishedAt: daysAgo(30), order: 1 }] }, publishedAt: daysAgo(230), lastValidatedAt: daysAgo(230), stats: { viewsTotal: 2345, views30d: 456, clicksTotal: 123 }, boosts: [], sponsorings: [] },
        linkup: { kind: "linkup", status: "disabled", data: { qrConfig: { style: "rounded", colorForeground: "#7C3AED", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "linkedin", url: "https://linkedin.com/in/hatemgharbi" }] }, publishedAt: daysAgo(245), lastValidatedAt: daysAgo(245), disabledAt: daysAgo(15), stats: { viewsTotal: 89, views30d: 0, clicksTotal: 5 }, boosts: [], sponsorings: [] },
      },
      transactions: [
        { seedId: "t-c-009-1", type: "boost", refSeedId: "b-c-009-1", profileKind: "brandup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(10), paymentMethod: "card", paymentReference: "MP-BST-EP-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00044", createdAt: daysAgo(10) },
        { seedId: "t-c-009-2", type: "sponsoring", refSeedId: "s-c-009-1", profileKind: "brandup", priceHT: 100, vatRate: 0.19, status: "paid", paidAt: daysAgo(5), paymentMethod: "card", paymentReference: "MP-SPO-EP-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00046", createdAt: daysAgo(5) },
      ],
      rseReceipts: [{ associationSeedId: "a-004", amount: 3500, donationDate: daysAgo(50), status: "validated", submittedAt: daysAgo(50), validatedAt: daysAgo(49) }],
    },
    // c-010 — TextilTunis
    {
      seedId: "c-010", slug: "textiltunis", type: "B2B", legalId: "B99887", accountEmail: "ali@textiltunis.tn",
      user: { firstName: "Ali", lastName: "Ben Amor", phone: "+216 71 888 100", languages: ["fr"] },
      liveData: { contactEmail: "contact@textiltunis.tn", phone: "+216 71 888 200", whatsapp: "+216 20 888 200", address: "Z.I. Mégrine, Ben Arous", gouvernorat: "ben-arous", ville: "Mégrine", sectorId: "textile", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.2320, 36.7680] } },
      data: { displayName: i18n("TextilTunis"), logoUrl: logoUrl("TextilTunis", "EC4899"), bannerUrl: bannerUrl("c-010") },
      status: "active", registeredAt: daysAgo(220), validatedAt: daysAgo(219), rseBadgeStatus: "none",
      profiles: {
        brandup: {
          kind: "brandup", status: "rejected",
          data: { pitch: i18n("Fabricant textile tunisien spécialisé dans le denim et les tissus techniques."), about: i18n("TextilTunis est un fabricant textile intégré basé à Ben Arous."), color: "#EC4899", links: [{ label: i18n("Site web"), url: "https://textiltunis.tn", icon: "language" }], gallery: [], projects: [{ id: "proj-c-010-1", name: i18n("Denim premium"), image: "https://picsum.photos/seed/c-010-proj-1/600/400", description: i18n("Gamme denim premium pour marques européennes."), order: 1 }], certifications: [], services: [{ name: i18n("Tissage") }, { name: i18n("Confection") }] },
          // Verbatim from seed
          rejectionReason: "Affirmations commerciales non vérifiables — la capacité de production annoncée (50 000 pièces/mois) n'est pas documentée. Veuillez fournir un justificatif ou reformuler.",
          rejectedAt: daysAgo(14), publishedAt: daysAgo(190), lastValidatedAt: daysAgo(190), stats: { viewsTotal: 456, views30d: 0, clicksTotal: 23 }, boosts: [], sponsorings: [],
        },
        traceup: {
          kind: "traceup", status: "rejected",
          data: { channelName: i18n("TextilTunis TV"), channelDescription: i18n(""), videos: [{ id: "v-c-010-1", source: "youtube", videoId: "ScMzIvxBSi4", videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4", thumbnailUrl: ytThumb("ScMzIvxBSi4"), category: "actualite", title: i18n("Visite de notre usine Ben Arous"), description: i18n("Visite guidée."), status: "active", publishedAt: daysAgo(30), order: 1 }] },
          rejectionReason: "Qualité d'image insuffisante — les miniatures ne respectent pas les exigences minimales de la plateforme.",
          rejectedAt: daysAgo(13), publishedAt: daysAgo(180), lastValidatedAt: daysAgo(180), stats: { viewsTotal: 123, views30d: 0, clicksTotal: 8 }, boosts: [], sponsorings: [],
        },
        linkup: { kind: "linkup", status: "active", data: { qrConfig: { style: "rounded", colorForeground: "#EC4899", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "linkedin", url: "https://linkedin.com/in/alibenamor" }] }, publishedAt: daysAgo(200), lastValidatedAt: daysAgo(200), stats: { viewsTotal: 167, views30d: 28, clicksTotal: 9 }, boosts: [{ seedId: "b-c-010-0", from: daysAgo(50), to: daysAgo(20), priceHT: 50, transactionSeedId: "t-c-010-1", viewsAdded: 89, clicksAdded: 5, status: "expired" }], sponsorings: [] },
      },
      transactions: [
        { seedId: "t-c-010-1", type: "boost", refSeedId: "b-c-010-0", profileKind: "linkup", priceHT: 50, vatRate: 0.19, status: "paid", paidAt: daysAgo(50), paymentMethod: "card", paymentReference: "MP-BST-TT-001", invoiceUrl: SAMPLE_INVOICE_DOC, invoiceNumber: "MU-2026-00020", createdAt: daysAgo(50) },
      ],
      rseReceipts: [],
    },
    // c-011 — Digital Agency Tunis (NO bannerUrl — tests initials fallback)
    {
      seedId: "c-011", slug: "digiagency", type: "B2B", legalId: "B11011", accountEmail: "youssef@digiagency.tn",
      user: { firstName: "Youssef", lastName: "Hamdi", phone: "+216 71 222 300", languages: ["fr"] },
      liveData: { contactEmail: "hello@digiagency.tn", phone: "+216 71 222 400", whatsapp: "+216 20 222 400", address: "Rue du Lac Léman, Les Berges du Lac", gouvernorat: "tunis", ville: "Tunis", sectorId: "informatique", languages: ["fr"], gpsPosition: { type: "Point", coordinates: [10.2100, 36.8420] } },
      data: { displayName: i18n("Digital Agency Tunis"), logoUrl: logoUrl("DigiAgency", "3B82F6"), bannerUrl: "" },
      status: "active", registeredAt: daysAgo(45), validatedAt: daysAgo(44), rseBadgeStatus: "none",
      profiles: {
        brandup: { kind: "brandup", status: "active", data: { pitch: i18n("Agence digitale spécialisée dans le développement web, mobile et la transformation numérique des entreprises tunisiennes."), about: i18n("Digital Agency Tunis accompagne les PME dans leur transition digitale depuis 2021. Expertise React, Next.js, Node.js et cloud."), color: "#3B82F6", links: [{ label: i18n("Site web"), url: "https://digiagency.tn", icon: "language" }], gallery: [], projects: [
          { id: "proj-c-011-1", name: i18n("App mobile Banque XYZ"), image: "https://picsum.photos/seed/c-011-proj-1/600/400", description: i18n("Application bancaire mobile React Native."), order: 1 },
          { id: "proj-c-011-2", name: i18n("Plateforme e-commerce"), image: "https://picsum.photos/seed/c-011-proj-2/600/400", description: i18n("Solution e-commerce Next.js pour retail tunisien."), order: 2 },
          { id: "proj-c-011-3", name: i18n("Dashboard IoT industriel"), image: "https://picsum.photos/seed/c-011-proj-3/600/400", description: i18n("Tableau de bord temps réel pour capteurs industriels."), order: 3 },
        ], certifications: [], services: [{ name: i18n("Développement web") }, { name: i18n("Applications mobiles") }, { name: i18n("Cloud & DevOps") }] }, publishedAt: daysAgo(30), lastValidatedAt: daysAgo(30), stats: { viewsTotal: 156, views30d: 45, clicksTotal: 12 }, boosts: [], sponsorings: [] },
        traceup: { kind: "traceup", status: "incomplete", data: { channelName: i18n(""), channelDescription: i18n(""), videos: [] }, stats: { viewsTotal: 0, views30d: 0, clicksTotal: 0 }, boosts: [], sponsorings: [] },
        linkup: { kind: "linkup", status: "active", data: { qrConfig: { style: "rounded", colorForeground: "#3B82F6", colorBackground: "#FFFFFF", logoOverlay: true }, socials: [{ platform: "linkedin", url: "https://linkedin.com/in/youssefhamdi" }, { platform: "instagram", url: "https://instagram.com/digiagency.tn" }] }, publishedAt: daysAgo(30), lastValidatedAt: daysAgo(30), stats: { viewsTotal: 67, views30d: 22, clicksTotal: 8 }, boosts: [], sponsorings: [] },
      },
      transactions: [], rseReceipts: [],
    },
  ];
}

// ═══════════════════════════════════════════════════
// SEED COMPANIES + CHILDREN
// ═══════════════════════════════════════════════════

async function seedCompanies(
  passwordHash: string,
  adminId: Types.ObjectId,
  associationMap: Map<string, Types.ObjectId>,
): Promise<void> {
  const companies = buildCompanies();

  for (const c of companies) {
    // Create user
    const user = await insert(User, {
      firstName: c.user.firstName,
      lastName: c.user.lastName,
      email: c.accountEmail,
      passwordHash,
      phone: c.user.phone ?? null,
      languages: c.user.languages,
      role: "OWNER",
      emailVerifiedAt: c.registeredAt,
      lastLoginAt: hoursAgo(Math.floor(Math.random() * 48)),
    });
    const userId = user._id as Types.ObjectId;
    userIdMap.set(c.seedId, userId);
    counts.users++;

    // Create company
    const company = await insert(Company, {
      slug: c.slug,
      type: c.type,
      legalId: c.legalId,
      identityDocumentUrl: SAMPLE_LEGAL_ID_DOC,
      accountEmail: c.accountEmail,
      country: "TN",
      data: {
        displayName: c.data.displayName,
        logoUrl: c.data.logoUrl,
        bannerUrl: c.data.bannerUrl,
        color: c.data.color ?? "#0078D4",
      },
      pendingUpdates: c.pendingUpdates ?? null,
      liveData: c.liveData,
      status: c.status,
      registeredAt: c.registeredAt,
      validatedAt: c.validatedAt ?? null,
      validatedBy: c.validatedAt ? adminId : null,
      suspendedAt: c.suspendedAt ?? null,
      suspendedReason: c.suspendedReason ?? null,
      rseBadgeStatus: c.rseBadgeStatus,
      rseBadgeValidatedAt: c.rseBadgeValidatedAt ?? null,
      ownerUserId: userId,
      ownerFullName: `${c.user.firstName} ${c.user.lastName}`.trim(),
    });
    const companyId = company._id as Types.ObjectId;

    // Update user with companyId
    await (User as any).updateOne({ _id: userId }, { companyId });
    counts.companies++;

    // Create 3 profiles
    for (const profileKey of ["brandup", "traceup", "linkup"] as const) {
      const p = c.profiles[profileKey];
      const profileDoc = await insert(Profile, {
        companyId,
        kind: p.kind,
        status: p.status,
        isPublic: true,
        submittedAt: p.submittedAt ?? null,
        publishedAt: p.publishedAt ?? null,
        lastValidatedAt: p.lastValidatedAt ?? null,
        lastValidatedBy: p.lastValidatedAt ? adminId : null,
        rejectionReason: p.rejectionReason ?? null,
        rejectedAt: p.rejectedAt ?? null,
        rejectedBy: p.rejectedAt ? adminId : null,
        disabledAt: p.disabledAt ?? null,
        pendingData: p.pendingData ?? null,
        stats: p.stats,
        data: p.data,
      });
      counts.profiles++;

      // Create boosts for this profile
      for (const b of p.boosts) {
        const boost = await insert(Boost, {
          companyId,
          profileKind: p.kind,
          from: b.from,
          to: b.to,
          status: b.status,
          viewsAdded: b.viewsAdded,
          clicksAdded: b.clicksAdded,
        });
        boostIdMap.set(b.seedId, boost._id as Types.ObjectId);
        counts.boosts++;
        if (b.status === "active") counts.boostsActive++;
      }

      // Create sponsorings for this profile
      for (const s of p.sponsorings) {
        const sponsoring = await insert(Sponsoring, {
          companyId,
          profileKind: p.kind,
          targetCategory: s.targetCategory,
          from: s.from,
          to: s.to,
          status: s.status,
          impressions: s.impressions,
          clicks: s.clicks,
        });
        sponsoringIdMap.set(s.seedId, sponsoring._id as Types.ObjectId);
        counts.sponsorings++;
        if (s.status === "active") counts.sponsoringsActive++;
      }
    }

    // Create transactions (priceHT + vatRate ONLY — no priceTTC, no vatAmount)
    for (const t of c.transactions) {
      // Resolve refId to real ObjectId
      let refId: Types.ObjectId | null = null;
      if (t.refSeedId) {
        refId = boostIdMap.get(t.refSeedId) ?? sponsoringIdMap.get(t.refSeedId) ?? null;
        if (!refId) {
          console.error(`❌ Could not resolve refSeedId "${t.refSeedId}" for transaction "${t.seedId}"`);
          process.exit(1);
        }
      }

      const txDoc = await insert(Transaction, {
        companyId,
        type: t.type,
        refId,
        profileKind: t.profileKind,
        priceHT: t.priceHT,
        vatRate: t.vatRate,
        currency: "DT",
        status: t.status,
        paidAt: t.paidAt,
        paymentMethod: t.paymentMethod,
        paymentReference: t.paymentReference,
        invoiceUrl: t.invoiceUrl,
        invoiceNumber: t.invoiceNumber,
      });

      // Back-link boost/sponsoring to transaction
      if (refId) {
        if (t.type === "boost") {
          await (Boost as any).updateOne({ _id: refId }, { transactionId: txDoc._id });
        } else {
          await (Sponsoring as any).updateOne({ _id: refId }, { transactionId: txDoc._id });
        }
      }
      counts.transactions++;
    }

    // Create RSE receipts
    for (const r of c.rseReceipts) {
      const associationId = associationMap.get(r.associationSeedId);
      if (!associationId) {
        console.error(`❌ Could not resolve associationSeedId "${r.associationSeedId}"`);
        process.exit(1);
      }
      await insert(RseReceipt, {
        companyId,
        associationId,
        amount: r.amount,
        currency: "DT",
        donationDate: r.donationDate,
        receiptDocumentUrl: SAMPLE_RSE_RECEIPT_DOC,
        status: r.status,
        submittedAt: r.submittedAt,
        validatedAt: r.validatedAt ?? null,
        validatedBy: r.validatedAt ? adminId : null,
        rejectedReason: r.rejectedReason ?? null,
      });
      counts.rseReceipts++;
      if (r.status === "validated") counts.rseValidated++;
      if (r.status === "pending") counts.rsePending++;
    }
  }
}

// ═══════════════════════════════════════════════════
// PROFILE STATS MONTHLY (tracking seed data)
// ═══════════════════════════════════════════════════

async function seedProfileStatsMonthly(): Promise<void> {
  const now = new Date();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonth = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;

  // Find all profiles with non-zero stats
  const profiles = await (Profile as any).find({
    $or: [
      { "stats.viewsTotal": { $gt: 0 } },
      { "stats.clicksTotal": { $gt: 0 } },
    ],
  }).select("_id stats").lean();

  const docs: Record<string, unknown>[] = [];
  for (const p of profiles as any[]) {
    const viewsTotal = p.stats?.viewsTotal ?? 0;
    const clicksTotal = p.stats?.clicksTotal ?? 0;

    // Split roughly: 60% current month, 40% previous month
    const viewsCur = Math.round(viewsTotal * 0.6);
    const viewsPrev = viewsTotal - viewsCur;
    const clicksCur = Math.round(clicksTotal * 0.6);
    const clicksPrev = clicksTotal - clicksCur;

    if (viewsCur > 0 || clicksCur > 0) {
      docs.push({ profileId: p._id, month: currentMonth, views: viewsCur, clicks: clicksCur });
    }
    if (viewsPrev > 0 || clicksPrev > 0) {
      docs.push({ profileId: p._id, month: prevMonth, views: viewsPrev, clicks: clicksPrev });
    }
  }

  if (docs.length > 0) {
    await insertBulk(ProfileStatsMonthlyModel as any, docs);
  }
  counts.profileStatsMonthly = docs.length;
}

// ═══════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════

async function seedNotifications(adminId: Types.ObjectId): Promise<void> {
  // Helper to find user by company seed ID
  const userFor = (companySeedId: string): Types.ObjectId => {
    const id = userIdMap.get(companySeedId);
    if (!id) throw new Error(`User not found for ${companySeedId}`);
    return id;
  };

  const notifications = [
    // c-001 TechnoFab — 3 unread
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "boost_expiring", icon: "trending_up", color: "primary", title: i18n("Votre boost LinkUP"), body: i18n("expire dans 3 jours"), actionUrl: "/dashboard/boost", read: false, createdAt: daysAgo(1) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "sponsoring_metrics", icon: "campaign", color: "primary", title: i18n("Votre campagne Sponsoring"), body: i18n("a généré 1\u00A0250 impressions"), actionUrl: "/dashboard/sponsoring", read: false, createdAt: hoursAgo(12) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "rse_receipt_submitted", icon: "volunteer_activism", color: "gold", title: i18n("Reçu RSE soumis"), body: i18n("Association Al Ahed en attente de validation"), actionUrl: "/dashboard/rse", read: false, createdAt: daysAgo(4) },
    // c-001 TechnoFab — older read
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "profile_rejected", icon: "cancel", color: "danger", title: i18n("Profil BrandUP refusé"), body: i18n("Pitch non conforme à la charte de décence"), actionUrl: "/dashboard/brandup", read: true, readAt: daysAgo(37), createdAt: daysAgo(38) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "rse_receipt_validated", icon: "verified", color: "success", title: i18n("Don RSE validé"), body: i18n("Tunisie Verte — 4\u00A0000 DT"), actionUrl: "/dashboard/rse", read: true, readAt: daysAgo(99), createdAt: daysAgo(99) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "account_validated", icon: "how_to_reg", color: "success", title: i18n("Compte validé"), body: i18n("Bienvenue sur MARKET-UP"), actionUrl: "/dashboard", read: true, readAt: daysAgo(96), createdAt: daysAgo(96) },
    // c-001 TechnoFab — 9 additional historical (read)
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "system_welcome", icon: "celebration", color: "primary", title: i18n("Bienvenue sur MARKET-UP"), body: i18n("Découvrez les fonctionnalités de votre dashboard"), actionUrl: "/dashboard", read: true, readAt: daysAgo(97), createdAt: daysAgo(97) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "profile_submitted", icon: "send", color: "primary", title: i18n("Profil LinkUP soumis à validation"), body: i18n("Votre carte de contact est en cours d'examen"), actionUrl: "/dashboard/linkup", read: true, readAt: daysAgo(42), createdAt: daysAgo(42) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "profile_validated", icon: "task_alt", color: "success", title: i18n("Profil LinkUP validé"), body: i18n("Votre profil LinkUP est maintenant visible publiquement"), actionUrl: "/dashboard/linkup", read: true, readAt: daysAgo(35), createdAt: daysAgo(35) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "rse_validated", icon: "volunteer_activism", color: "gold", title: i18n("Reçu RSE validé — Croissant Rouge Tunisien"), body: i18n("3\u00A0200 DT · Engagement social attesté"), actionUrl: "/dashboard/rse", read: true, readAt: daysAgo(137), createdAt: daysAgo(138) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "profile_submitted", icon: "send", color: "primary", title: i18n("Profil TraceUP soumis à validation"), body: i18n("Votre chaîne média est en cours d'examen"), actionUrl: "/dashboard/traceup", read: true, readAt: daysAgo(3), createdAt: daysAgo(4) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "boost_started", icon: "trending_up", color: "success", title: i18n("Boost LinkUP activé"), body: i18n("Visibilité boostée pendant 30 jours"), actionUrl: "/dashboard/boost", read: true, readAt: daysAgo(50), createdAt: new Date("2026-03-24T10:00:00.000Z") },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "sponsoring_started", icon: "campaign", color: "success", title: i18n("Campagne Sponsoring démarrée — LinkUP Mécanique"), body: i18n("Campagne ciblée active pendant 7 jours"), actionUrl: "/dashboard/sponsoring", read: true, readAt: daysAgo(28), createdAt: new Date("2026-04-15T08:00:00.000Z") },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "security_new_device", icon: "security", color: "warning", title: i18n("Nouvelle connexion détectée"), body: i18n("Chrome sur Windows · Tunis, Tunisie"), actionUrl: "/dashboard/settings", read: true, readAt: daysAgo(7), createdAt: daysAgo(7) },
    { recipientType: "owner", recipientId: userFor("c-001"), kind: "boost_expiring", icon: "trending_up", color: "warning", title: i18n("Boost LinkUP — renouvellement recommandé"), body: i18n("Votre boost expire dans 7 jours"), actionUrl: "/dashboard/boost", read: true, readAt: daysAgo(5), createdAt: daysAgo(6) },
    // Admin notifications (Bassem)
    { recipientType: "admin", recipientId: adminId, kind: "profile_submitted", icon: "upload", color: "primary", title: i18n("Nouveau profil TraceUP soumis"), body: i18n("TechnoFab Industries — en attente de validation"), actionUrl: "/admin/validation/profils", read: false, createdAt: daysAgo(4) },
    { recipientType: "admin", recipientId: adminId, kind: "rse_receipt_submitted", icon: "volunteer_activism", color: "gold", title: i18n("Nouveau reçu RSE"), body: i18n("TechnoFab — Al Ahed — 5\u00A0200 DT"), actionUrl: "/admin/validation/rse", read: false, createdAt: daysAgo(4) },
    { recipientType: "admin", recipientId: adminId, kind: "company_pending_validation", icon: "how_to_reg", color: "primary", title: i18n("Nouveau compte à valider"), body: i18n("PharmaTN — inscription du 20 avril"), actionUrl: "/admin/validation/comptes", read: false, createdAt: daysAgo(2) },
    { recipientType: "admin", recipientId: adminId, kind: "company_pending_modification", icon: "edit", color: "primary", title: i18n("Modification compte à valider"), body: i18n("BuildTech — nouvelle bannière soumise"), actionUrl: "/admin/validation/comptes", read: false, createdAt: daysAgo(3) },
    { recipientType: "admin", recipientId: adminId, kind: "company_pending_modification", icon: "edit", color: "primary", title: i18n("Modification compte à valider"), body: i18n("ArchStudio — nouveau logo soumis"), actionUrl: "/admin/validation/comptes", read: false, createdAt: daysAgo(7) },
    { recipientType: "admin", recipientId: adminId, kind: "dispute_opened", icon: "gavel", color: "danger", title: i18n("Nouveau litige ouvert"), body: i18n("TextilTunis — contestation refus BrandUP"), actionUrl: "/admin/litiges", read: false, createdAt: daysAgo(10) },
    // c-003 GreenLife
    { recipientType: "owner", recipientId: userFor("c-003"), kind: "boost_started", icon: "trending_up", color: "success", title: i18n("Boost activé"), body: i18n("Votre boost BrandUP est actif jusqu'au 1er mai"), actionUrl: "/dashboard/boost", read: true, readAt: daysAgo(20), createdAt: daysAgo(21) },
    // c-005 FoodCorner
    { recipientType: "owner", recipientId: userFor("c-005"), kind: "account_suspended", icon: "block", color: "danger", title: i18n("Compte suspendu"), body: i18n("Suite au litige de facturation — contactez le support"), actionUrl: "/dashboard/litiges", read: false, createdAt: daysAgo(21) },
    // c-010 TextilTunis
    { recipientType: "owner", recipientId: userFor("c-010"), kind: "profile_rejected", icon: "cancel", color: "danger", title: i18n("Profil BrandUP refusé"), body: i18n("Affirmations commerciales non vérifiables"), actionUrl: "/dashboard/brandup", read: true, readAt: daysAgo(13), createdAt: daysAgo(14) },
    { recipientType: "owner", recipientId: userFor("c-010"), kind: "profile_rejected", icon: "cancel", color: "danger", title: i18n("Profil TraceUP refusé"), body: i18n("Qualité d'image insuffisante"), actionUrl: "/dashboard/traceup", read: true, readAt: daysAgo(12), createdAt: daysAgo(13) },
  ];

  await insertBulk(Notification, notifications);
  counts.notifications = notifications.length;
}

// ═══════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════

async function verifyTechnoFabCanon(): Promise<boolean> {
  const company = await (Company as any).findOne({ slug: "technofab-industries" }).setOptions({ withDeleted: true });
  if (!company) {
    console.error("❌ TechnoFab company not found!");
    return false;
  }

  const profiles = await (Profile as any).find({ companyId: company._id }).setOptions({ withDeleted: true });
  const brandup = profiles.find((p: { kind: string }) => p.kind === "brandup");
  const traceup = profiles.find((p: { kind: string }) => p.kind === "traceup");
  const linkup = profiles.find((p: { kind: string }) => p.kind === "linkup");

  let ok = true;
  if (brandup?.status !== "rejected") { console.error("❌ TechnoFab brandup should be rejected, got:", brandup?.status); ok = false; }
  if (traceup?.status !== "pending") { console.error("❌ TechnoFab traceup should be pending, got:", traceup?.status); ok = false; }
  if (linkup?.status !== "active") { console.error("❌ TechnoFab linkup should be active, got:", linkup?.status); ok = false; }
  if (company.rseBadgeStatus !== "validated") { console.error("❌ TechnoFab rseBadgeStatus should be validated, got:", company.rseBadgeStatus); ok = false; }

  return ok;
}

// ═══════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════

function printSummary(canonOk: boolean): void {
  const c = counts;
  console.log(`
════════════════════════════════════
✅ Seed completed successfully
════════════════════════════════════
Reference data:
  ✅ ${c.gouvernorats} gouvernorats
  ✅ ${c.sectorsB2B} B2B sectors + ${c.sectorsB2C} B2C categories
  ✅ ${c.associations} associations
Admin:
  ✅ ${c.adminUsers} admin user (Bassem Admin)
Companies:
  ✅ ${c.companies} companies (c-001 = TechnoFab Industries, B2B Mécanique Sousse)
  ✅ ${c.users} users (1 owner per company; Ahmed Mrabet for c-001)
Profiles:
  ✅ ${c.profiles} profiles (3 per company)
  ${canonOk ? "✅" : "❌"} TechnoFab canon verified:
     - brandup.status = rejected ${canonOk ? "✓" : "✗"}
     - traceup.status = pending  ${canonOk ? "✓" : "✗"}
     - linkup.status  = active   ${canonOk ? "✓" : "✗"}
     - rseBadgeStatus = validated ${canonOk ? "✓" : "✗"}
Monetization:
  ✅ ${c.boosts} boosts (${c.boostsActive} currently active)
  ✅ ${c.sponsorings} sponsorings (${c.sponsoringsActive} currently active)
  ✅ ${c.transactions} transactions (priceHT + vatRate only, no priceTTC stored)
RSE:
  ✅ ${c.rseReceipts} receipts (${c.rseValidated} validated, ${c.rsePending} pending)
Notifications:
  ✅ ${c.notifications} notifications
════════════════════════════════════`);
}

// ═══════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
