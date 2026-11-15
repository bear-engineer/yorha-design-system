import { useEffect, useState, type ComponentType, type ReactElement } from "react";
import type { Decorator } from "@storybook/react-vite";
import { applyToRoot, useEmbeddedGlobals } from "../docs-globals";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";

/** Toolbar values; keep in sync with tokens/yorha.resolver.json modifiers. */
export const THEMES = ["light", "dark", "authentic", "high-contrast"] as const;
/** `system` sets no data-motion: the OS reduced-motion preference decides. */
export const MOTIONS = ["system", "full", "reduced", "off"] as const;
export const DENSITIES = ["comfortable", "compact"] as const;

/**
 * Story parameter `route`, read by `withRouter`.
 * - `path`: route pattern the story renders at (default "/").
 * - `initialEntries`: memory history (default [path]).
 * - `routes`: full route table; the story is NOT auto-mounted, use `<Outlet/>` or elements you build.
 */
export interface StoryRouteParameter {
  path?: string;
  initialEntries?: string[];
  routes?: RouteObject[];
}

/**
 * Writes the toolbar globals on <html>. Stories that own <html> set `parameters.yorha.manageRoot = false`: outside
 * docs they keep full control, but embedded in a docs page (child iframe) they still receive the page's globals on
 * <html>, so their own sections inherit the theme the toolbar selected. Embedded stories follow the docs page's
 * globals (live), because the iframe URL carries none.
 */
function RootAttributes({ own, manage, children }: { own: { theme: string; motion: string; density: string }; manage: boolean; children: ReactElement }) {
  const { globals, embedded } = useEmbeddedGlobals(own);
  const { theme, motion, density } = globals;
  useEffect(() => {
    if (!manage && !embedded) return;
    applyToRoot(document.documentElement, { theme, motion, density });
  }, [manage, embedded, theme, motion, density]);
  return children;
}

export const withGlobals: Decorator = (Story, context) => {
  const manage = (context.parameters.yorha as { manageRoot?: boolean } | undefined)?.manageRoot !== false;
  const { theme = "light", motion = "system", density = "comfortable" } = context.globals as Record<string, string>;
  return (
    <RootAttributes own={{ theme, motion, density }} manage={manage}>
      <Story />
    </RootAttributes>
  );
};

function RouterHost({ Story, route }: { Story: ComponentType; route: StoryRouteParameter }) {
  const [router] = useState(() => {
    const path = route.path ?? "/";
    // A catch-all keeps in-story navigation (clicking demo nav links) inside the story instead of
    // React Router's 404 boundary; NavLink active state follows the clicked URL.
    const base = route.routes ?? [{ path, element: <Story /> }];
    const routes = base.some((r) => r.path === "*") ? base : [...base, { path: "*", element: <Story /> }];
    return createMemoryRouter(routes, { initialEntries: route.initialEntries ?? [path] });
  });
  useEffect(() => () => router.dispose(), [router]);
  return <RouterProvider router={router} />;
}

/** Opt in per story/meta: `decorators: [withRouter]`, configure with `parameters.route`. */
export const withRouter: Decorator = (Story, context) => {
  const route = (context.parameters.route ?? {}) as StoryRouteParameter;
  return <RouterHost key={context.id} Story={Story as ComponentType} route={route} />;
};

export const decorators: Decorator[] = [withGlobals];
