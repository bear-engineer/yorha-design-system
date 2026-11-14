import type { ComponentPropsWithoutRef } from "react";

// RED stub: wrong on purpose (not aria-hidden, no pointer-events none, no grid).
export function GridBackground(props: ComponentPropsWithoutRef<"div">) {
  return <div data-slot="grid-background" {...props} />;
}
