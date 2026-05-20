// ---------------------------------------------------------------------------
// Video URL parsers — extract videoId per platform
// ---------------------------------------------------------------------------

export type VideoPlatform = "youtube" | "vimeo" | "dailymotion";

const PATTERNS: Record<VideoPlatform, RegExp[]> = {
  youtube: [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ],
  vimeo: [
    /vimeo\.com\/(\d+)/,
  ],
  dailymotion: [
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    /dai\.ly\/([a-zA-Z0-9]+)/,
  ],
};

/**
 * Extract video ID from a URL for a given platform.
 * Returns null if the URL doesn't match any known pattern.
 */
export function extractVideoId(platform: VideoPlatform, url: string): string | null {
  for (const pattern of PATTERNS[platform]) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Validate that a URL matches the expected platform.
 */
export function isValidVideoUrl(platform: VideoPlatform, url: string): boolean {
  return extractVideoId(platform, url) !== null;
}

/**
 * Build a canonical video URL from platform + videoId.
 */
export function buildVideoUrl(platform: VideoPlatform, videoId: string): string {
  switch (platform) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${videoId}`;
    case "vimeo":
      return `https://vimeo.com/${videoId}`;
    case "dailymotion":
      return `https://www.dailymotion.com/video/${videoId}`;
  }
}

/**
 * Build a thumbnail URL from platform + videoId (fallback when oEmbed fails).
 */
export function buildFallbackThumbnail(platform: VideoPlatform, videoId: string): string | null {
  switch (platform) {
    case "youtube":
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    case "vimeo":
      return null; // Vimeo thumbnails require API call
    case "dailymotion":
      return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
  }
}
