/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectDb } from "@/lib/db";
import { Sector } from "@/models/sector.model";
import { Gouvernorat } from "@/models/gouvernorat.model";
import { pickLocale } from "@/lib/i18n";
import type { SupportedLang } from "@/lib/i18n";

const SectorModel = Sector as any;
const GouvernoratModel = Gouvernorat as any;

export interface RefItem {
  slug: string;
  name: string;
}

export async function getSectorsB2B(lang: SupportedLang = "fr"): Promise<RefItem[]> {
  await connectDb();
  const docs = await SectorModel.find({ kind: "B2B", active: true }).sort({ order: 1 }).lean();
  return docs.map((d: any) => ({ slug: d.slug, name: pickLocale(d.name, lang) }));
}

export async function getCategoriesB2C(lang: SupportedLang = "fr"): Promise<RefItem[]> {
  await connectDb();
  const docs = await SectorModel.find({ kind: "B2C", active: true }).sort({ order: 1 }).lean();
  return docs.map((d: any) => ({ slug: d.slug, name: pickLocale(d.name, lang) }));
}

export async function getGouvernorats(lang: SupportedLang = "fr"): Promise<RefItem[]> {
  await connectDb();
  const docs = await GouvernoratModel.find({}).sort({ order: 1 }).lean();
  return docs.map((d: any) => ({ slug: d.slug, name: pickLocale(d.name, lang) }));
}
