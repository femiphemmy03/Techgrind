/** Accepts a full YouTube URL or a bare video ID and returns the 11-char video ID, or null. */
export function extractYoutubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

export const youtubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}`;
export const youtubeThumbnailUrl = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
