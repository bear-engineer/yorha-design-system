import { useEffect, useState } from "react";

/**
 * Docs pages render stories as child iframes (`docs.story.inline: false`) whose URLs carry no `globals`, and the
 * docs document itself only gets `data-theme` from inline stories. The docs page therefore publishes the live
 * toolbar globals (same-origin `window[KEY]` + postMessage); child story iframes read them from their parent.
 * Standalone story views, vitest, stability and vrt runs have no docs parent and keep using their own globals.
 */
export interface ToolbarGlobals {
  theme: string;
  motion: string;
  density: string;
}

export const DOCS_GLOBALS_KEY = "__YORHA_DOCS_GLOBALS__";
const MESSAGE = "yorha:globals";
const REQUEST = "yorha:globals?";
const DEFAULTS: ToolbarGlobals = { theme: "light", motion: "system", density: "comfortable" };

let urlConsumed = false;

type Holder = Window & { [DOCS_GLOBALS_KEY]?: ToolbarGlobals };

function pick(raw: Record<string, unknown> | undefined): ToolbarGlobals {
  const g = raw ?? {};
  return {
    theme: typeof g.theme === "string" ? g.theme : DEFAULTS.theme,
    motion: typeof g.motion === "string" ? g.motion : DEFAULTS.motion,
    density: typeof g.density === "string" ? g.density : DEFAULTS.density,
  };
}

/** The docs page (parent of a story iframe), only when same-origin and actually a docs preview. */
function docsParent(): Holder | null {
  try {
    if (window.parent === window) return null;
    const parent = window.parent as Holder;
    return parent[DOCS_GLOBALS_KEY] ? parent : null;
  } catch {
    return null;
  }
}

/** Globals a story iframe embedded in a docs page must follow; null outside docs embedding. */
export function embeddedDocsGlobals(): ToolbarGlobals | null {
  return docsParent()?.[DOCS_GLOBALS_KEY] ?? null;
}

/** Story-iframe side: the docs page's globals (live), or `own` when not embedded in docs. */
export function useEmbeddedGlobals(own: ToolbarGlobals): { globals: ToolbarGlobals; embedded: boolean } {
  const [docs, setDocs] = useState<ToolbarGlobals | null>(embeddedDocsGlobals);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.type !== MESSAGE) return;
      setDocs(pick(event.data.globals));
    };
    window.addEventListener("message", onMessage);
    // Ask again in case the parent published after this iframe's first read.
    try {
      if (window.parent !== window) window.parent.postMessage({ type: REQUEST }, "*");
    } catch { /* detached */ }
    setDocs(embeddedDocsGlobals());
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return { globals: docs ?? own, embedded: docs !== null };
}

export function applyToRoot(el: HTMLElement, { theme, motion, density }: ToolbarGlobals): void {
  el.setAttribute("data-theme", theme);
  if (motion === "system") el.removeAttribute("data-motion");
  else el.setAttribute("data-motion", motion);
  el.setAttribute("data-density", density);
}

interface PreviewStore {
  storyStoreValue?: { userGlobals?: { get?: () => Record<string, unknown> } };
}

/**
 * Docs-page side: tracks the toolbar globals (preview store + GLOBALS_UPDATED), publishes them to child story
 * iframes, and writes them on the docs `<html>` (so docs chrome can theme itself and stack-only docs pages work).
 */
export function useDocsGlobals(channel: { on(event: string, fn: () => void): void; off(event: string, fn: never): void } | null): ToolbarGlobals {
  const [globals, setGlobals] = useState<ToolbarGlobals>(() => {
    const store = (window as unknown as { __STORYBOOK_PREVIEW__?: PreviewStore }).__STORYBOOK_PREVIEW__;
    // The `globals=theme:dark;motion:full` URL param is applied to the store only after the first docs render.
    const fromUrl: Record<string, string> = {};
    for (const part of (new URLSearchParams(window.location.search).get("globals") ?? "").split(";")) {
      const [key, value] = part.split(":");
      if (key && value) fromUrl[key] = value;
    }
    // Only the very first render of this document: a remount after a toolbar change must trust the store, not the URL.
    const g = pick({ ...store?.storyStoreValue?.userGlobals?.get?.(), ...(urlConsumed ? {} : fromUrl) });
    urlConsumed = true;
    (window as Holder)[DOCS_GLOBALS_KEY] = g; // before the story iframes mount and look
    return g;
  });

  useEffect(() => {
    if (!channel) return;
    // Story iframes embedded in this page post their own GLOBALS_UPDATED (their URL carries none, so: defaults) to this
    // channel; the payload is not trustworthy. Re-read this preview's own store, which only the manager updates.
    const onUpdate = () => {
      const store = (window as unknown as { __STORYBOOK_PREVIEW__?: PreviewStore }).__STORYBOOK_PREVIEW__;
      const own = store?.storyStoreValue?.userGlobals?.get?.();
      if (own) setGlobals(pick(own));
    };
    channel.on("globalsUpdated", onUpdate);
    return () => channel.off("globalsUpdated", onUpdate as never);
  }, [channel]);

  useEffect(() => {
    (window as Holder)[DOCS_GLOBALS_KEY] = globals;
    applyToRoot(document.documentElement, globals);
    document.documentElement.setAttribute("data-docs-theme", globals.theme); // docs chrome; stories that own data-theme cannot move it
    const broadcast = () => {
      for (const frame of document.querySelectorAll("iframe")) {
        frame.contentWindow?.postMessage({ type: MESSAGE, globals }, "*");
      }
    };
    const onRequest = (event: MessageEvent) => {
      if (event.data?.type === REQUEST) (event.source as Window | null)?.postMessage({ type: MESSAGE, globals }, "*");
    };
    window.addEventListener("message", onRequest);
    broadcast();
    return () => window.removeEventListener("message", onRequest);
  }, [globals]);

  return globals;
}
