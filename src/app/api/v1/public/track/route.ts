import { NextRequest, NextResponse } from "next/server";
import { TrackEventSchema } from "@/schemas/track.schema";
import { recordTrackEvent } from "@/services/track.service";
import { createRateLimit } from "@/lib/rate-limit";

/** Track events: 60 requests per minute per IP */
const trackIpLimit = createRateLimit(60_000, 60);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { allowed } = trackIpLimit.check(ip);
    if (!allowed) return new NextResponse(null, { status: 204 });

    // Parse + validate body (strict — extra fields rejected)
    const body: unknown = await req.json().catch(() => null);
    if (!body) return new NextResponse(null, { status: 422 });

    const parsed = TrackEventSchema.safeParse(body);
    if (!parsed.success) return new NextResponse(null, { status: 422 });

    // User-Agent for bot detection
    const userAgent = req.headers.get("user-agent");

    // Fire and forget — errors caught inside
    await recordTrackEvent(parsed.data, userAgent);

    return new NextResponse(null, { status: 204 });
  } catch {
    // Tracking never breaks public UX
    return new NextResponse(null, { status: 204 });
  }
}
