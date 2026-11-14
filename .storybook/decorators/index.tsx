import { useEffect, useState, type ComponentType, type ReactElement } from "react";
import type { Decorator } from "@storybook/react-vite";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router";

/** Toolbar values; keep in sync with tokens/yorha.resolver.json modifiers. */
export const THEMES = ["light", "dark", "authentic", "high-contrast"] as const;
export const MOTIONS = ["full", "reduced", "off"] as const;
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

/** Writes the toolbar globals on <html>. Stories that own <html> set `parameters.yorha.manageRoot = false`. */
function RootAttributes({ theme, motion, density, children }: { theme: string; motion: string; density: string; children: ReactElement }) {
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", theme);
    el.setAttribute("data-motion", motion);
    el.setAttribute("data-density", density);
  }, [theme, motion, density]);
  return children;
}

export const withGlobals: Decorator = (Story, context) => {
  const manage = (context.parameters.yorha as { manageRoot?: boolean } | undefined)?.manageRoot !== false;
  if (!manage) return <Story />;
  const { theme = "light", motion = "full", density = "comfortable" } = context.globals as Record<string, string>;
  return (
    <RootAttributes theme={theme} motion={motion} density={density}>
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
