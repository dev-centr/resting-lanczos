/**
 * Tiny helpers for resting-lanczos markup.
 * Zero runtime dependencies.
 */

/**
 * Build a srcset string from width→URL map or list of { url, width }.
 * @param {Record<number, string> | Array<{ url: string, width: number }>} entries
 * @returns {string}
 */
export function buildSrcset(entries) {
  if (Array.isArray(entries)) {
    return entries.map(({ url, width }) => `${url} ${width}w`).join(", ");
  }
  return Object.entries(entries)
    .map(([w, url]) => `${url} ${w}w`)
    .join(", ");
}

/**
 * Convention used by generate-tiers: `{basePath}/{id}-{width}.webp`.
 * @param {string} id
 * @param {number[]} widths
 * @param {{ dir?: string, ext?: string }} [opts]
 */
export function tierSrcset(id, widths = [400, 800], opts = {}) {
  const dir = (opts.dir ?? "").replace(/\/?$/, opts.dir ? "/" : "");
  const ext = opts.ext ?? "webp";
  return buildSrcset(
    widths.map((width) => ({
      url: `${dir}${id}-${width}.${ext}`,
      width,
    })),
  );
}

/**
 * Example `sizes` for ~22–24rem product cards in a responsive grid.
 * Tune to your layout; wrong sizes ⇒ wrong tier.
 */
export const defaultCardSizes =
  "(max-width: 639px) min(22rem, 90vw), (max-width: 1023px) min(22rem, 45vw), (max-width: 1279px) min(22rem, 30vw), 24rem";

/**
 * Suggested CSS for transform-based hover (string for docs / injectors).
 * Keep scale subtle; quality comes from Lanczos tiers, not magnification.
 */
export const transformHoverCss = `
.rl-frame {
  overflow: hidden;
  aspect-ratio: 4 / 3;
}
.rl-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  transform-origin: top center;
  transition: transform 0.7s ease-out;
}
.rl-card:hover .rl-frame img {
  transform: scale(1.03);
}
`.trim();
