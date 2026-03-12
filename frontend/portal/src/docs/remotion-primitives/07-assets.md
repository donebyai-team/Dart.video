# 07 — Asset System

→ This spec covers the asset manifest, loader, asset packs, and contributor guide for adding assets.
→ For how assets are used in components: see 03-component-library.md
→ For animation types that reference assets: see 04-animation-types-and-prompt.md

---

## Overview

The asset system provides versioned, typed, manifest-driven access to icons, characters, shapes, and backgrounds. Assets are local — no network calls at render time. All assets live under `/public/assets` in the consuming project and are referenced via a manifest.

The system has two parts:
- `animation-assets` package — manifest types, `useAsset` loader hook, preloader
- Asset packs — the actual SVG/JSON/WebP files and their manifest entries

---

## Asset Kinds

```
icon        — SVG glyphs, 24px grid, outline and solid variants
character   — SVG personas with pose and emotion variants, Lottie for micro-motions
shape       — SVG decorative elements (blobs, ribbons, grids, bursts)
background  — SVG or WebP backgrounds (gradients, patterns, textures)
audio       — WAV or MP3 (future)
```

---

## Manifest Schema

Defined in `animation-assets/src/manifest.ts`. A built copy is placed at `/public/assets/manifest.json` in the consuming project.

### AssetMeta

```
id: string                    — unique, stable, versioned (e.g. "icon-shield-v1")
kind: AssetKind
version: string               — semver
tags: string[]
description?: string
license:
  name: 'CC0' | 'CC-BY' | 'MIT' | 'Proprietary'
  url?: string
  attribution?: string
author?: string
ai?:                          — present only for AI-generated assets
  prompt?: string
  negativePrompt?: string
  seed?: number
  model?: string
  post?: string               — e.g. "vectorized; SVGO; normalized strokes"
variants: Variant[]
```

### Variant

```
id: string                    — e.g. "outline-24", "solid-24", "idle-front"
format: 'svg' | 'json' | 'webp' | 'png' | 'wav' | 'mp3'
width?: number
height?: number
path: string                  — relative to /public/assets/
themable?: boolean            — true if asset uses currentColor and responds to CSS color
```

### AssetManifest

```
pack: string                  — pack name and version (e.g. "icons@v1")
updatedAt: string             — ISO date
assets: AssetMeta[]
```

---

## useAsset Hook

```
useAsset(assetId, variantId?, options?) → { meta, variant, url }
```

- Resolves asset by id from the manifest
- Resolves variant by id (or first variant if not specified)
- Returns the full URL relative to `options.baseUrl` (defaults to `/assets`)
- Fails safely — returns null meta and empty url if asset not found, logs warning

### Preloader

A companion utility that accepts a list of asset IDs and preloads image URLs before render. Call in the root composition to avoid late-loading artifacts.

---

## Asset Pack Structure

Assets live in the consuming project's `/public/assets/` directory, copied in by the setup process.

```
/public/assets/
  manifest.json
  icons/v1/
    outline/
      shield.svg
      lock.svg
      key.svg
      eye.svg
      bug.svg
      server.svg
      chart.svg
      dollar.svg
      clock.svg
      users.svg
      briefcase.svg
      play.svg
      pause.svg
      mic.svg
      music.svg
      waveform.svg
      check.svg
      xmark.svg
      info.svg
      alert.svg
      gear.svg
      cloud.svg
    solid/
      (same files, filled variant)
  characters/v1/
    mentor/
      idle-neutral.svg
      idle-happy.svg
      idle-concerned.svg
      pointing-neutral.svg
      pointing-happy.svg
      pointing-concerned.svg
      thinking-neutral.svg
      thinking-happy.svg
      thinking-concerned.svg
      typing-neutral.svg
      typing-happy.svg
      typing-concerned.svg
    analyst/
      (same 12 poses)
    engineer/
      (same 12 poses)
    lottie/
      mentor-idle-blink.json
      analyst-idle-blink.json
      engineer-idle-blink.json
  shapes/v1/
    blob-organic.svg
    blob-rounded.svg
    ribbon-top.svg
    ribbon-bottom.svg
    callout-left.svg
    grid-dots.svg
    grid-lines.svg
    burst-rays.svg
    underline-swash.svg
    badge-pill.svg
  backgrounds/v1/
    gradients/
      gradient-mesh-blue.svg
      gradient-radial-dark.svg
    patterns/
      pattern-dots.svg
      pattern-grid.svg
    textures/
      texture-noise.webp
      texture-paper.webp
```

**Total v1 asset count: 76 assets** (22 outline icons + 22 solid icons + 36 character SVGs + 3 Lottie + 10 shapes + 3 background SVGs + 2 background WebP + 3 gradient/pattern SVGs... verify against manifest on build)

---

## Asset Quality Rules

### Icons
- 24px grid, 1.5px stroke at 24px size
- `currentColor` for all fills and strokes — themable by default
- Pixel-aligned to 0.5px grid
- SVGO-optimized (run in CI)

### Characters
- Separate SVG layers for eyes, mouth, hands — enables targeted animation
- Token-friendly colors: use CSS custom properties referencing brand tokens where applicable
- Lottie files for idle blink only — keep file size minimal

### Shapes and Backgrounds
- SVG preferred over bitmap
- WebP only where SVG is not viable (complex textures)
- WebP assets provided at 1080px width; consuming project scales via CSS

### AI-generated assets
- Include full `ai` metadata block in manifest entry
- Document the style bible (stroke widths, corner radii, palette, icon geometry) in the contributor guide
- Post-processing steps (vectorization, SVGO, stroke normalization) documented in `ai.post`

---

## Asset Versioning

Assets are versioned at the pack level (`icons@v1`, `characters@v1`). Individual assets within a pack are not updated in place — a new version creates new asset IDs (`icon-shield-v2`). Old IDs remain valid. Consumers opt into new versions explicitly.

This means the manifest accumulates asset IDs over time. Old animations referencing `icon-shield-v1` continue to resolve correctly when `icons@v2` is added.

---

## Using Assets in the LLM Context

Assets are not part of the LLM's component vocabulary by default. The LLM is given asset IDs to reference when the animation type includes asset usage.

When assets are available in the prompt:

```
ASSETS (use via useAsset hook):
  icon-shield-v1    variants: outline-24, solid-24
  icon-chart-v1     variants: outline-24, solid-24
  char-mentor-v1    variants: idle-neutral, pointing-happy, thinking-neutral
  bg-gradient-mesh-v1  variants: default
```

The LLM calls `useAsset('icon-shield-v1', 'outline-24')` and uses the returned `url` in an `<img>` tag. It never hardcodes asset paths.

Asset IDs available in the prompt are filtered by animation type — the `data` type includes chart icons and no character assets, the `social` type may include character assets, etc.

---

## Future Asset Packs (post-v1)

- `audio@v1` — ambient backgrounds, notification sounds, transition whooshes
- `icons@v2` — expanded glyph set (60+ icons)
- `characters@v2` — additional personas, more poses
- `illustrations@v1` — full scene illustrations (isometric office, abstract data)
- `lottie@v1` — standalone micro-animations (loading spinners, checkmarks, alerts)

---

## Contributor Guide — Adding an Asset

1. Prepare the asset file following the quality rules for its kind
2. Run SVGO on SVG files before committing
3. Add an `AssetMeta` entry to the appropriate pack manifest
4. Include all required fields — id, kind, version, tags, license, variants
5. For AI-generated assets: include the full `ai` block with prompt, model, seed, and post-processing steps
6. Verify the `useAsset` hook resolves the new asset correctly
7. Add to the relevant animation type's asset list if it should be available to the LLM

## Contributor Guide — Adding an Asset Pack

1. Create the directory structure under `/public/assets/{kind}/v{n}/`
2. Create a new manifest file for the pack
3. Merge into the root `manifest.json`
4. Document the pack in the asset gallery
5. Version bump the `animation-assets` package