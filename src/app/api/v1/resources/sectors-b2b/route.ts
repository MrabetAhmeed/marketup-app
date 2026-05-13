/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { pickLocale } from "@/lib/i18n";
import type { SupportedLang } from "@/lib/i18n";
import { Sector } from "@/models/sector.model";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  await connectDb();

  const lang = (req.nextUrl.searchParams.get("lang") || "fr") as SupportedLang;

  const sectors = await (Sector as any)
    .find({ kind: "B2B", active: true })
    .sort({ order: 1 })
    .lean();

  const items = sectors.map((s: any) => ({
    slug: s.slug,
    name: pickLocale(s.name, lang),
    icon: s.icon || null,
    order: s.order,
  }));

  return NextResponse.json(items, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
