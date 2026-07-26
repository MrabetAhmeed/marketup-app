import { buildFallbackThumbnail } from "./parsers";
import type { VideoPlatform } from "./parsers";

// ---------------------------------------------------------------------------
// oEmbed metadata fetch — thumbnail only, never throws
// ---------------------------------------------------------------------------

const OEMBED_URLS: Record<VideoPlatform, (url: string) => string> = {
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  vimeo: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  dailymotion: (url) => `https://www.dailymotion.com/services/oembed?url=${encodeURIComponent(url)}&format=json`,
};

const TIMEOUT_MS = 5000;

export interface VideoMetadata {
  thumbnailUrl: string | null;
}

/**
 * Fetch video metadata via oEmbed API.
 * Returns { thumbnailUrl } on success, { thumbnailUrl: null } on any failure.
 * NEVER throws — video creation must not fail due to oEmbed issues.
 */
export async function fetchVideoMetadata(
  platform: VideoPlatform,
  videoUrl: string,
  videoId: string,
): Promise<VideoMetadata> {
  try {
    const oembedUrl = OEMBED_URLS[platform](videoUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { thumbnailUrl: buildFallbackThumbnail(platform, videoId) };
    }

    const data = await res.json() as Record<string, unknown>;
    const thumbnailUrl = typeof data.thumbnail_url === "string" ? data.thumbnail_url : null;
    return { thumbnailUrl: thumbnailUrl ?? buildFallbackThumbnail(platform, videoId) };
  } catch (err) {
    console.warn("[oEmbed] Fetch failed (non-blocking):", platform, videoUrl, err);
    return { thumbnailUrl: buildFallbackThumbnail(platform, videoId) };
  }
}
