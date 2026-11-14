// Fixture route for e2e/transitions.spec.ts: the installed route-transition component in a layout route.
// Importing it here (root.tsx imports it too) must happen before the router is created: see its import-order note.
import { RouteTransition } from "~/components/route-transition";

if (typeof document !== "undefined") {
  const motion = new URLSearchParams(location.search).get("motion");
  if (motion) document.documentElement.dataset.motion = motion;
}

export default function TransitionsLayout() {
  return (
    <main>
      <RouteTransition />
    </main>
  );
}
