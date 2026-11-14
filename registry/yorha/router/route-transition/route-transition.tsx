import { Outlet, useLocation, useNavigationType } from "react-router";
import {
  ViewTransition,
  addTransitionType,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type RouteDirection = "forward" | "back" | "replace";
/** on = full motion, reduced = 120ms crossfade, off = none, unsupported = no document.startViewTransition. */
export type RouteTransitionMode = "on" | "reduced" | "off" | "unsupported";

export interface RouteTransitionState {
  direction: RouteDirection;
  mode: RouteTransitionMode;
}

export interface RouteTransitionProps {
  /** Forwarded to <Outlet context>. */
  context?: unknown;
}

/** Direction of a navigation. POP compares history indexes; without both, POP is "back". */
export function resolveRouteDirection(input: {
  navigationType: "PUSH" | "POP" | "REPLACE";
  idx: number | null;
  prevIdx: number | null;
}): RouteDirection {
  if (input.navigationType === "PUSH") return "forward";
  if (input.navigationType === "REPLACE") return "replace";
  if (input.idx === null || input.prevIdx === null) return "back";
  if (input.idx < input.prevIdx) return "back";
  if (input.idx > input.prevIdx) return "forward";
  return "replace";
}

/** Direction between two segments (tabs, segmented control) by their order. */
export function segmentDirection(order: readonly string[], from: string, to: string): RouteDirection {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0 || a === b) return "replace";
  return b > a ? "forward" : "back";
}

/** Feature detection only: document.startViewTransition is never called from here. */
export function supportsViewTransition(doc: unknown = typeof document === "undefined" ? undefined : document): boolean {
  return typeof (doc as { startViewTransition?: unknown } | undefined)?.startViewTransition === "function";
}

export function resolveTransitionMode(input: {
  motion: string | null;
  prefersReduced: boolean;
  supported: boolean;
}): RouteTransitionMode {
  const level =
    input.motion === "full" || input.motion === "reduced" || input.motion === "off"
      ? input.motion
      : input.prefersReduced
        ? "reduced"
        : "full";
  if (level === "off") return "off";
  if (!input.supported) return "unsupported";
  return level === "reduced" ? "reduced" : "on";
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

function getSnapshot(): RouteTransitionMode {
  return resolveTransitionMode({
    motion: document.documentElement.getAttribute("data-motion"),
    prefersReduced: window.matchMedia(REDUCE_QUERY).matches,
    supported: supportsViewTransition(),
  });
}

/** Server and first client render assume full motion, matching YorhaProvider. */
const getServerSnapshot = (): RouteTransitionMode => "on";

function useTransitionMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function readHistoryIndex(): number | null {
  if (typeof window === "undefined") return null;
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : null;
}

/**
 * React renders a transition that starts inside a popstate event (browser back/forward)
 * synchronously and skips its view transition. React only does that for the first
 * transition scheduled in a given popstate event, so we schedule a cheap one first. The
 * router's own update then runs as a normal transition and its ViewTransition animates.
 * The listener is registered when this module loads (listeners run in registration order,
 * and the router registers its own when it is created), so import this file before you
 * create the router. This relies on React 19.3 behaviour and is verified by
 * e2e/transitions.spec.ts; if React changes, back falls back to no animation.
 */
let bumpPopstate: (() => void) | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const bump = bumpPopstate;
    if (bump) startTransition(bump);
  });
}

function usePopstateTransitions(enabled: boolean) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const run = () => bump((n) => n + 1);
    bumpPopstate = run;
    return () => {
      if (bumpPopstate === run) bumpPopstate = null;
    };
  }, [enabled]);
}

const RouteTransitionContext = createContext<RouteTransitionState>({ direction: "replace", mode: "off" });

/**
 * Direction and mode of the current route transition. Call it from a route element rendered
 * under <RouteTransition>; outside one it returns { direction: "replace", mode: "off" }.
 */
export function useRouteTransition(): RouteTransitionState {
  return useContext(RouteTransitionContext);
}

/**
 * Renders the matched child route inside React <ViewTransition>. Keyed by pathname so each
 * route change is a transition; react-router's RouterProvider navigates inside a React
 * transition, which is what triggers it. This never calls document.startViewTransition.
 *
 * Direction comes from useNavigationType + the history index. The entering route gets the
 * view-transition-class `yorha-route-forward | -back | -replace`; React cannot see the
 * navigation to add a transition type, so the leaving route reads the same direction from
 * `data-route-direction` on <html> (set in a layout effect, before the animation starts).
 * Other classes: `yorha-route`, `yorha-route-enter`, `yorha-route-exit`.
 */
export function RouteTransition({ context }: RouteTransitionProps) {
  const mode = useTransitionMode();
  const location = useLocation();
  const navigationType = useNavigationType();
  const track = useRef<{ key: string; idx: number | null; direction: RouteDirection }>({
    key: location.key,
    idx: readHistoryIndex(),
    direction: "replace",
  });
  if (track.current.key !== location.key) {
    const idx = readHistoryIndex();
    track.current = {
      key: location.key,
      idx,
      direction: resolveRouteDirection({ navigationType, idx, prevIdx: track.current.idx }),
    };
  }
  const direction = track.current.direction;
  usePopstateTransitions(mode === "on" || mode === "reduced");

  useLayoutEffect(() => {
    if (mode === "on" || mode === "reduced") document.documentElement.dataset.routeDirection = direction;
  }, [mode, direction, location.key]);

  const state = useMemo(() => ({ direction, mode }), [direction, mode]);
  const outlet = <Outlet context={context} />;
  const animated = mode === "on" || mode === "reduced";
  return (
    <RouteTransitionContext value={state}>
      <div data-route-transition={mode} data-direction={direction} style={{ display: "contents" }}>
        {animated ? (
          <ViewTransition
            key={location.pathname}
            default="none"
            enter={`yorha-route yorha-route-enter yorha-route-${direction}`}
            exit="yorha-route yorha-route-exit"
          >
            {outlet}
          </ViewTransition>
        ) : (
          outlet
        )}
      </div>
    </RouteTransitionContext>
  );
}

const sharedNames = new Map<string, number>();

export interface SharedElementProps {
  /** view-transition-name pairing this element with the same name on the next route. Unique per route. */
  name: string;
  children: ReactNode;
}

/**
 * Wraps one element so it morphs between routes (list card -> detail heading). `name` is
 * handed to React's <ViewTransition name>; React applies view-transition-name only while a
 * transition runs. Warns in development when two are mounted with the same name.
 */
export function SharedElement({ name, children }: SharedElementProps) {
  const mode = useTransitionMode();
  useEffect(() => {
    const count = (sharedNames.get(name) ?? 0) + 1;
    sharedNames.set(name, count);
    if (process.env.NODE_ENV !== "production" && count > 1) {
      console.warn(`[yorha] SharedElement name "${name}" is mounted ${count} times; names must be unique on a page.`);
    }
    return () => {
      const left = (sharedNames.get(name) ?? 1) - 1;
      if (left <= 0) sharedNames.delete(name);
      else sharedNames.set(name, left);
    };
  }, [name]);
  if (mode !== "on" && mode !== "reduced") return <>{children}</>;
  return (
    <ViewTransition name={name} default="none" share="yorha-shared">
      {children}
    </ViewTransition>
  );
}

/** Transition type added to a segment change; read by SegmentTransition. */
export const segmentTypes = {
  forward: "yorha-segment-forward",
  back: "yorha-segment-back",
  replace: "yorha-segment-replace",
} as const;

/**
 * Applies a tab/segment change as a React transition tagged with its direction. Pass the
 * ordered values and your state setter: `changeSegment(order, value, next, () => setValue(next))`.
 */
export function changeSegment(order: readonly string[], from: string, to: string, apply: () => void) {
  const direction = segmentDirection(order, from, to);
  startTransition(() => {
    addTransitionType(segmentTypes[direction]);
    apply();
  });
}

export interface SegmentTransitionProps {
  /** Current segment value; the panel animates when it changes inside changeSegment(). */
  value: string;
  children: ReactNode;
}

/** Slides the panel of the selected tab/segment in the direction of travel. */
export function SegmentTransition({ value, children }: SegmentTransitionProps) {
  const mode = useTransitionMode();
  if (mode !== "on" && mode !== "reduced") return <>{children}</>;
  return (
    <ViewTransition
      key={value}
      default="none"
      enter={{
        [segmentTypes.forward]: "yorha-segment yorha-segment-enter yorha-segment-forward",
        [segmentTypes.back]: "yorha-segment yorha-segment-enter yorha-segment-back",
        default: "none",
      }}
      exit={{
        [segmentTypes.forward]: "yorha-segment yorha-segment-exit yorha-segment-forward",
        [segmentTypes.back]: "yorha-segment yorha-segment-exit yorha-segment-back",
        default: "none",
      }}
    >
      {children}
    </ViewTransition>
  );
}
