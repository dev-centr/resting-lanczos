# Proposal: better image downscale for the web platform

**Audience:** browser engineers, CSS WG, and anyone advocating for sharper responsive images without app-specific pipelines.

**Status:** Discussion / advocacy. This repo ships a **content-author workaround** (resting Lanczos + srcset + transform). Platform improvements would reduce the need for that workaround.

## Problem statement

Authors routinely place high-resolution bitmaps into smaller replaced boxes. For **static** display, many engines still use filters that prioritize speed (bilinear-class) over photographic downscale quality (Lanczos / area averaging). CSS offers `image-rendering`, but:

- Values are intentionally **algorithm-agnostic** hints.
- `high-quality` is specified in CSS Images Level 3 / related drafts yet remains **unimplemented**.
- There is no interoperable way to request Lanczos3, mipmapped sampling, or “prefer sharpness for UI screenshots.”

Animating layout size makes quality worse: engines must resample continuously and will not spend a Lanczos kernel per frame. Authors correctly move motion to `transform: scale()`, but **resting** quality still depends on either prebaked tiers or better UA defaults.

## What authors do today (workaround)

The **resting-lanczos** pattern:

1. Offline Lanczos3 tiers sized to CSS width (1× / 2×).
2. `srcset` / `sizes` for candidate selection.
3. `transform: scale()` for decorative zoom.
4. Avoid per-frame high-quality resize.

This works and should remain valid even if browsers improve — preprocessing still wins for bytes and predictability. But defaults that soft-blur UI text punish authors who did not know they needed a pipeline.

## Optional experiments that are *not* the ask

Drawing `<img>` into WebGL with `LINEAR_MIPMAP_LINEAR` can help some photos but often **softens fine text** in screenshots. It should not become the implied “correct” author path, and platform features should not assume mipmaps-on-canvas are required for crisp cards.

## Concrete asks

### 1. Implement `image-rendering: high-quality` (or equivalent)

When the image is **not** under continuous layout animation, prefer a higher-quality downscale (Lanczos-family or equivalent area filter) for `<img>`, `background-image`, and similar. Document that UAs may fall back under memory/CPU pressure.

### 2. Clarify “static vs animated” quality

Spec guidance: while an image’s used size is changing every frame via layout, UAs may use cheaper filters; once size is stable for N frames or changes only via transform/compositing, upgrade the backing store with a higher-quality resample **once**. That matches author intent (resting quality, cheap motion).

### 3. Optional explicit algorithms (longer term)

CSS WG issue [w3c/csswg-drafts#6252](https://github.com/w3c/csswg-drafts/issues/6252) discussed named algorithms (`bilinear`, `trilinear`, cubic, etc.). Adding something in the Lanczos / “sinc” family — or a `downscale: high` that is stricter than today’s vague `smooth` — would let authors of screenshot-heavy UIs opt in without WebGL.

### 4. Do not require authors to invent mipmapped `<img>`

If engines build internal mip chains for downscale, great — but expose quality through CSS/HTML, not by forcing every site to ship a canvas drawer. Preserve crispness for high-frequency UI content (text in screenshots).

## Non-goals

- Mandating Lanczos on every animation frame (impractical).
- Replacing `srcset` (still essential for bytes and DPR).
- Making WebGL the standard image element.

## Success metric

A 2000×1500 UI screenshot placed in a 400×300 CSS box, with no custom preprocess, should look **noticeably closer** to an offline Lanczos3 400×300 reference than today’s typical bilinear downscale — especially for body text and 1px rules — without the page running canvas code.

## References

- [CSS Images Module Level 3 — `image-rendering`](https://drafts.csswg.org/css-images-3/#the-image-rendering-property)
- [MDN — `image-rendering`](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering) (`high-quality` noted as unsupported)
- [w3c/csswg-drafts#6252](https://github.com/w3c/csswg-drafts/issues/6252) — specific algorithms for `image-rendering`
- This repository’s [docs/explanation.md](docs/explanation.md)
