# How-to: resting Lanczos display pipeline

Practical recipes. Background: [explanation.md](explanation.md).

## 1. Choose resting tiers

Measure the **CSS width** of the image box at common breakpoints (not the full viewport unless the image is full-bleed).

Typical product card (~22–24rem ≈ 352–384px):

| Tier | Width | Role |
|------|-------|------|
| 1× | 400 | Default / 1× DPR-ish |
| 2× | 800 | Retina / high DPR |

Add more widths if the same asset appears at many layout sizes. Prefer **width descriptors** (`400w`) plus accurate `sizes` over a single density descriptor when the layout width varies.

Match **aspect ratio** to the CSS box (`aspect-ratio` / fixed height) so you are not fighting `object-fit` surprises. This repo’s CLI defaults to **4:3 cover crop from the top** (screenshot-friendly).

## 2. Generate tiers with Lanczos3

### Python (Pillow) — default reference

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Unix
pip install Pillow

python scripts/generate-tiers.py \
  --input masters/app.png \
  --id app \
  --out-dir public/products \
  --tiers 400,800 \
  --aspect 4:3 \
  --crop-gravity top
```

Rules the script follows:

- Convert to RGB, crop to aspect, **then** resize each tier from that crop with `Image.Resampling.LANCZOS`.
- Never resize 800→400 from a previous save; always from the crop.
- Write WebP (quality configurable).

### Node (sharp) — optional

```bash
pnpm install
pnpm generate:node -- --input masters/app.png --id app --out-dir public/products
```

Requires optional dependency `sharp`. Same tier naming: `{id}-{width}.webp`.

### ImageMagick one-liner (manual)

```bash
magick master.png -filter Lanczos -resize 400x300^ -gravity North -extent 400x300 app-400.webp
```

Prefer the scripted path so all tiers share one crop geometry.

## 3. Wire `srcset` and `sizes`

```html
<img
  src="/products/app-800.webp"
  srcset="/products/app-400.webp 400w, /products/app-800.webp 800w"
  sizes="(max-width: 639px) min(22rem, 90vw), (max-width: 1023px) min(22rem, 45vw), 24rem"
  width="800"
  height="600"
  alt="Screenshot of App"
  loading="lazy"
  decoding="async"
/>
```

Tips:

- `sizes` must reflect the **rendered** width, including padding/gaps in grid or flex rows.
- Keep `width` / `height` attributes equal to the largest tier (or the intrinsic aspect) to reduce CLS.
- Helpers: `import { buildSrcset, defaultCardSizes } from 'resting-lanczos'`.

## 4. Animate with `transform`, not layout

```css
.frame {
  overflow: hidden;
  aspect-ratio: 4 / 3;
}
.frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  transform-origin: top center;
  transition: transform 700ms ease-out;
  will-change: transform; /* optional; drop if unused */
}
.card:hover .frame img {
  transform: scale(1.03);
}
```

Keep scale subtle (**≈1.03–1.05**). Larger zoom without a higher-res tier will show the limits of bilinear magnification — still usually better than animating width.

## 5. Respond to resting layout changes only

When the card’s used width changes (resize, container query, orientation):

- Trust the browser’s srcset reselection when `sizes` stays accurate, or
- Use `ResizeObserver` on the frame to swap `src` / rebuild `srcset` if you use art-direction outside normal srcset.

Do **not** run Lanczos inside the observer at animation frame rate. At most, debounce a discrete resize when the resting CSS width crosses a tier boundary.

## 6. When to skip experimental WebGL

Use plain `<img>` (this how-to) for:

- Product / marketing screenshots
- Any image where **legible UI text** matters
- Low-complexity pages (no extra GPU context)

Only consider [`../experimental/`](../experimental/) for photographic content after A/B checking text sharpness. Default assumption: **mipmaps make screenshot text worse.**

## 7. Checklist

- [ ] Master cropped once; each tier Lanczos from that crop
- [ ] Tier widths ≈ 1× and 2× CSS box
- [ ] `sizes` matches real layout widths
- [ ] Hover uses `transform: scale()`, box clipped if needed
- [ ] No per-frame high-quality resize
- [ ] No mipmap canvas unless experimentally justified
