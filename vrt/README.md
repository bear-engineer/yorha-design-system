# Visual regression (VRT)

`pnpm test:vrt` renders the representative story of every `ui/` and `layout/` item
(first named export of each `*.stories.tsx`) in light and dark themes, at a fixed
1280×800 viewport with deviceScaleFactor 1, `data-motion="off"`, and frozen
animations/transitions. Each render is compared to a PNG in `vrt/__screenshots__/`.

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

- Covered: one representative story per item, light and dark. Overlays that portal
  out of the container (Dialog, Menu, Toast) are not captured by the element locator.
- Not covered: the other stories of each item and the high-contrast/authentic themes.
