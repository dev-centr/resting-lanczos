# Explanation: why resting Lanczos beats live resampling

This is the **Explanation** doc ([Diátaxis](https://diataxis.fr/)). For steps, see [how-to.md](how-to.md).

## The problem

You have a high-resolution screenshot (or photo) and a small card on the page. You want it sharp at rest and a slight hover zoom. Two failure modes show up constantly:

1. **Severe downscale of a huge bitmap** into a small CSS box. The browser’s live filter is typically bilinear / GPU-friendly interpolation, not Lanczos3. Fine text and UI chrome go soft or ring.
2. **Animating layout size** (`width` / `height` / flex growth) every frame. Engines optimize for throughput, not photographic resampling quality. There is **no CSS property that selects Lanczos3**.

Draft CSS `image-rendering: high-quality` was meant as a preference for better static scaling; as of 2026 it is **not implemented** in major browsers. Spec language still leaves algorithms UA-dependent so engines can degrade under load ([css-images-3](https://drafts.csswg.org/css-images-3/#the-image-rendering-property), [w3c/csswg-drafts#6252](https://github.com/w3c/csswg-drafts/issues/6252)).

So: **you cannot rely on the browser to “just use Lanczos” while the user hovers.**

## What works: quality at rest, motion on the GPU composite

Treat quality as a **resting** property of the bitmap, and motion as a **cheap transform**:

1. **Offline Lanczos3** — Bake assets at the sizes you actually display (and 2× for retina). Pillow `Image.Resampling.LANCZOS`, sharp’s lanczos kernels, or ImageMagick `-filter Lanczos`. Always resize from the full-resolution crop; never cascade tier→tier through a lossy save.
2. **`srcset` + `sizes`** — Tell the browser which resting candidate matches the CSS width. Example: 400w ≈ 1× card, 800w ≈ 2×. The browser picks once for the current layout (and again when layout width meaningfully changes).
3. **`transform: scale()` for animation** — Keep the layout box fixed (often inside `overflow: hidden`). Hover scales ~1.03–1.05. GPU bilinear on an **already good** resting sample is acceptable for subtle zoom; you are not re-decimating a 4K master every frame.
4. **Recompute only on resting size change** — If the card’s CSS width changes (breakpoint, container query, orientation), let srcset / a new sizes evaluation pick another tier. Tools like pica are for **discrete** resizes, not animation frames.

That combination is **resting-lanczos**: Lanczos where it matters (once, offline), platform responsive images for selection, transforms for motion.

## Why not live Lanczos / pica every frame?

High-quality filters are expensive. Running them at 60 fps for a hover effect is impractical on phones and wasteful on desktops. Custom “zoom-hooked” pica pipelines also fight the browser’s own srcset selection and caching. Use pica/sharp/`@jsquash/resize` when you **generate** tiers or when a **single** user-driven crop/export happens — not under `requestAnimationFrame` for decoration.

## Why not WebGL mipmaps as the default?

An earlier experiment drew the selected `<img>` into a WebGL2 texture with `LINEAR_MIPMAP_LINEAR`, anisotropy, and a light contrast-gated sharpen (CAS-inspired). That can look smooth on continuous-tone photos.

For **product screenshots and UI text**, mipmap minification + even mild sharpen often **softens glyphs and hairlines**. In practice, a plain `<img>` showing a well-matched Lanczos WebP frequently looks **crisper** on screenshot cards.

Therefore this project treats WebGL mipmaps as an **optional experiment** (`experimental/`), not the canonical path. Prefer preprocess + srcset + transform.

## Anti-patterns

| Anti-pattern | Why it fails |
|--------------|--------------|
| Serve one 3000px PNG into a 360px card and hope | Live downscale ≠ Lanczos |
| Animate `width`/`height` for “zoom” | Forces continuous resample; soft |
| Expect `image-rendering` to mean Lanczos | Spec is a hint; no Lanczos keyword; `high-quality` unsupported |
| Live Lanczos / pica every hover frame | Too heavy; fragile vs srcset |
| Default to mipmapped canvas for UI screenshots | Often blurrier text than `<img srcset>` |
| Cascade resize 800→400 from a prior WebP | Extra generation loss; always Lanczos from the master crop |

## Mental model

```
Master (full res)
    │  offline Lanczos3 (+ crop if needed)
    ▼
Tiers (400w, 800w, …)  ──srcset/sizes──►  <img> at fixed layout size
                                              │
                                              │  transform: scale() on hover
                                              ▼
                                         GPU composite (subtle)
```

Quality is decided **before** paint. Animation only moves pixels that were already sharp enough.

## What browsers could still improve

See [PROPOSAL.md](../PROPOSAL.md): better default downscale for static replaced content, optional algorithm hints, or first-class mipmapped/`high-quality` behavior that does not punish UI text. Until then, **preprocess + srcset + transform** is the repeatable fix.
