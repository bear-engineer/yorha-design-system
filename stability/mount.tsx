import { createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach } from "vitest";
import { composeStory, setProjectAnnotations } from "@storybook/react-vite";
import * as previewAnnotations from "../.storybook/preview";
import "../src/styles/storybook.css";

// Storybook project annotations (decorators, globals) apply to composed stories.
setProjectAnnotations([previewAnnotations]);

type StoryModule = Record<string, unknown> & { default: Record<string, unknown> };
const modules = import.meta.glob<StoryModule>(
  ["../registry/yorha/ui/*/*.stories.tsx", "../registry/yorha/layout/*/*.stories.tsx", "../registry/yorha/blocks/*/*.stories.tsx"],
  { eager: true },
);

/** Story module of an item (`checkbox`, `bento`, `settings-form`...); item names are unique across ui, layout and blocks. */
export function storyModule(item: string): StoryModule | undefined {
  return Object.entries(modules).find(([path]) => path.endsWith(`/${item}/${item}.stories.tsx`))?.[1];
}

const mounted: { root: Root; container: HTMLElement }[] = [];
afterEach(() => {
  for (const m of mounted.splice(0)) {
    m.root.unmount();
    m.container.remove();
  }
});

export const frames = (n: number) => new Promise<void>((resolve) => {
  const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
  step(n);
});

/**
 * Resolves when every finite animation/transition in the document has finished (looping ones, e.g. spinners, are ignored).
 * Use instead of `frames(n)`/sleeps: under load a fixed frame count can end mid entry animation (opacity + 4px translate),
 * which moves rects by a fractional pixel. Bounded at 3 s.
 */
export async function animationsFinished(): Promise<void> {
  const end = performance.now() + 3000;
  for (;;) {
    const running = document.getAnimations().filter((a) => {
      const t = a.effect?.getComputedTiming();
      return a.playState !== "finished" && a.playState !== "idle" && t !== undefined && Number.isFinite(t.endTime as number);
    });
    if (!running.length || performance.now() > end) return;
    await Promise.race([Promise.all(running.map((a) => a.finished.catch(() => null))), new Promise((r) => setTimeout(r, Math.max(0, end - performance.now())))]);
    await frames(1);
  }
}

/** Render a story with real (full) motion so transitions actually run. lang=ko like the real docs. */
export async function mountStory(item: string, name: string, options: { stage?: "center" | "top" } = {}): Promise<HTMLElement> {
  const mod = storyModule(item);
  if (!mod) throw new Error(`stories file not found for ${item}`);
  const story = mod[name];
  if (!story) throw new Error(`story ${name} not found in ${item}`);
  const composed = composeStory({ ...(story as object), globals: { theme: "light", motion: "full", density: "comfortable" } } as never, mod.default as never);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  // Storybook `layout: centered` centres the story in the viewport, so any height change of the story
  // (e.g. a second panel mid-swap) moves everything inside it. Mirror that stage here.
  // Expanders (accordion, collapsible) use a top-aligned stage: their story legitimately grows, and centring would move everything.
  const stage = { display: "flex", alignItems: options.stage === "top" ? "flex-start" : "center", justifyContent: "center", minHeight: "600px" };
  root.render(createElement("div", { lang: "ko", style: stage }, createElement(composed as unknown as ComponentType)));
  await frames(2);
  await document.fonts.ready;
  await frames(2);
  await animationsFinished(); // the entry stream must be at rest before any rect is sampled
  return container.firstElementChild as HTMLElement;
}
