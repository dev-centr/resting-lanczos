# Experimental: WebGL2 mipmap drawer

**Not part of the canonical resting-lanczos strategy.**

Canonical path: offline Lanczos tiers + `<img srcset>` + `transform: scale()`.

## Caveat (read first)

Mipmapped sampling (`LINEAR_MIPMAP_LINEAR`) plus even mild sharpen often **softens fine UI text** in product screenshots. In A/B checks on screenshot cards, plain `<img srcset>` of a well-sized Lanczos asset is frequently **crisper**.

Use this module only for photographic content after you compare side-by-side. Prefer omitting it for marketing/UI cards.

## Usage

```js
import { mountMipmapDrawer } from "../experimental/mipmap-drawer.js";

const handle = mountMipmapDrawer({
  wrap: document.querySelector("#wrap"),
  canvas: document.querySelector("canvas"),
  img: document.querySelector("img"), // hidden img with srcset still loads the tier
  sharpen: 0.12, // try 0 if text looks soft
  onFallback: () => {
    /* show the img, hide canvas */
  },
});

// later:
handle.destroy();
```

If WebGL2 is unavailable or upload fails, `onFallback` runs — keep a real `<img>` in the DOM.

## Why it exists

Documented as an optional polish experiment from an earlier homepage iteration. Kept for reference and research, not as the recommended default.
