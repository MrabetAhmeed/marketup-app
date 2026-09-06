/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Production seed script — run ONCE on first deployment.
 *
 * Creates:
 *   - 24 gouvernorats
 *   - 50 sectors (25 B2B + 25 B2C)
 *   - 1 association (SOS Villages d'Enfants Tunisie)
 *   - 1 admin user (password from ADMIN_INITIAL_PASSWORD env var)
 *   - Invoice counter at seq 0
 *
 * Safety:
 *   - Refuses if any company, profile or transaction exists (B1)
 *   - Idempotent on referentials via upsert (B2)
 *   - Interactive confirmation showing target DB name (B3)
 *   - Requires ADMIN_INITIAL_PASSWORD (env var or masked interactive input) (B4)
 *   - Never drops or deletes any collection (B5)
 */

import * as readline from "node:readline";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Company } from "../src/models/company.model";
import { Profile } from "../src/models/profile.model";
import { Transaction } from "../src/models/transaction.model";
import { AdminUser } from "../src/models/admin-user.model";
import { Association } from "../src/models/association.model";
import { Sector } from "../src/models/sector.model";
import { Gouvernorat } from "../src/models/gouvernorat.model";
import { Counter } from "../src/models/counter.model";
import { extractMongoDbName, validateAdminPassword } from "@/lib/uri-utils";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 10;

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function i18n(fr: string, ar = "", en = ""): { fr: string; ar: string; en: string } {
  return { fr, ar, en };
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

function readPasswordMasked(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.setRawMode) {
      reject(new Error("Cannot read password: no interactive terminal available."));
      return;
    }

    process.stdout.write(prompt);

    // Work directly with raw stdin — no readline.createInterface.
    // readline echoes characters to stdout even in raw mode, defeating masking.
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";
    const onData = (chunk: string): void => {
      // In raw mode, each keypress arrives as a separate chunk.
      // On Windows, Enter sends \r; on Unix, Enter sends \r or \n.
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);

        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          return;
        } else if (code === 3) {
          // Ctrl+C
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          process.exit(130);
        } else if (code === 127 || code === 8) {
          // Backspace (DEL=127, BS=8)
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (code >= 32) {
          password += ch;
          process.stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }

  // ── B4: Admin password — env var or masked interactive input ──
  let adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword) {
    if (!process.stdin.isTTY) {
      console.error("ADMIN_INITIAL_PASSWORD not set and no interactive terminal available.");
      console.error("Set ADMIN_INITIAL_PASSWORD in your environment, or run this script with an interactive terminal.");
      process.exit(1);
    }
    adminPassword = await readPasswordMasked("Enter admin password (min 10 chars, input is masked): ");
  }
  const pwCheck = validateAdminPassword(adminPassword, MIN_PASSWORD_LENGTH);
  if (!pwCheck.valid) {
    console.error(`Admin password rejected: ${pwCheck.reason}`);
    process.exit(1);
  }

  // ── B3: Confirmation showing target DB ──
  const dbName = extractMongoDbName(uri);
  const confirmed = await confirm(
    `Production seed will write referentials + admin to "${dbName || "(default)"}". Continue? (yes/no): `,
  );
  if (!confirmed) {
    console.log("Aborted.");
    process.exit(0);
  }

  await mongoose.connect(uri);

  // ── B1: Refuse if business data exists ──
  const [companyCount, profileCount, transactionCount] = await Promise.all([
    (Company as any).countDocuments({}),
    (Profile as any).countDocuments({}),
    (Transaction as any).countDocuments({}),
  ]);

  if (companyCount > 0 || profileCount > 0 || transactionCount > 0) {
    console.error(`Database "${dbName}" already contains business data (${companyCount} companies, ${profileCount} profiles, ${transactionCount} transactions).`);
    console.error("The production seed must only run on an empty database. Aborting.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("No business data found (0 companies, 0 profiles, 0 transactions) — proceeding with production seed.\n");

  // 1. Gouvernorats (upsert by slug)
  await seedGouvernorats();

  // 2. Sectors (upsert by slug)
  await seedSectors();

  // 3. Association (upsert by slug)
  await seedAssociation();

  // 4. Admin user (upsert by email)
  await seedAdminUser(adminPassword);

  // 5. Invoice counter (upsert — $setOnInsert ensures an existing seq is never reset)
  const year = new Date().getFullYear();
  const counterResult = await (Counter as any).updateOne(
    { _id: `invoice-${year}` },
    { $setOnInsert: { seq: 0 } },
    { upsert: true },
  );
  if (counterResult.upsertedCount > 0) {
    console.log(`  Counter invoice-${year}: created (seq 0)`);
  } else {
    console.log(`  Counter invoice-${year}: already exists (seq preserved)`);
  }

  // Summary
  console.log("\n========================================");
  console.log("  Production seed completed successfully");
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

// ═══════════════════════════════════════════════════
// REFERENTIALS
// ═══════════════════════════════════════════════════

async function seedGouvernorats(): Promise<void> {
  const data = [
    { slug: "tunis", name: i18n("Tunis", "\u062A\u0648\u0646\u0633"), order: 1 },
    { slug: "ariana", name: i18n("Ariana", "\u0623\u0631\u064A\u0627\u0646\u0629"), order: 2 },
    { slug: "ben-arous", name: i18n("Ben Arous", "\u0628\u0646 \u0639\u0631\u0648\u0633"), order: 3 },
    { slug: "manouba", name: i18n("Manouba", "\u0645\u0646\u0648\u0628\u0629"), order: 4 },
    { slug: "nabeul", name: i18n("Nabeul", "\u0646\u0627\u0628\u0644"), order: 5 },
    { slug: "zaghouan", name: i18n("Zaghouan", "\u0632\u063A\u0648\u0627\u0646"), order: 6 },
    { slug: "bizerte", name: i18n("Bizerte", "\u0628\u0646\u0632\u0631\u062A"), order: 7 },
    { slug: "beja", name: i18n("B\u00e9ja", "\u0628\u0627\u062C\u0629"), order: 8 },
    { slug: "jendouba", name: i18n("Jendouba", "\u062C\u0646\u062F\u0648\u0628\u0629"), order: 9 },
    { slug: "kef", name: i18n("Le Kef", "\u0627\u0644\u0643\u0627\u0641"), order: 10 },
    { slug: "siliana", name: i18n("Siliana", "\u0633\u0644\u064A\u0627\u0646\u0629"), order: 11 },
    { slug: "kairouan", name: i18n("Kairouan", "\u0627\u0644\u0642\u064A\u0631\u0648\u0627\u0646"), order: 12 },
    { slug: "kasserine", name: i18n("Kasserine", "\u0627\u0644\u0642\u0635\u0631\u064A\u0646"), order: 13 },
    { slug: "sidi-bouzid", name: i18n("Sidi Bouzid", "\u0633\u064A\u062F\u064A \u0628\u0648\u0632\u064A\u062F"), order: 14 },
    { slug: "sousse", name: i18n("Sousse", "\u0633\u0648\u0633\u0629"), order: 15 },
    { slug: "monastir", name: i18n("Monastir", "\u0627\u0644\u0645\u0646\u0633\u062A\u064A\u0631"), order: 16 },
    { slug: "mahdia", name: i18n("Mahdia", "\u0627\u0644\u0645\u0647\u062F\u064A\u0629"), order: 17 },
    { slug: "sfax", name: i18n("Sfax", "\u0635\u0641\u0627\u0642\u0633"), order: 18 },
    { slug: "gafsa", name: i18n("Gafsa", "\u0642\u0641\u0635\u0629"), order: 19 },
    { slug: "tozeur", name: i18n("Tozeur", "\u062A\u0648\u0632\u0631"), order: 20 },
    { slug: "kebili", name: i18n("K\u00e9bili", "\u0642\u0628\u0644\u064A"), order: 21 },
    { slug: "gabes", name: i18n("Gab\u00e8s", "\u0642\u0627\u0628\u0633"), order: 22 },
    { slug: "medenine", name: i18n("M\u00e9denine", "\u0645\u062F\u0646\u064A\u0646"), order: 23 },
    { slug: "tataouine", name: i18n("Tataouine", "\u062A\u0637\u0627\u0648\u064A\u0646"), order: 24 },
  ];

  let upserted = 0;
  for (const item of data) {
    const result = await (Gouvernorat as any).updateOne(
      { slug: item.slug },
      { $set: item },
      { upsert: true },
    );
    if (result.upsertedCount > 0) upserted++;
  }
  console.log(`  Gouvernorats: ${data.length} processed (${upserted} new)`);
}

async function seedSectors(): Promise<void> {
  const b2b = [
    { slug: "agro-industrie", kind: "B2B", name: i18n("Agro-Industrie & Transformation"), description: "Conserveries, conditionnement, produits du terroir", group: "Industrie & Production", groupOrder: 1, icon: "agriculture", order: 1 },
    { slug: "textile-confection", kind: "B2B", name: i18n("Textile, Confection & Habillement"), description: "Filature, usines de textile, accessoires pro", group: "Industrie & Production", groupOrder: 1, icon: "checkroom", order: 2 },
    { slug: "plasturgie-chimie", kind: "B2B", name: i18n("Plasturgie, Chimie & Mat\u00e9riaux"), description: "Injection, moules, caoutchouc, mati\u00e8res premi\u00e8res", group: "Industrie & Production", groupOrder: 1, icon: "science", order: 3 },
    { slug: "metallurgie-mecanique", kind: "B2B", name: i18n("M\u00e9tallurgie, Sid\u00e9rurgie & M\u00e9canique"), description: "Soudure, usinage de pr\u00e9cision, fonderie", group: "Industrie & Production", groupOrder: 1, icon: "settings", order: 4 },
    { slug: "machinerie-robotique", kind: "B2B", name: i18n("Machinerie, Robotique & Automatisme"), description: "Lignes de production, maintenance machines", group: "Industrie & Production", groupOrder: 1, icon: "precision_manufacturing", order: 5 },
    { slug: "packaging-imprimerie", kind: "B2B", name: i18n("Packaging, Imprimerie & \u00c9dition"), description: "Cartonnerie, \u00e9tiquetage, impression industrielle", group: "Industrie & Production", groupOrder: 1, icon: "print", order: 6 },
    { slug: "maintenance-industrielle", kind: "B2B", name: i18n("Maintenance & Maintenance Industrielle"), description: "Pi\u00e8ces de rechange, froid, d\u00e9pannage usine", group: "Industrie & Production", groupOrder: 1, icon: "build", order: 7 },
    { slug: "btp-construction", kind: "B2B", name: i18n("BTP & Mat\u00e9riaux de Construction"), description: "Gros \u0153uvre, carrelage, ciment, infrastructures", group: "B\u00e2timent & Infrastructure", groupOrder: 2, icon: "construction", order: 8 },
    { slug: "energie-electricite", kind: "B2B", name: i18n("\u00c9nergie, \u00c9lectricit\u00e9 & Environnement"), description: "Solaire, traitement des eaux, recyclage", group: "B\u00e2timent & Infrastructure", groupOrder: 2, icon: "bolt", order: 9 },
    { slug: "immobilier-professionnel", kind: "B2B", name: i18n("Immobilier Professionnel"), description: "Vente/Location de bureaux, entrep\u00f4ts, parcs industriels", group: "B\u00e2timent & Infrastructure", groupOrder: 2, icon: "business", order: 10 },
    { slug: "logistique-transport", kind: "B2B", name: i18n("Logistique, Transport & Transit"), description: "Fret maritime/a\u00e9rien, entreposage, douane", group: "Logistique & Mobilit\u00e9", groupOrder: 3, icon: "local_shipping", order: 11 },
    { slug: "automobile-flottes", kind: "B2B", name: i18n("Automobile Professionnel & Flottes"), description: "Vente/Leasing de camions, utilitaires, engins", group: "Logistique & Mobilit\u00e9", groupOrder: 3, icon: "directions_car", order: 12 },
    { slug: "commerce-gros", kind: "B2B", name: i18n("Commerce de Gros & Distribution"), description: "Plateformes de revente B2B, centrales d'achat", group: "Commerce & International", groupOrder: 4, icon: "inventory_2", order: 13 },
    { slug: "negoce-import-export", kind: "B2B", name: i18n("N\u00e9goce & Import-Export"), description: "Accompagnement international, trading", group: "Commerce & International", groupOrder: 4, icon: "public", order: 14 },
    { slug: "it-logiciels-cloud", kind: "B2B", name: i18n("IT, Logiciels & Solutions Cloud"), description: "ERP, CRM, d\u00e9veloppement sur mesure", group: "Technologie & Digital", groupOrder: 5, icon: "computer", order: 15 },
    { slug: "telecoms-cybersecurite", kind: "B2B", name: i18n("T\u00e9l\u00e9coms, R\u00e9seaux & Cybers\u00e9curit\u00e9"), description: "Fibre pro, s\u00e9curit\u00e9 des donn\u00e9es", group: "Technologie & Digital", groupOrder: 5, icon: "cell_tower", order: 16 },
    { slug: "banques-leasing", kind: "B2B", name: i18n("Banques, Leasing & Micro-finance"), description: "Financement d'investissements, cr\u00e9dits pros", group: "Finance & Conseil", groupOrder: 6, icon: "account_balance", order: 17 },
    { slug: "conseils-audit", kind: "B2B", name: i18n("Conseils, Audit & Expertise Comptable"), description: "Juridique, fiscalit\u00e9, strat\u00e9gie", group: "Finance & Conseil", groupOrder: 6, icon: "business_center", order: 18 },
    { slug: "assurances-professionnelles", kind: "B2B", name: i18n("Assurances Professionnelles"), description: "RC Pro, assurance flottes et marchandises", group: "Finance & Conseil", groupOrder: 6, icon: "verified_user", order: 19 },
    { slug: "sante-equipements", kind: "B2B", name: i18n("Sant\u00e9 & \u00c9quipements M\u00e9dicaux"), description: "Mat\u00e9riel clinique, laboratoires, dispositifs", group: "Sant\u00e9 & Services Sp\u00e9cialis\u00e9s", groupOrder: 7, icon: "medical_services", order: 20 },
    { slug: "hotellerie-chr", kind: "B2B", name: i18n("H\u00f4tellerie, Restauration & CHR"), description: "\u00c9quipements de cuisines pro, linge h\u00f4telier", group: "Sant\u00e9 & Services Sp\u00e9cialis\u00e9s", groupOrder: 7, icon: "hotel", order: 21 },
    { slug: "services-nettoyage", kind: "B2B", name: i18n("Services G\u00e9n\u00e9raux & Nettoyage Pro"), description: "Entretien de locaux, hygi\u00e8ne industrielle", group: "Sant\u00e9 & Services Sp\u00e9cialis\u00e9s", groupOrder: 7, icon: "cleaning_services", order: 22 },
    { slug: "securite-gardiennage", kind: "B2B", name: i18n("S\u00e9curit\u00e9, Gardiennage & Protection"), description: "Surveillance de sites, alarmes, s\u00e9curit\u00e9", group: "Sant\u00e9 & Services Sp\u00e9cialis\u00e9s", groupOrder: 7, icon: "shield", order: 23 },
    { slug: "rh-recrutement", kind: "B2B", name: i18n("Ressources Humaines & Recrutement"), description: "Formation, int\u00e9rim, cabinets de RH", group: "Sant\u00e9 & Services Sp\u00e9cialis\u00e9s", groupOrder: 7, icon: "group", order: 24 },
    { slug: "artisanat-export", kind: "B2B", name: i18n("Artisanat d'Exportation & Design"), description: "Production de masse pour l'export, mobilier", group: "Sant\u00e9 & Services Sp\u00e9cialis\u00e9s", groupOrder: 7, icon: "palette", order: 25 },
  ];

  const b2c = [
    { slug: "manger-sortir", kind: "B2C", name: i18n("Manger & Sortir"), description: "Restaurants, caf\u00e9s, fast-food, salons de th\u00e9", group: "Se nourrir & Savourer", groupOrder: 1, icon: "restaurant", order: 1 },
    { slug: "faire-ses-courses", kind: "B2C", name: i18n("Faire ses courses"), description: "Supermarch\u00e9s, boucheries, \u00e9piceries fines, boulangeries", group: "Se nourrir & Savourer", groupOrder: 1, icon: "storefront", order: 2 },
    { slug: "habiller-chausser", kind: "B2C", name: i18n("S'habiller & Se chausser"), description: "Boutiques de mode, pr\u00eat-\u00e0-porter, accessoires", group: "S'habiller & Rayonner", groupOrder: 2, icon: "checkroom", order: 3 },
    { slug: "se-faire-beau", kind: "B2C", name: i18n("Se faire beau / belle"), description: "Coiffure, instituts de beaut\u00e9, spas, cosm\u00e9tique", group: "S'habiller & Rayonner", groupOrder: 2, icon: "spa", order: 4 },
    { slug: "offrir-luxe", kind: "B2C", name: i18n("S'offrir du luxe"), description: "Bijouterie, horlogerie, cadeaux de prestige", group: "S'habiller & Rayonner", groupOrder: 2, icon: "diamond", order: 5 },
    { slug: "se-loger", kind: "B2C", name: i18n("Se loger"), description: "Agences immobili\u00e8res, vente et location d'appartements/villas", group: "Se loger & Am\u00e9nager", groupOrder: 3, icon: "home", order: 6 },
    { slug: "decorer-meubler", kind: "B2C", name: i18n("D\u00e9corer & Meubler"), description: "Magasins de meubles, luminaires, art de la table", group: "Se loger & Am\u00e9nager", groupOrder: 3, icon: "chair", order: 7 },
    { slug: "bricoler-jardiner", kind: "B2C", name: i18n("Bricoler & Jardiner"), description: "Quincaillerie, p\u00e9pini\u00e8res, outillage, piscines", group: "Se loger & Am\u00e9nager", groupOrder: 3, icon: "yard", order: 8 },
    { slug: "se-deplacer", kind: "B2C", name: i18n("Se d\u00e9placer (Auto/Moto)"), description: "Concessionnaires, vente d'occasions, location", group: "Se d\u00e9placer & Voyager", groupOrder: 4, icon: "directions_car", order: 9 },
    { slug: "entretenir-vehicule", kind: "B2C", name: i18n("Entretenir son v\u00e9hicule"), description: "M\u00e9canique, lavage, centres de diagnostic", group: "Se d\u00e9placer & Voyager", groupOrder: 4, icon: "car_repair", order: 10 },
    { slug: "voyager-evader", kind: "B2C", name: i18n("Voyager & S'\u00e9vader"), description: "Agences de voyage, h\u00f4tels, maisons d'h\u00f4tes", group: "Se d\u00e9placer & Voyager", groupOrder: 4, icon: "flight", order: 11 },
    { slug: "demenager", kind: "B2C", name: i18n("D\u00e9m\u00e9nager"), description: "Services de d\u00e9m\u00e9nagement, garde-meubles", group: "Se d\u00e9placer & Voyager", groupOrder: 4, icon: "local_shipping", order: 12 },
    { slug: "se-soigner", kind: "B2C", name: i18n("Se soigner"), description: "Cliniques, cabinets m\u00e9dicaux, dentistes, opticiens", group: "Prendre soin de soi & des siens", groupOrder: 5, icon: "local_pharmacy", order: 13 },
    { slug: "se-ressourcer", kind: "B2C", name: i18n("Se ressourcer"), description: "Bien-\u00eatre mental, psychologie, sophrologie", group: "Prendre soin de soi & des siens", groupOrder: 5, icon: "self_improvement", order: 14 },
    { slug: "occuper-enfants", kind: "B2C", name: i18n("S'occuper des enfants"), description: "Cr\u00e8ches, univers b\u00e9b\u00e9, magasins de jouets", group: "Prendre soin de soi & des siens", groupOrder: 5, icon: "child_care", order: 15 },
    { slug: "apprendre-former", kind: "B2C", name: i18n("Apprendre & Se former"), description: "\u00c9coles priv\u00e9es, centres de langues, coaching", group: "Prendre soin de soi & des siens", groupOrder: 5, icon: "school", order: 16 },
    { slug: "soigner-animaux", kind: "B2C", name: i18n("Soigner ses animaux"), description: "V\u00e9t\u00e9rinaires, toilettage, animaleries", group: "Prendre soin de soi & des siens", groupOrder: 5, icon: "pets", order: 17 },
    { slug: "faire-sport", kind: "B2C", name: i18n("Faire du sport"), description: "Salles de fitness, clubs de sport, nutrition sportive", group: "Bouger & Se divertir", groupOrder: 6, icon: "fitness_center", order: 18 },
    { slug: "se-divertir", kind: "B2C", name: i18n("Se divertir"), description: "Cin\u00e9mas, parcs de jeux, culture, librairies", group: "Bouger & Se divertir", groupOrder: 6, icon: "theaters", order: 19 },
    { slug: "decouvrir-terroir", kind: "B2C", name: i18n("D\u00e9couvrir le terroir"), description: "Artisanat local, ateliers cr\u00e9atifs, produits traditionnels", group: "Bouger & Se divertir", groupOrder: 6, icon: "explore", order: 20 },
    { slug: "reparer-maison", kind: "B2C", name: i18n("R\u00e9parer sa maison"), description: "Plomberie, \u00e9lectricit\u00e9, d\u00e9pannage urgent", group: "G\u00e9rer & R\u00e9parer", groupOrder: 7, icon: "handyman", order: 21 },
    { slug: "depanner-materiel", kind: "B2C", name: i18n("D\u00e9panner son mat\u00e9riel"), description: "R\u00e9paration informatique, \u00e9crans mobiles, \u00e9lectronique", group: "G\u00e9rer & R\u00e9parer", groupOrder: 7, icon: "smartphone", order: 22 },
    { slug: "gerer-argent", kind: "B2C", name: i18n("G\u00e9rer son argent & s'assurer"), description: "Banques, assurances vie/auto, finance", group: "G\u00e9rer & R\u00e9parer", groupOrder: 7, icon: "account_balance", order: 23 },
    { slug: "occuper-linge", kind: "B2C", name: i18n("S'occuper de son linge"), description: "Pressing, blanchisserie, couture", group: "G\u00e9rer & R\u00e9parer", groupOrder: 7, icon: "local_laundry_service", order: 24 },
    { slug: "organiser-evenement", kind: "B2C", name: i18n("Organiser un \u00e9v\u00e9nement"), description: "Mariages, salles des f\u00eates, traiteurs, fleurs, photographes", group: "C\u00e9l\u00e9brer", groupOrder: 8, icon: "celebration", order: 25 },
  ];

  const allSectors = [...b2b, ...b2c];
  let upserted = 0;
  for (const item of allSectors) {
    const result = await (Sector as any).updateOne(
      { slug: item.slug },
      { $set: item },
      { upsert: true },
    );
    if (result.upsertedCount > 0) upserted++;
  }
  console.log(`  Sectors: ${allSectors.length} processed (${upserted} new)`);
}

async function seedAssociation(): Promise<void> {
  const result = await (Association as any).updateOne(
    { slug: "sos-villages-enfants-tunisie" },
    {
      $set: {
        slug: "sos-villages-enfants-tunisie",
        name: {
          fr: "Association Tunisienne des Villages d'Enfants SOS",
          ar: "\u0627\u0644\u062C\u0645\u0639\u064A\u0629 \u0627\u0644\u062A\u0648\u0646\u0633\u064A\u0629 \u0644\u0642\u0631\u0649 \u0627\u0644\u0623\u0637\u0641\u0627\u0644 SOS",
          en: "Tunisian Association of SOS Children's Villages",
        },
        website: "https://www.sosve.tn",
        domain: {
          fr: "Enfance et protection sociale",
          ar: "\u0627\u0644\u0637\u0641\u0648\u0644\u0629 \u0648\u0627\u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639\u064A\u0629",
          en: "Childhood and social protection",
        },
        description: {
          fr: "Organisation non gouvernementale, apolitique, non religieuse et \u00e0 but non lucratif, fond\u00e9e en 1981. Elle prend en charge les enfants priv\u00e9s de soutien parental ou en risque de le perdre, \u00e0 travers quatre villages d'enfants en Tunisie.",
          ar: "",
          en: "",
        },
        causes: ["enfance", "protection-sociale"],
        active: true,
        logoUrl: null,
        accreditationDocumentUrl: null,
        accreditedSince: null,
      },
    },
    { upsert: true },
  );
  const action = result.upsertedCount > 0 ? "created" : "updated";
  console.log(`  Association SOS Villages d'Enfants: ${action}`);
}

async function seedAdminUser(password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = await (AdminUser as any).updateOne(
    { email: "manager@vivasky.media" },
    {
      $set: {
        firstName: "Bassem",
        lastName: "Admin",
        email: "manager@vivasky.media",
        passwordHash,
        role: "SUPER_ADMIN",
        avatar: { initials: "BA", backgroundColor: "#5C2D91" },
        languages: ["fr"],
      },
      $setOnInsert: {
        lastLoginAt: null,
        deletedAt: null,
      },
    },
    { upsert: true },
  );
  const action = result.upsertedCount > 0 ? "created" : "password updated";
  console.log(`  Admin user (manager@vivasky.media): ${action}`);
}

// ═══════════════════════════════════════════════════

main().catch((err) => {
  console.error("Production seed failed:", err);
  process.exit(1);
});
