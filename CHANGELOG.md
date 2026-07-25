# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project uses [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-07-25

### Changed

- Repository transferred to [`dev-centr/resting-lanczos`](https://github.com/dev-centr/resting-lanczos).
- README points at the integrated comparison demo on [devcentr.org/resting-lanczos](https://devcentr.org/resting-lanczos).
- Sample demo assets refreshed with a high-detail chart plus `master-2400.webp` for naive browser-downscale comparisons.

## [0.1.0] - 2026-07-25

### Added

- Initial public package documenting the **canonical** pipeline: offline Lanczos3 tiers + `srcset`/`sizes` + `transform: scale()` motion (no per-frame resample).
- Explanation + How-to docs, browser-standards `PROPOSAL.md`, Python Pillow CLI and optional Node/sharp CLI, tiny `srcset` helpers, static demo (srcset + transform only).
- WebGL2 mipmap drawer parked under `experimental/` with an explicit warning: mipmaps/sharpen often soften screenshot UI text; not the default.
- Strategy generalized from [amdphreak.github.io](https://github.com/AMDphreak/amdphreak.github.io) product showcase cards.
