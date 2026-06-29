import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// Nominatim (OpenStreetMap) geocoding — free, no API key
// Rate limit: 1 req/sec (not enforced client-side in V1 — low volume).
// If production volume increases, add a queue.
// ---------------------------------------------------------------------------

export interface GeocodeInput {
  address?: string | null;
  ville: string;
  gouvernorat: string;
  country?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 5_000;

export async function geocodeAddress(
  input: GeocodeInput,
): Promise<GeocodeResult | null> {
  const parts = [
    input.address,
    input.ville,
    input.gouvernorat,
    input.country ?? "Tunisia",
  ].filter(Boolean);

  const query = parts.join(", ");
  if (!query.trim()) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": env.NOMINATIM_USER_AGENT,
      },
    });

    if (!res.ok) {
      console.warn(`[geocoding] Nominatim HTTP ${res.status} for "${query}"`);
      return null;
    }

    const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();

    if (!data.length) {
      console.warn(`[geocoding] No results for "${query}"`);
      return null;
    }

    const first = data[0]!;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`[geocoding] Invalid coords for "${query}": lat=${first.lat}, lon=${first.lon}`);
      return null;
    }

    return { lat, lng, displayName: first.display_name };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(`[geocoding] Timeout (${TIMEOUT_MS}ms) for "${query}"`);
    } else {
      console.warn(`[geocoding] Network error for "${query}":`, err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
