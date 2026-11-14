# YoRHa consumer templates

Unofficial fan project. Copy one of these into the root of your React Router (or any Tailwind v4) app as `components.json`.

| File | Install path |
| --- | --- |
| `components.json` | Static registry: `@yorha` namespace resolves to the published `/r/{name}.json` files |
| `components.github.json` | GitHub source registry: no `registries` entry, items are addressed by GitHub reference |

## Required: placeholder `style`

Keep `"style": "yorha"`. shadcn's schema requires a `style` string even though this registry ships its own CSS, so `yorha` is only a placeholder, not a shadcn style name. Leaving it out or empty makes the CLI fail.

## Path 1: static URL (`components.json`)

```sh
cp templates/components.json components.json
npx shadcn@4.23.0 add @yorha/init @yorha/button
```

The `registries.@yorha` URL must point at the deployed `public/r` mirror (`pnpm registry:build` output). Names after `@yorha/` are item names, for example `@yorha/base`, `@yorha/utils`, `@yorha/dialog`.

## Path 2: GitHub source registry (`components.github.json`)

```sh
cp templates/components.github.json components.json
npx shadcn@4.23.0 add <owner>/<repo>/init#<ref>
```

`owner/repo/item#ref` is passed straight to `add`, so a `registries` entry is optional. `#ref` is a branch, tag or commit; omit it for the default branch. Dependencies inside the registry are written as `@yorha/...`, which only resolves when the `@yorha` namespace is configured: with this path, add the `registries` block from `components.json` as well if an item's dependencies fail to resolve.

## Bare names

A bare name such as `button` resolves to shadcn's own registry, not this one. Always write `@yorha/<item>` (or the GitHub form). `pnpm registry:lint` rejects bare `registryDependencies` for this reason.

## After install

Add `@yorha/init` first and follow its docs: delete the template's unlayered `html, body` background rules in `app/app.css`, and set `data-theme` on `<html>`.
