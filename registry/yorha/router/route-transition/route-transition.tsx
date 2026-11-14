import { Outlet, useLocation } from "react-router";
import { ViewTransition, useSyncExternalStore } from "react";

export interface RouteTransitionProps {
  /** Forwarded to <Outlet context>. */
  context?: unknown;
}

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** Reads data-motion on <html>; without it, falls back to prefers-reduced-motion. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    mq.removeEventListener("change", onChange);
  };
}

function getSnapshot(): boolean {
  const motion = document.documentElement.getAttribute("data-motion");
  if (motion === "reduced" || motion === "off") return false;
  if (motion === "full") return true;
  return !window.matchMedia(REDUCE_QUERY).matches;
}

/** Server and first client render assume full motion, matching YorhaProvider. */
const getServerSnapshot = () => true;

/**
 * Renders the matched child route inside React <ViewTransition>. Keyed by pathname so each
 * route change is a transition; react-router's RouterProvider navigates inside a React
 * transition, which is what triggers it. This never calls document.startViewTransition.
 * CSS hooks: view-transition-class `yorha-route`, `yorha-route-enter`, `yorha-route-exit`.
 */
export function RouteTransition({ context }: RouteTransitionProps) {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { pathname } = useLocation();
  const outlet = <Outlet context={context} />;
  return (
    <div data-route-transition={enabled ? "on" : "off"} style={{ display: "contents" }}>
      {enabled ? (
        <ViewTransition
          key={pathname}
          default="none"
          enter="yorha-route yorha-route-enter"
          exit="yorha-route yorha-route-exit"
        >
          {outlet}
        </ViewTransition>
      ) : (
        outlet
      )}
    </div>
  );
}
