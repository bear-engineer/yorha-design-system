import { createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach } from "vitest";
import { composeStory, setProjectAnnotations } from "@storybook/react-vite";
import * as previewAnnotations from "../.storybook/preview";
import "../src/styles/storybook.css";

// Storybook project annotations (decorators, globals, a11y params) apply to composed stories.
setProjectAnnotations([previewAnnotations]);

export type Theme = "light" | "dark" | "high-contrast";
export const THEMES: readonly Theme[] = ["light", "dark", "high-contrast"];

type StoryModule = Record<string, unknown> & { default: Record<string, unknown> };
export interface Item {
  id: string;
  dir: string;
  meta: Record<string, unknown>;
  story: Record<string, unknown>;
  storyName: string;
}

/** Every registry item with stories: States, else Default, else the first named export. */
export function collectItems(modules: Record<string, StoryModule>): Item[] {
  return Object.entries(modules)
    // One story file per item: `<dir>/<dir>.stories.tsx` (extra files such as with-router.stories.tsx are skipped).
    .filter(([path]) => path.split("/").at(-1) === `${path.split("/").at(-2)}.stories.tsx`)
    .map(([path, mod]) => {
      const names = Object.keys(mod).filter((key) => key !== "default");
      const storyName = ["States", "Default"].find((n) => names.includes(n)) ?? names[0];
      if (!storyName) throw new Error(`no named story export in ${path}`);
      const parts = path.split("/");
      const dir = parts.at(-2) ?? path;
      const group = parts.at(-3) ?? "x";
      return { id: `${group}-${dir}`, dir, meta: mod.default, story: mod[storyName] as Record<string, unknown>, storyName };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Freeze motion and caret blink so screenshots are deterministic (data-motion=off is set via the motion global).
const FREEZE_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;}`;

let mounted: { root: Root; container: HTMLElement; style: HTMLStyleElement } | undefined;

export function unmount() {
  if (!mounted) return;
  mounted.root.unmount();
  mounted.container.remove();
  mounted.style.remove();
  mounted = undefined;
}

afterEach(unmount);

export const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(n);
  });

export async function renderStory(
  meta: Record<string, unknown>,
  story: Record<string, unknown>,
  theme: Theme,
  containerStyle?: Partial<CSSStyleDeclaration>,
) {
  const composed = composeStory({ ...story, globals: { theme, motion: "off", density: "comfortable" } }, meta as never);
  const Component = composed as unknown as ComponentType;

  const style = document.createElement("style");
  style.textContent = FREEZE_CSS;
  document.head.append(style);

  const container = document.createElement("div");
  container.dataset.vrt = "root";
  Object.assign(container.style, containerStyle);
  document.body.append(container);

  const root = createRoot(container);
  root.render(createElement(Component));
  mounted = { root, container, style };

  await frames(2);
  // Stories that mount their own YorhaProvider re-resolve motion (reduced-motion context); pin motion and theme.
  document.documentElement.setAttribute("data-motion", "off");
  document.documentElement.setAttribute("data-theme", theme);
  await frames(2);
  await document.fonts.ready;
  return container;
}
