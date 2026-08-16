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

export interface SectorRefItem extends RefItem {
  description: string;
  group: string;
  groupOrder: number;
  order: number;
}

export async function getSectorsB2B(lang: SupportedLang = "fr"): Promise<SectorRefItem[]> {
  await connectDb();
  const docs = await SectorModel.find({ kind: "B2B", active: true }).sort({ groupOrder: 1, order: 1 }).lean();
  return docs.map((d: any) => ({
    slug: d.slug,
    name: pickLocale(d.name, lang),
    description: d.description ?? "",
    group: d.group ?? "",
    groupOrder: d.groupOrder ?? 0,
    order: d.order ?? 0,
  }));
}

export async function getCategoriesB2C(lang: SupportedLang = "fr"): Promise<SectorRefItem[]> {
  await connectDb();
  const docs = await SectorModel.find({ kind: "B2C", active: true }).sort({ groupOrder: 1, order: 1 }).lean();
  return docs.map((d: any) => ({
    slug: d.slug,
    name: pickLocale(d.name, lang),
    description: d.description ?? "",
    group: d.group ?? "",
    groupOrder: d.groupOrder ?? 0,
    order: d.order ?? 0,
  }));
}

export async function getGouvernorats(lang: SupportedLang = "fr"): Promise<RefItem[]> {
  await connectDb();
  const docs = await GouvernoratModel.find({}).lean();
  const items = docs.map((d: any) => ({ slug: d.slug, name: pickLocale(d.name, lang) }));
  items.sort((a: RefItem, b: RefItem) => a.name.localeCompare(b.name, "fr"));
  return items;
}
