/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { pickLocale } from "@/lib/i18n";
import type { SupportedLang } from "@/lib/i18n";
import { Gouvernorat } from "@/models/gouvernorat.model";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  await connectDb();

  const lang = (req.nextUrl.searchParams.get("lang") || "fr") as SupportedLang;

  const gouvernorats = await (Gouvernorat as any)
    .find({})
    .sort({ order: 1 })
    .lean();

  const items = gouvernorats.map((g: any) => ({
    slug: g.slug,
    name: pickLocale(g.name, lang),
    order: g.order,
  }));

  return NextResponse.json(items, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
