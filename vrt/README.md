# Visual regression (VRT)

`pnpm test:vrt` renders, at a fixed 1280×800 viewport with deviceScaleFactor 1,
`data-motion="off"` and frozen animations/transitions, and compares to PNGs in `vrt/__screenshots__/`:

- `item-stories`: every registry item with stories (86 of 89; `lib/utils`, `base/base`, `base/init` have none),
  using the `States` story, else `Default`, else the first export, in light, dark and high-contrast
  (blocks included).
- `overlays`: 13 overlays rendered open, one per test (dialog, alert-dialog, popover, tooltip, menu, select,
  combobox, autocomplete, drawer, context-menu, preview-card, navigation-menu, toast), light theme, 1280×800 stage.
- `bento`: dashboard/feature/profile presets at 360/768/1280 (from the Bento `Presets` story).

## Baselines

- Baselines are generated on this machine (macOS, Chromium via local Playwright).
  File names carry the platform suffix (`-chromium-darwin.png`).
- CI does not use these files. CI regenerates in the pinned Playwright container, so
  Linux baselines are produced there, not committed from macOS.
- Add or update a baseline: `pnpm test:vrt -- --update` (review the PNG diff before committing).

## CI (pinned container)

```sh
docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.1-noble \
  sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm test:vrt -- --update"
```

The image tag must match the `playwright` version pinned in `package.json` (1.65.1).

## Scope

- Not covered: other stories per item, the authentic theme, overlays in dark/high-contrast.
- Update baselines: `pnpm vitest run --project vrt --update`.
