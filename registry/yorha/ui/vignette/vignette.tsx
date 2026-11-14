import type { ComponentPropsWithoutRef } from "react";

// RED stub: wrong on purpose (no aria-hidden, no scanline attribute, no edge darkening).
export function Vignette({ scanline: _scanline, ...props }: ComponentPropsWithoutRef<"div"> & { scanline?: boolean }) {
  return <div data-slot="vignette" {...props} />;
}
