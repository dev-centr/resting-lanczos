<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]

<div align="center">
  <h1>resting-lanczos</h1>
  <p>Crisp responsive images: offline Lanczos tiers + srcset + transform scale (no live Lanczos).</p>
  <p>
    <a href="https://devcentr.org/resting-lanczos">Live comparison</a>
    ·
    <a href="https://github.com/dev-centr/resting-lanczos/issues">Report Bug</a>
    ·
    <a href="https://github.com/dev-centr/resting-lanczos/issues">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

**Crisp responsive images without fighting the browser every animation frame.**

Prebake **Lanczos3** display tiers → serve them with **`srcset` / `sizes`** → animate with **`transform: scale()`** (layout size stays fixed). That is the whole strategy.

Optional WebGL mipmaps + sharpen live under `experimental/` and are **not recommended** for UI/screenshot cards (they often soften fine text).

### Why this exists

Browsers do **not** Lanczos-resample every CSS animation frame. Animating `width`/`height`, or stuffing a huge bitmap into a small card, typically uses bilinear/GPU filtering → soft or aliased results. There is **no CSS switch for Lanczos3**.

`image-rendering: high-quality` is in the CSS Images draft but **unsupported**. Libraries like [pica](https://github.com/nodeca/pica), [sharp](https://sharp.pixelplumbing.com/), Squoosh / `@jsquash/resize` do excellent **one-shot** Lanczos — they are not a display pipeline for hover zoom. This package documents and ships the **end-to-end resting-size** pattern those tools leave to you.

See [docs/explanation.md](docs/explanation.md) for the full problem statement and anti-patterns.

### Canonical pipeline

| Step | What | Why |
|------|------|-----|
| 1. Offline | Resize masters with **Lanczos3** (Pillow / sharp / ImageMagick) to display tiers (e.g. 400w + 800w) | High-quality sample at rest |
| 2. Markup | `<img srcset sizes>` matching ~1× / 2× CSS width | Browser picks resting candidate |
| 3. Motion | `transform: scale()` on the image or a clipped wrapper | Layout size fixed → one crisp bitmap; subtle hover (~1.03–1.05) is fine |
| 4. Resting resize only | Swap via srcset / `ResizeObserver` when **layout** size changes | Never Lanczos every frame; pica is for discrete resizes |

## Installation

### Generate tiers (Python + Pillow)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install Pillow
python scripts/generate-tiers.py --input path/to/master.png --id mycard --out-dir ./out
# writes mycard-400.webp, mycard-800.webp (4:3 cover crop by default)
```

### Generate tiers (Node + sharp, optional)

```bash
pnpm install
pnpm generate:node -- --input path/to/master.png --id mycard --out-dir ./out
```

## Usage

### Markup + hover

```html
<div class="card overflow-hidden">
  <img
    src="mycard-800.webp"
    srcset="mycard-400.webp 400w, mycard-800.webp 800w"
    sizes="(max-width: 639px) min(22rem, 90vw), 24rem"
    width="800"
    height="600"
    alt="…"
    class="zoom" />
</div>
```

```css
.card { aspect-ratio: 4 / 3; }
.zoom {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  transform-origin: top center;
  transition: transform 0.7s ease-out;
}
.card:hover .zoom { transform: scale(1.03); }
```

### Demo

**Integrated comparison (recommended):** [devcentr.org/resting-lanczos](https://devcentr.org/resting-lanczos) — browser downscale of a 2400w master vs Lanczos `srcset` tiers + transform.

Local static demo:

```bash
pnpm install
pnpm demo
# open http://localhost:5173
```

The local demo uses committed sample tiers + CSS transform hover. No WebGL. Docs note: [docs.devcentr.org … resting-lanczos](https://docs.devcentr.org/home/tools/resting-lanczos.html).

### Package layout

```
scripts/generate-tiers.py   # Lanczos tier CLI (Pillow)
scripts/generate-tiers.mjs  # Optional sharp variant
src/srcset.js               # Tiny helpers for srcset strings / sizes
docs/explanation.md         # Why browsers blur; full strategy
docs/how-to.md              # Practical recipes
PROPOSAL.md                 # What browsers / CSS could do better
experimental/               # WebGL mipmap drawer — opt-in, see caveats
demo/                       # Static HTML: srcset + transform (+ master for naive compare)
```

### Research notes (gaps vs existing tools)

| Tool / feature | What it does | Gap vs this strategy |
|----------------|--------------|----------------------|
| **pica** / **pica-gpu** / **@jsquash/resize** / **quickpix** | High-quality **resize once** (often Lanczos) | Not a resting-display recipe; too heavy per animation frame |
| **sharp** / **ImageMagick** / **Pillow** | Offline Lanczos | Asset generation only — no srcset + transform guidance |
| **srcset / sizes** (platform) | Pick a candidate by layout width | Does not fix animating layout size or downscaling a huge master |
| **`image-rendering`** | Hint: `auto` / `smooth` / `pixelated` | No Lanczos; `high-quality` unsupported |
| **CSS `transform: scale()`** | Cheap GPU composite | Soft if the resting bitmap is already wrong; great if tiers are right |
| **WebGL mipmaps on `<img>`** | Not a browser feature | Experimental path here; often **worse for screenshot text** than plain `<img>` |

**Conclusion:** Pieces exist; the **composed** resting-Lanczos + srcset + transform pipeline is not a standard library. That is what this repo publishes.

### Experimental WebGL

See [`experimental/README.md`](experimental/README.md). Mipmapped sampling + light sharpen can look smoother on photos but often **blurs fine UI text** in product screenshots. Prefer plain `<img srcset>` of well-sized Lanczos assets for cards.

### Related

Strategy first shipped in production on [amdphreak.github.io](https://github.com/AMDphreak/amdphreak.github.io) product showcase cards. Home org: [dev-centr](https://github.com/dev-centr).

## License

[MIT](LICENSE)

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Contact

DevCentr.org - support@devcentr.org

Project Link: https://github.com/dev-centr/resting-lanczos

Site: https://devcentr.org/resting-lanczos

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/dev-centr/resting-lanczos.svg?style=for-the-badge
[contributors-url]: https://github.com/dev-centr/resting-lanczos/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/dev-centr/resting-lanczos.svg?style=for-the-badge
[forks-url]: https://github.com/dev-centr/resting-lanczos/network/members
[stars-shield]: https://img.shields.io/github/stars/dev-centr/resting-lanczos.svg?style=for-the-badge
[stars-url]: https://github.com/dev-centr/resting-lanczos/stargazers
[issues-shield]: https://img.shields.io/github/issues/dev-centr/resting-lanczos.svg?style=for-the-badge
[issues-url]: https://github.com/dev-centr/resting-lanczos/issues
[license-shield]: https://img.shields.io/github/license/dev-centr/resting-lanczos.svg?style=for-the-badge
[license-url]: https://github.com/dev-centr/resting-lanczos/blob/main/LICENSE
